## 1. Setup and Dependencies

- [x] 1.1 Add `better-sqlite3` dependency to package.json
- [x] 1.2 Create `src/adapters/` directory structure

## 2. Database Adapter Interface

- [x] 2.1 Create `src/adapters/base.js` with abstract `DatabaseAdapter` class defining the interface
- [x] 2.2 Define interface methods: `connect()`, `getSchema()`, `query()`, `insert()`, `delete()`, `close()`, `quoteIdentifier()`

## 3. MySQL Adapter Implementation

- [x] 3.1 Create `src/adapters/mysql.js` implementing `DatabaseAdapter` for MySQL
- [x] 3.2 Move MySQL-specific quoting (backticks) from `sql-utils.js` to MySQL adapter
- [x] 3.3 Move `INFORMATION_SCHEMA` queries from `tool-handlers.js` to MySQL adapter
- [x] 3.4 Implement MySQL `connect()` returning database metadata

## 4. SQLite Adapter Implementation

- [x] 4.1 Create `src/adapters/sqlite.js` implementing `DatabaseAdapter` for SQLite
- [x] 4.2 Implement SQLite `connect()` with file path and version info
- [x] 4.3 Implement SQLite `getSchema()` using `PRAGMA table_info()`
- [x] 4.4 Implement SQLite `quoteIdentifier()` using double quotes
- [x] 4.5 Implement SQLite `query()`, `insert()`, `delete()` methods
- [x] 4.6 Handle SSH config warning when in SQLite mode

## 5. Configuration Updates

- [x] 5.1 Add `--mode` parameter parsing to `config.js` (values: `mysql`, `sqlite`)
- [x] 5.2 Add `--db-path` / `SQLITE_DB_PATH` configuration for SQLite
- [x] 5.3 Validate mode-specific config (MySQL needs host/user/db, SQLite needs db-path)
- [x] 5.4 Make MySQL config optional when mode is SQLite

## 6. Server and Handler Updates

- [x] 6.1 Update `mcp-server.js` to instantiate correct adapter based on mode
- [x] 6.2 Update `tools.js` to rename tools from `mysql_*` to `db_*`
- [x] 6.3 Refactor `tool-handlers.js` to use adapter interface instead of direct pool access
- [x] 6.4 Update shutdown logic to call `adapter.close()` instead of `pool.end()`
- [x] 6.5 Update `constants.js` server metadata to reflect multi-database support

## 7. Documentation and Cleanup

- [x] 7.1 Update README.md with SQLite usage examples
- [x] 7.2 Document migration from `mysql_*` to `db_*` tool names
- [x] 7.3 Update `.env.example` with SQLite configuration options
- [x] 7.4 Remove or repurpose `sql-utils.js` (move remaining utilities to adapters)
