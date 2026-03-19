## 1. Package.json 配置更新

- [x] 1.1 更新 package.json 包名为 `@kk-2004/sql-mcp-server`
- [x] 1.2 移除 `private: true` 配置
- [x] 1.3 添加 `bin` 字段，配置 `sql-mcp-server` 命令指向 `server.js`
- [x] 1.4 添加 `files` 字段，指定发布包含的文件列表

## 2. 入口文件修改

- [x] 2.1 在 `server.js` 文件头部添加 shebang `#!/usr/bin/env node`

## 3. README 文档更新

- [x] 3.1 添加 npx 快速使用说明
- [x] 3.2 添加 Claude Desktop 配置文件位置说明（macOS/Windows）
- [x] 3.3 添加 SQLite 模式的 Claude Code 配置示例
- [x] 3.4 添加 MySQL 模式的 Claude Code 配置示例
- [x] 3.5 添加全局安装的替代方案说明

## 4. 发布准备

- [x] 4.1 添加 LICENSE 文件（如不存在）
- [x] 4.2 验证 npm 包内容（使用 `npm pack --dry-run`）
- [ ] 4.3 发布到 npm（`npm publish --access public`）
