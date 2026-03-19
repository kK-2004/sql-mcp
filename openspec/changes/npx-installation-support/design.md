## Context

当前 SQL MCP 服务是一个本地项目，通过 `node server.js` 运行。用户需要克隆仓库、安装依赖后才能使用。为了支持 `npx` 安装和 Claude Code 集成，需要将项目发布为 npm 公开包。

**当前状态**:
- `package.json` 设置 `private: true`
- 包名为 `mysql-mcp-local`
- 无 `bin` 字段配置
- 入口文件无 shebang

**约束**:
- 必须保持 stdio 传输协议的兼容性
- 必须支持 MySQL 和 SQLite 两种模式
- 需要保持向后兼容的命令行参数

## Goals / Non-Goals

**Goals:**
- 支持通过 `npx @kk-2004/sql-mcp-server` 直接运行
- 提供清晰的 Claude Code 配置示例
- 确保 npm 包体积最小化（只包含必要文件）
- 保持现有功能完全兼容

**Non-Goals:**
- 不改变现有的 MCP 工具接口
- 不添加新的数据库适配器
- 不修改配置参数格式

## Decisions

### 1. 包名

**决定**: 使用 `@kk-2004/sql-mcp-server` 作为包名

### 2. 入口文件策略

**决定**: 修改现有 `server.js` 添加 shebang，并在 `bin` 中注册

**理由**:
- 现有文件已经是正确的入口点
- 添加 shebang 是最小改动
- 避免创建额外的包装脚本

### 3. 发布文件控制

**决定**: 使用 `files` 字段而非 `.npmignore`

**理由**:
- `files` 是白名单模式，更安全
- 明确指定包含的文件更清晰
- 避免 accidentally 发布敏感文件

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| better-sqlite3 有 native 依赖 | 确保 package.json 声明依赖，npm install 时自动编译 |
| 用户可能使用旧方式运行 | README 保留原有的 `node server.js` 说明 |
