export const SUPPORTED_METHODS = new Set(["connect", "schema", "query", "insert", "delete"]);

export const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const SERVER_META = {
  name: "sql-mcp",
  version: "0.2.0"
};
