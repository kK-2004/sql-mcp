## ADDED Requirements

### Requirement: Claude Code configuration documentation
The README SHALL provide complete Claude Code configuration examples.

#### Scenario: SQLite configuration example
- **WHEN** user reads README
- **THEN** SHALL find configuration example for SQLite mode in Claude Desktop config file

#### Scenario: MySQL configuration example
- **WHEN** user reads README
- **THEN** SHALL find configuration example for MySQL mode in Claude Desktop config file

#### Scenario: Environment variables documentation
- **WHEN** user reads README
- **THEN** SHALL find explanation of all required and optional environment variables

### Requirement: Config file location guidance
The documentation SHALL specify Claude Desktop configuration file locations for different platforms.

#### Scenario: macOS config location
- **WHEN** user on macOS reads documentation
- **THEN** SHALL find config path `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Scenario: Windows config location
- **WHEN** user on Windows reads documentation
- **THEN** SHALL find config path `%APPDATA%\Claude\claude_desktop_config.json`

### Requirement: NPX usage documentation
The README SHALL document npx usage patterns.

#### Scenario: Basic npx usage
- **WHEN** user wants to run without installation
- **THEN** documentation SHALL show `npx @kk-2004/sql-mcp-server` command

#### Scenario: Global installation alternative
- **WHEN** user prefers global installation
- **THEN** documentation SHALL show `npm install -g @kk-2004/sql-mcp-server` followed by `sql-mcp-server`
