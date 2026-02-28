export function toolDefinitions(config) {
  const tools = [];

  if (config.allowedMethods.has("connect")) {
    tools.push({
      name: "mysql_connect",
      description: "Connect to MySQL and verify credentials/database access.",
      inputSchema: {
        type: "object",
        properties: {}
      }
    });
  }

  if (config.allowedMethods.has("schema")) {
    tools.push({
      name: "mysql_describe_schema",
      description: "Show table schema in current database (allowed tables only).",
      inputSchema: {
        type: "object",
        properties: {
          table: {
            type: "string",
            description: "Optional table name (must be allowed). If omitted, returns all allowed tables."
          }
        }
      }
    });
  }

  if (config.allowedMethods.has("query")) {
    tools.push({
      name: "mysql_query",
      description: "Query rows from an allowed table.",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Target table name (must be allowed)." },
          columns: {
            type: "array",
            items: { type: "string" },
            description: "Columns to select, default ['*']."
          },
          where: {
            type: "object",
            description: "Equality conditions, e.g. {\"id\": 1}"
          },
          orderBy: {
            type: "object",
            properties: {
              column: { type: "string" },
              direction: { type: "string", enum: ["ASC", "DESC"] }
            }
          },
          limit: { type: "number", minimum: 1 }
        },
        required: ["table"]
      }
    });
  }

  if (config.allowedMethods.has("insert")) {
    tools.push({
      name: "mysql_insert",
      description: "Insert one row into an allowed table.",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Target table name (must be allowed)." },
          data: {
            type: "object",
            description: "Row object, e.g. {\"name\": \"Tom\", \"age\": 18}"
          }
        },
        required: ["table", "data"]
      }
    });
  }

  if (config.allowedMethods.has("delete")) {
    tools.push({
      name: "mysql_delete",
      description: "Delete rows from an allowed table (where required by default).",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Target table name (must be allowed)." },
          where: {
            type: "object",
            description: "Equality conditions, e.g. {\"id\": 1}"
          }
        },
        required: ["table"]
      }
    });
  }

  return tools;
}
