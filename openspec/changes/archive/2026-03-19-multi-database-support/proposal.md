## Why

The current MCP server only supports MySQL databases. Users who work with SQLite databases (e.g., local development, embedded applications, file-based data) cannot use this tool. By implementing a strategy pattern, we can support multiple database types through a unified interface, allowing users to choose their database backend via a `mode` parameter at startup.

## What Changes

- **Strategy Pattern**: Refactor database operations into a `DatabaseAdapter` interface with MySQL and SQLite implementations
- **SQLite3 Support**: Add SQLite3 as a new database backend with `db_path` parameter for local database files
- **Mode Parameter**: Add `--mode` CLI argument to select database type (`mysql` or `sqlite`)
- **Tool Naming**: Rename tools from `mysql_*` to `db_*` to reflect database-agnostic nature

## Capabilities

### New Capabilities

- `database-adapter`: Abstract database adapter interface with strategy pattern, supporting connect, schema, query, insert, delete operations
- `sqlite-adapter`: SQLite3 database adapter implementation with local file support via `db_path` parameter

### Modified Capabilities

None - this is a new architectural layer that wraps existing functionality.

## Impact

- **Affected Files**:
  - `src/config.js` - Add mode parsing and SQLite config options
  - `src/mcp-server.js` - Use adapter pattern instead of direct mysql import
  - `src/tools.js` - Rename tools to `db_*` prefix
  - `src/tool-handlers.js` - Use adapter interface for database operations
  - `src/sql-utils.js` - Move MySQL-specific quoting to adapter
  - `src/constants.js` - Update server metadata
- **New Files**:
  - `src/adapters/base.js` - Abstract adapter interface
  - `src/adapters/mysql.js` - MySQL adapter implementation
  - `src/adapters/sqlite.js` - SQLite adapter implementation
- **Dependencies**: Add `better-sqlite3` package for SQLite support
- **Breaking Change**: Tool names change from `mysql_*` to `db_*`
