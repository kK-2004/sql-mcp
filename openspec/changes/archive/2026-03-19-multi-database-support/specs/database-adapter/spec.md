## ADDED Requirements

### Requirement: Mode selection via CLI parameter
The system SHALL support a `--mode` CLI parameter to select the database backend type.

#### Scenario: MySQL mode selection
- **WHEN** user starts server with `--mode=mysql` or omits the parameter
- **THEN** system SHALL initialize MySQL adapter with existing MySQL configuration

#### Scenario: SQLite mode selection
- **WHEN** user starts server with `--mode=sqlite`
- **THEN** system SHALL initialize SQLite adapter with SQLite configuration

#### Scenario: Invalid mode
- **WHEN** user specifies an unsupported mode
- **THEN** system SHALL throw an error listing supported modes

### Requirement: Database adapter interface
The system SHALL provide a `DatabaseAdapter` interface with the following methods:
- `connect()` - Verify connection and return database metadata
- `getSchema(table?)` - Retrieve schema for specified table or all allowed tables
- `query(table, columns, where, orderBy, limit)` - Execute SELECT query
- `insert(table, data)` - Execute INSERT statement
- `delete(table, where)` - Execute DELETE statement
- `close()` - Release database resources
- `quoteIdentifier(name)` - Quote identifier with database-specific syntax

#### Scenario: Adapter method signatures
- **WHEN** implementing a new database adapter
- **THEN** all interface methods MUST be implemented

### Requirement: Tool naming convention
The system SHALL use database-agnostic tool names with `db_` prefix instead of `mysql_` prefix.

#### Scenario: Renamed tools
- **WHEN** server starts with any mode
- **THEN** tools SHALL be named `db_connect`, `db_describe_schema`, `db_query`, `db_insert`, `db_delete`

#### Scenario: Backward compatibility warning
- **WHEN** documentation is updated
- **THEN** migration guide SHALL explain the tool name change from `mysql_*` to `db_*`
