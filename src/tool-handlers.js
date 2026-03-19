import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { toErrorResult, toTextResult } from "./results.js";
import { toolDefinitions } from "./tools.js";
import { IDENTIFIER_RE } from "./constants.js";

function assertIdentifier(name, label) {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`${label} '${name}' is invalid`);
  }
}

function assertAllowedTable(table, config) {
  assertIdentifier(table, "table");
  if (config.allowedTables.has("*")) return;
  if (!config.allowedTables.has(table)) {
    throw new Error(`table '${table}' is not in ALLOWED_TABLES`);
  }
}

export function registerToolHandlers({ server, adapter, config }) {
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
      if (toolName === "db_connect") {
        if (!config.allowedMethods.has("connect")) throw new Error("connect is not allowed");
        const result = await adapter.connect();
        connectionState.connected = true;
        connectionState.currentDatabase = result.database;
        return toTextResult({
          ...result,
          configSource: "cli_or_env",
          allowedTables: Array.from(config.allowedTables),
          allowedMethods: Array.from(config.allowedMethods)
        });
      }

      if (toolName === "db_describe_schema") {
        if (!config.allowedMethods.has("schema")) throw new Error("schema is not allowed");
        if (!connectionState.connected) {
          throw new Error("Please call db_connect first");
        }

        const table = args.table;
        if (table) assertAllowedTable(table, config);

        const result = await adapter.getSchema(table);
        return toTextResult(result);
      }

      if (toolName === "db_query") {
        if (!config.allowedMethods.has("query")) throw new Error("query is not allowed");

        const table = args.table;
        assertAllowedTable(table, config);

        const limit = Number(args.limit ?? config.defaultLimit);
        const safeLimit = Number.isFinite(limit)
          ? Math.max(1, Math.min(limit, config.maxLimit))
          : config.defaultLimit;

        const result = await adapter.query(table, args.columns, args.where, args.orderBy, safeLimit);
        return toTextResult({ rows: result.rows, rowCount: result.rows?.length ?? 0 });
      }

      if (toolName === "db_insert") {
        if (!config.allowedMethods.has("insert")) throw new Error("insert is not allowed");

        const table = args.table;
        const data = args.data;
        assertAllowedTable(table, config);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("data must be a non-empty object");
        }

        const result = await adapter.insert(table, data);
        return toTextResult(result);
      }

      if (toolName === "db_delete") {
        if (!config.allowedMethods.has("delete")) throw new Error("delete is not allowed");

        const table = args.table;
        assertAllowedTable(table, config);

        const result = await adapter.delete(table, args.where);
        return toTextResult(result);
      }

      throw new Error(`unknown tool: ${toolName}`);
    } catch (error) {
      return toErrorResult(error instanceof Error ? error.message : String(error));
    }
  });
}
