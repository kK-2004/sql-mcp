## ADDED Requirements

### Requirement: NPX direct execution
The system SHALL support direct execution via `npx @kk-2004/sql-mcp-server`.

#### Scenario: NPX execution with environment variables
- **WHEN** user runs `npx @kk-2004/sql-mcp-server` with proper environment variables set
- **THEN** system SHALL start MCP server in stdio mode

#### Scenario: NPX execution with CLI arguments
- **WHEN** user runs `npx @kk-2004/sql-mcp-server --mode=sqlite --db-path=/path/to/db`
- **THEN** system SHALL parse CLI arguments and start server accordingly

### Requirement: Package.json bin configuration
The system SHALL have proper `bin` field in package.json pointing to executable entry.

#### Scenario: Bin field configuration
- **WHEN** package is installed globally or via npx
- **THEN** `sql-mcp-server` command SHALL be available

### Requirement: Entry file shebang
The entry file SHALL contain shebang line for Node.js execution.

#### Scenario: Shebang presence
- **WHEN** entry file is executed
- **THEN** it SHALL use `#!/usr/bin/env node` to ensure Node.js runtime

### Requirement: Files whitelist
The package SHALL use `files` field to control published content.

#### Scenario: Published files
- **WHEN** package is published to npm
- **THEN** only `server.js`, `src/`, `package.json`, `README.md`, `LICENSE` SHALL be included
- **THEN** `node_modules/`, `.env*`, `openspec/`, `.git/` SHALL NOT be included
