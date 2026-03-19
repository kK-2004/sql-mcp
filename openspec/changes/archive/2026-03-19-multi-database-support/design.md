## Context

The current MCP server is tightly coupled to MySQL:
- `mysql2/promise` is imported directly in `mcp-server.js`
- SQL utilities use MySQL-specific backtick quoting
- Schema queries use MySQL's `INFORMATION_SCHEMA`
- Tool names are prefixed with `mysql_*`

We need to abstract these database-specific operations behind a common interface to support multiple database backends.

## Goals / Non-Goals

**Goals:**
- Implement strategy pattern with `DatabaseAdapter` interface
- Support MySQL (existing) and SQLite3 (new) backends
- Allow database selection via `--mode` CLI parameter
- Maintain all existing functionality for MySQL users
- Provide SQLite3 support with `db_path` for local database files

**Non-Goals:**
- Supporting other databases (PostgreSQL, etc.) in this change
- Connection pooling for SQLite (not needed for file-based databases)
- SSH tunnel support for SQLite (not applicable)
- Runtime database switching (mode is determined at startup)

## Decisions

### 1. Adapter Interface Design

**Decision:** Create a `DatabaseAdapter` abstract class with the following methods:
- `connect()` - Verify connection and return metadata
- `getSchema(table?)` - Get table schema information
- `query(table, columns, where, orderBy, limit)` - Select rows
- `insert(table, data)` - Insert a row
- `delete(table, where)` - Delete rows
- `close()` - Cleanup resources
- `quoteIdentifier(name)` - Database-specific identifier quoting

**Rationale:** This interface captures all current operations while allowing database-specific implementations for quoting and schema queries.

**Alternatives considered:**
- Using an ORM (Sequelize, Prisma) - Rejected as overkill for this simple use case
- Direct SQL string abstraction - Rejected as it doesn't handle schema differences

### 2. SQLite Library Choice

**Decision:** Use `better-sqlite3` for SQLite support.

**Rationale:**
- Synchronous API is simpler and performant for MCP's request/response model
- Well-maintained with native bindings for performance
- Widely used in Node.js ecosystem

**Alternatives considered:**
- `sqlite3` - Async API adds complexity without benefit for our use case
- `sql.js` - Pure JavaScript, but slower and more memory-intensive

### 3. Configuration Approach

**Decision:** Add `--mode` parameter with values `mysql` (default) or `sqlite`.

For SQLite, require `--db-path` or `SQLITE_DB_PATH` to specify the database file.

**Rationale:**
- Backwards compatible: existing MySQL users see no change
- Clear separation of config between database types
- CLI args take precedence over environment variables

### 4. Tool Naming

**Decision:** Rename tools from `mysql_*` to `db_*` (e.g., `db_connect`, `db_query`).

**Rationale:**
- Reflects database-agnostic nature
- Cleaner API for users
- **BREAKING CHANGE** but acceptable for early-stage project

**Alternatives considered:**
- Keep `mysql_*` names - Misleading for SQLite users
- Use dynamic names based on mode - Inconsistent API

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking change for existing users | Document migration path clearly in README |
| SQLite schema queries differ from MySQL | Adapter handles `INFORMATION_SCHEMA` vs `sqlite_master` differences |
| SQLite has no `insertId` for tables without ROWID | Return `null` for `insertId` in such cases |
| File permissions for SQLite databases | Clear error message if file is unreadable |
