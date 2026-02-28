import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { toErrorResult, toTextResult } from "./results.js";
import { toolDefinitions } from "./tools.js";
import {
  assertAllowedTable,
  assertIdentifier,
  buildOrderBy,
  buildWhere,
  parseColumns,
  quoteIdentifier
} from "./sql-utils.js";

export function registerToolHandlers({ server, pool, config, tunnel }) {
  const tools = toolDefinitions(config);
  const connectionState = {
    connected: false,
    currentDatabase: ""
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments ?? {};

    try {
      if (toolName === "mysql_connect") {
        if (!config.allowedMethods.has("connect")) throw new Error("connect is not allowed");
        const [rows] = await pool.query("SELECT DATABASE() AS db, VERSION() AS version");
        const row = Array.isArray(rows) && rows.length ? rows[0] : null;
        const currentDb = row?.db ?? null;
        if (!currentDb) {
          throw new Error("No default database selected. Set MYSQL_DATABASE or include DB in MYSQL_URL");
        }
        connectionState.connected = true;
        connectionState.currentDatabase = currentDb;
        return toTextResult({
          connected: true,
          database: currentDb,
          version: row?.version ?? "unknown",
          configSource: "cli_or_env",
          sshTunnel: config.ssh.enabled
            ? {
                enabled: true,
                jumpHost: config.ssh.host,
                jumpPort: config.ssh.port,
                targetHost: config.ssh.dstHost,
                targetPort: config.ssh.dstPort,
                localHost: tunnel?.localHost ?? null,
                localPort: tunnel?.localPort ?? null
              }
            : { enabled: false },
          allowedTables: Array.from(config.allowedTables),
          allowedMethods: Array.from(config.allowedMethods)
        });
      }

      if (toolName === "mysql_describe_schema") {
        if (!config.allowedMethods.has("schema")) throw new Error("schema is not allowed");
        if (!connectionState.connected) {
          throw new Error("Please call mysql_connect first");
        }

        const table = args.table;
        if (table) assertAllowedTable(table, config);

        const db = connectionState.currentDatabase;
        let tables = [];
        if (table) {
          tables = [table];
        } else if (config.allowedTables.has("*")) {
          const [tableRows] = await pool.query(
            `
              SELECT TABLE_NAME AS tableName
              FROM INFORMATION_SCHEMA.TABLES
              WHERE TABLE_SCHEMA = ?
              ORDER BY TABLE_NAME
            `,
            [db]
          );
          tables = Array.isArray(tableRows) ? tableRows.map((row) => row.tableName) : [];
        } else {
          tables = Array.from(config.allowedTables);
        }
        if (!tables.length) {
          return toTextResult({ database: db, tables: {} });
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

        return toTextResult({
          database: db,
          tableCount: Object.keys(schema).length,
          tables: schema
        });
      }

      if (toolName === "mysql_query") {
        if (!config.allowedMethods.has("query")) throw new Error("query is not allowed");

        const table = args.table;
        assertAllowedTable(table, config);

        const selected = parseColumns(args.columns ?? ["*"]);
        const { sql: whereSql, values } = buildWhere(args.where);
        const orderBySql = buildOrderBy(args.orderBy);

        const requestedLimit = Number(args.limit ?? config.defaultLimit);
        const safeLimit = Number.isFinite(requestedLimit)
          ? Math.max(1, Math.min(requestedLimit, config.maxLimit))
          : config.defaultLimit;

        const sql = `SELECT ${selected} FROM ${quoteIdentifier(table)}${whereSql}${orderBySql} LIMIT ?`;
        const [rows] = await pool.query(sql, [...values, safeLimit]);
        return toTextResult({ rows, rowCount: Array.isArray(rows) ? rows.length : 0 });
      }

      if (toolName === "mysql_insert") {
        if (!config.allowedMethods.has("insert")) throw new Error("insert is not allowed");

        const table = args.table;
        const data = args.data;
        assertAllowedTable(table, config);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("data must be a non-empty object");
        }

        const keys = Object.keys(data);
        if (!keys.length) throw new Error("data cannot be empty");
        for (const key of keys) assertIdentifier(key, "column");

        const columnsSql = keys.map((k) => quoteIdentifier(k)).join(", ");
        const placeholders = keys.map(() => "?").join(", ");
        const values = keys.map((k) => data[k]);
        const sql = `INSERT INTO ${quoteIdentifier(table)} (${columnsSql}) VALUES (${placeholders})`;
        const [result] = await pool.execute(sql, values);

        return toTextResult({
          affectedRows: result.affectedRows,
          insertId: result.insertId
        });
      }

      if (toolName === "mysql_delete") {
        if (!config.allowedMethods.has("delete")) throw new Error("delete is not allowed");

        const table = args.table;
        assertAllowedTable(table, config);
        const { sql: whereSql, values } = buildWhere(args.where);

        if (!whereSql && !config.allowEmptyDelete) {
          throw new Error("where is required for delete (set ALLOW_EMPTY_DELETE=true to override)");
        }

        const sql = `DELETE FROM ${quoteIdentifier(table)}${whereSql}`;
        const [result] = await pool.execute(sql, values);
        return toTextResult({ affectedRows: result.affectedRows });
      }

      throw new Error(`unknown tool: ${toolName}`);
    } catch (error) {
      return toErrorResult(error instanceof Error ? error.message : String(error));
    }
  });
}
