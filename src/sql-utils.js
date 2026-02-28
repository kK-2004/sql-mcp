import { IDENTIFIER_RE } from "./constants.js";

export function assertIdentifier(name, label) {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`${label} '${name}' is invalid`);
  }
}

export function quoteIdentifier(name) {
  assertIdentifier(name, "identifier");
  return `\`${name}\``;
}

export function assertAllowedTable(table, config) {
  assertIdentifier(table, "table");
  if (config.allowedTables.has("*")) return;
  if (!config.allowedTables.has(table)) {
    throw new Error(`table '${table}' is not in ALLOWED_TABLES`);
  }
}

export function buildWhere(where) {
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
    clauses.push(`${quoteIdentifier(key)} = ?`);
    values.push(where[key]);
  }
  return { sql: ` WHERE ${clauses.join(" AND ")}`, values };
}

export function buildOrderBy(orderBy) {
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
  return ` ORDER BY ${quoteIdentifier(column)} ${direction}`;
}

export function parseColumns(columns) {
  if (!columns || !columns.length) return "*";
  if (!Array.isArray(columns)) {
    throw new Error("columns must be an array");
  }
  if (columns.length === 1 && columns[0] === "*") return "*";
  return columns
    .map((col) => {
      assertIdentifier(col, "column");
      return quoteIdentifier(col);
    })
    .join(", ");
}
