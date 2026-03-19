## Why

当前的 SQL MCP 服务只能通过克隆代码仓库并运行 `node server.js` 的方式使用，这增加了用户的使用门槛。为了让更多用户能够方便地在 Claude Code 中使用此 MCP 服务，需要将其发布为 npm 包，支持通过 `npx` 直接安装和运行。

## What Changes

- 添加 `bin` 字段到 `package.json`，配置可执行命令入口
- 为入口文件添加 shebang (`#!/usr/bin/env node`)
- 更新包名为符合 npm 命名规范的公开包名
- 移除 `private: true` 配置以允许发布
- 添加 `files` 字段指定发布时包含的文件
- 添加 `prepublishOnly` 脚本确保发布前检查
- 更新 README.md 添加 `npx` 使用方式和 Claude Code 配置示例

## Capabilities

### New Capabilities

- `npx-execution`: 支持通过 `npx <package-name>` 直接运行 MCP 服务
- `claude-code-integration`: 提供完整的 Claude Code 集成配置示例和文档

### Modified Capabilities

无现有能力的需求变更，此次仅添加发布和分发相关的配置。

## Impact

- **package.json**: 添加 `bin`, `files`, 移除 `private`, 更新包名
- **server.js**: 添加 shebang 行
- **README.md**: 添加 npx 使用说明和 Claude Code 配置示例
- **新增 .npmignore 或使用 files 字段**: 控制发布内容
