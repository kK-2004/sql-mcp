## ADDED Requirements

### Requirement: SQLite database path configuration
The system SHALL support SQLite database file path via `--db-path` CLI argument or `SQLITE_DB_PATH` environment variable.

#### Scenario: Valid database path
- **WHEN** user provides a valid file path via `--db-path=/path/to/db.sqlite`
- **THEN** system SHALL connect to the specified SQLite database file

#### Scenario: Database file does not exist
- **WHEN** user provides a path to a non-existent file
- **THEN** system SHALL create the database file (SQLite default behavior)

#### Scenario: Missing database path in SQLite mode
- **WHEN** user starts with `--mode=sqlite` without `--db-path` or `SQLITE_DB_PATH`
- **THEN** system SHALL throw an error requiring database path

### Requirement: SQLite connection behavior
The SQLite adapter SHALL provide connection verification without network operations.

#### Scenario: SQLite connect
- **WHEN** `db_connect` tool is called in SQLite mode
- **THEN** system SHALL return connection status, database path, and SQLite version

### Requirement: SQLite schema queries
The SQLite adapter SHALL query schema from `sqlite_master` table instead of `INFORMATION_SCHEMA`.

#### Scenario: Describe single table schema
- **WHEN** `db_describe_schema` is called with a table name
- **THEN** system SHALL return column information from `PRAGMA table_info()`

#### Scenario: Describe all tables
- **WHEN** `db_describe_schema` is called without table name
- **THEN** system SHALL return schema for all allowed tables

### Requirement: SQLite identifier quoting
The SQLite adapter SHALL use double quotes for identifier quoting.

#### Scenario: Quote identifier
- **WHEN** quoting a table or column name
- **THEN** system SHALL wrap the identifier in double quotes (e.g., `"table_name"`)

### Requirement: SQLite insert return value
The SQLite adapter SHALL return appropriate insert metadata.

#### Scenario: Insert with auto-increment
- **WHEN** inserting into a table with INTEGER PRIMARY KEY
- **THEN** system SHALL return `lastInsertRowid` as `insertId`

#### Scenario: Insert without auto-increment
- **WHEN** inserting into a table without INTEGER PRIMARY KEY
- **THEN** system SHALL return `null` for `insertId`

### Requirement: SQLite does not support SSH tunnel
The system SHALL ignore SSH configuration when in SQLite mode.

#### Scenario: SQLite mode with SSH config
- **WHEN** user provides SSH configuration with `--mode=sqlite`
- **THEN** system SHALL log a warning and skip SSH tunnel creation
