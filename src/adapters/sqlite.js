import Database from "better-sqlite3";
import { DatabaseAdapter } from "./base.js";
import { IDENTIFIER_RE } from "../constants.js";

function assertIdentifier(name, label) {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`${label} '${name}' is invalid`);
  }
}

export class SQLiteAdapter extends DatabaseAdapter {
  #db = null;

  constructor(config) {
    super(config);
    // Warn if SSH config is provided for SQLite
    if (config.ssh?.enabled) {
      console.warn("SSH tunnel configuration is ignored in SQLite mode");
    }
  }

  get type() {
    return "sqlite";
  }

  quoteIdentifier(name) {
    assertIdentifier(name, "identifier");
    return `"${name}"`;
  }

  async #getDb() {
    if (!this.#db) {
      this.#db = new Database(this.config.dbPath);
    }
    return this.#db;
  }

  async connect() {
    const db = await this.#getDb();
    const versionRow = db.prepare("SELECT sqlite_version() AS version").get();
    const version = versionRow?.version ?? "unknown";

    return {
      connected: true,
      database: this.config.dbPath,
      version,
      sshTunnel: { enabled: false }
    };
  }

  async getSchema(table) {
    const db = await this.#getDb();
    let tables = [];

    if (table) {
      tables = [table];
    } else if (this.config.allowedTables.has("*")) {
      const rows = db.prepare(`
        SELECT name AS tableName
        FROM sqlite_master
        WHERE type = 'table'
        ORDER BY name
      `).all();
      tables = rows.map((row) => row.tableName);
    } else {
      tables = Array.from(this.config.allowedTables);
    }

    if (!tables.length) {
      return { database: this.config.dbPath, tables: {} };
    }

    const schema = {};
    for (const tableName of tables) {
      const columns = db.pragma(`table_info(${JSON.stringify(tableName)})`);
      schema[tableName] = columns.map((col) => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0,
        default: col.dflt_value,
        key: col.pk > 0 ? "PRI" : null,
        extra: null
      }));
    }

    return {
      database: this.config.dbPath,
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
    const db = await this.#getDb();
    assertIdentifier(table, "table");

    const selected = this.#parseColumns(columns ?? ["*"]);
    const { sql: whereSql, values } = this.#buildWhere(where);
    const orderBySql = this.#buildOrderBy(orderBy);

    const safeLimit = Number.isFinite(limit) ? Math.max(1, limit) : this.config.defaultLimit;

    const sql = `SELECT ${selected} FROM ${this.quoteIdentifier(table)}${whereSql}${orderBySql} LIMIT ?`;
    const stmt = db.prepare(sql);
    const rows = stmt.all(...values, safeLimit);

    return { rows, rowCount: rows.length };
  }

  async insert(table, data) {
    const db = await this.#getDb();
    assertIdentifier(table, "table");

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
    const stmt = db.prepare(sql);
    const result = stmt.run(...values);

    return {
      affectedRows: result.changes,
      insertId: result.lastInsertRowid ?? null
    };
  }

  async delete(table, where) {
    const db = await this.#getDb();
    assertIdentifier(table, "table");

    const { sql: whereSql, values } = this.#buildWhere(where);

    if (!whereSql && !this.config.allowEmptyDelete) {
      throw new Error("where is required for delete (set ALLOW_EMPTY_DELETE=true to override)");
    }

    const sql = `DELETE FROM ${this.quoteIdentifier(table)}${whereSql}`;
    const stmt = db.prepare(sql);
    const result = stmt.run(...values);

    return { affectedRows: result.changes };
  }

  async close() {
    if (this.#db) {
      this.#db.close();
      this.#db = null;
    }
  }
}
