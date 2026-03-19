import mysql from "mysql2/promise";
import { DatabaseAdapter } from "./base.js";
import { IDENTIFIER_RE } from "../constants.js";

function assertIdentifier(name, label) {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`${label} '${name}' is invalid`);
  }
}

export class MySQLAdapter extends DatabaseAdapter {
  #pool = null;
  #tunnel = null;

  constructor(config, tunnel = null) {
    super(config);
    this.#tunnel = tunnel;
  }

  get type() {
    return "mysql";
  }

  quoteIdentifier(name) {
    assertIdentifier(name, "identifier");
    return `\`${name}\``;
  }

  async #getPool() {
    if (!this.#pool) {
      const poolConfig = {
        host: this.#tunnel?.localHost ?? this.config.host,
        port: this.#tunnel?.localPort ?? this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        connectionLimit: 10
      };
      if (this.config.mysqlUrl) {
        this.#pool = mysql.createPool(this.config.mysqlUrl);
      } else {
        this.#pool = mysql.createPool(poolConfig);
      }
    }
    return this.#pool;
  }

  async connect() {
    const pool = await this.#getPool();
    const [rows] = await pool.query("SELECT DATABASE() AS db, VERSION() AS version");
    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    const currentDb = row?.db ?? null;
    if (!currentDb) {
      throw new Error("No default database selected. Set MYSQL_DATABASE or include DB in MYSQL_URL");
    }

    return {
      connected: true,
      database: currentDb,
      version: row?.version ?? "unknown",
      sshTunnel: this.#tunnel
        ? {
            enabled: true,
            jumpHost: this.config.ssh?.host,
            jumpPort: this.config.ssh?.port,
            targetHost: this.config.ssh?.dstHost,
            targetPort: this.config.ssh?.dstPort,
            localHost: this.#tunnel?.localHost ?? null,
            localPort: this.#tunnel?.localPort ?? null
          }
        : { enabled: false }
    };
  }

  async getSchema(table) {
    const pool = await this.#getPool();
    const db = this.config.database;

    let tables = [];
    if (table) {
      tables = [table];
    } else if (this.config.allowedTables.has("*")) {
      const [tableRows] = await pool.query(
        `SELECT TABLE_NAME AS tableName
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = ?
         ORDER BY TABLE_NAME`,
        [db]
      );
      tables = Array.isArray(tableRows) ? tableRows.map((row) => row.tableName) : [];
    } else {
      tables = Array.from(this.config.allowedTables);
    }

    if (!tables.length) {
      return { database: db, tableCount: 0, tables: {} };
    }

    const inPlaceholders = tables.map(() => "?").join(", ");
    const sql = `
      SELECT
        TABLE_NAME AS tableName,
        COLUMN_NAME AS columnName,
        COLUMN_TYPE AS columnType,
        IS_NULLABLE AS isNullable,
        COLUMN_DEFAULT AS columnDefault,
        COLUMN_KEY AS columnKey,
        EXTRA AS extra,
        ORDINAL_POSITION AS ordinalPosition
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME IN (${inPlaceholders})
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `;
    const [rows] = await pool.query(sql, [db, ...tables]);

    const schema = {};
    for (const tableName of tables) schema[tableName] = [];
    for (const row of rows) {
      const tableName = row.tableName;
      if (!schema[tableName]) schema[tableName] = [];
      schema[tableName].push({
        name: row.columnName,
        type: row.columnType,
        nullable: row.isNullable === "YES",
        default: row.columnDefault,
        key: row.columnKey,
        extra: row.extra
      });
    }

    return {
      database: db,
      tableCount: Object.keys(schema).length,
      tables: schema
    };
  }

  #buildWhere(where) {
    if (!where) return { sql: "", values: [] };
    if (typeof where !== "object" || Array.isArray(where)) {
      throw new Error("where must be an object like { id: 1 }");
    }

    const keys = Object.keys(where);
    if (!keys.length) return { sql: "", values: [] };

    const clauses = [];
    const values = [];
    for (const key of keys) {
      assertIdentifier(key, "column");
      clauses.push(`${this.quoteIdentifier(key)} = ?`);
      values.push(where[key]);
    }
    return { sql: ` WHERE ${clauses.join(" AND ")}`, values };
  }

  #buildOrderBy(orderBy) {
    if (!orderBy) return "";
    if (typeof orderBy !== "object" || Array.isArray(orderBy)) {
      throw new Error("orderBy must be an object like { column: 'id', direction: 'DESC' }");
    }
    const column = orderBy.column;
    const direction = String(orderBy.direction ?? "ASC").toUpperCase();
    if (!column) throw new Error("orderBy.column is required");
    assertIdentifier(column, "orderBy.column");
    if (direction !== "ASC" && direction !== "DESC") {
      throw new Error("orderBy.direction must be ASC or DESC");
    }
    return ` ORDER BY ${this.quoteIdentifier(column)} ${direction}`;
  }

  #parseColumns(columns) {
    if (!columns || !columns.length) return "*";
    if (!Array.isArray(columns)) {
      throw new Error("columns must be an array");
    }
    if (columns.length === 1 && columns[0] === "*") return "*";
    return columns
      .map((col) => {
        assertIdentifier(col, "column");
        return this.quoteIdentifier(col);
      })
      .join(", ");
  }

  async query(table, columns, where, orderBy, limit) {
    const pool = await this.#getPool();
    const selected = this.#parseColumns(columns ?? ["*"]);
    const { sql: whereSql, values } = this.#buildWhere(where);
    const orderBySql = this.#buildOrderBy(orderBy);

    const safeLimit = Number.isFinite(limit) ? Math.max(1, limit) : this.config.defaultLimit;

    const sql = `SELECT ${selected} FROM ${this.quoteIdentifier(table)}${whereSql}${orderBySql} LIMIT ?`;
    const [rows] = await pool.query(sql, [...values, safeLimit]);
    return { rows, rowCount: Array.isArray(rows) ? rows.length : 0 };
  }

  async insert(table, data) {
    const pool = await this.#getPool();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("data must be a non-empty object");
    }

    const keys = Object.keys(data);
    if (!keys.length) throw new Error("data cannot be empty");
    for (const key of keys) assertIdentifier(key, "column");

    const columnsSql = keys.map((k) => this.quoteIdentifier(k)).join(", ");
    const placeholders = keys.map(() => "?").join(", ");
    const values = keys.map((k) => data[k]);
    const sql = `INSERT INTO ${this.quoteIdentifier(table)} (${columnsSql}) VALUES (${placeholders})`;
    const [result] = await pool.execute(sql, values);

    return {
      affectedRows: result.affectedRows,
      insertId: result.insertId
    };
  }

  async delete(table, where) {
    const pool = await this.#getPool();
    const { sql: whereSql, values } = this.#buildWhere(where);

    if (!whereSql && !this.config.allowEmptyDelete) {
      throw new Error("where is required for delete (set ALLOW_EMPTY_DELETE=true to override)");
    }

    const sql = `DELETE FROM ${this.quoteIdentifier(table)}${whereSql}`;
    const [result] = await pool.execute(sql, values);
    return { affectedRows: result.affectedRows };
  }

  async close() {
    if (this.#pool) {
      await this.#pool.end().catch(() => undefined);
      this.#pool = null;
    }
  }
}
