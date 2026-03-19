# SQL MCP Server

> 面向 Claude Desktop / Claude Code 的 MCP 数据库服务，支持 MySQL 和 SQLite，内置表白名单、操作限制和 SSH 隧道。

<p align="center">
  <img alt="npm" src="https://img.shields.io/npm/v/@kk-2004/sql-mcp-server?style=flat-square&color=0ea5e9">
  <img alt="license" src="https://img.shields.io/npm/l/@kk-2004/sql-mcp-server?style=flat-square&color=22c55e">
  <img alt="node" src="https://img.shields.io/node/v/@kk-2004/sql-mcp-server?style=flat-square&color=a855f7">
</p>

---

## 目录

- [亮点](#highlights)
- [工作原理](#workflows)
- [快速开始](#usage)
- [Claude Desktop / Claude Code 集成](#integration)
- [配置参考](#config)
- [支持的工具](#tools)
- [使用示例](#examples)
- [安全注意事项](#security)
- [本地开发](#dev)

---

<a id="highlights"></a>
## ✨ 亮点

- **零安装** — `npx` 即可直接运行，无需全局安装
- **双数据库** — 同时支持 MySQL 和 SQLite
- **SSH 隧道** — 内置 MySQL + SSH 隧道支持，轻松连接远程数据库
- **权限控制** — 支持表白名单与操作白名单，双重防护
- **开箱即用** — 兼容 Claude Desktop 配置格式

---

<a id="workflows"></a>
## 🔍 工作原理

### `ALLOWED_METHODS` 双层校验

`ALLOWED_METHODS` 通过以下机制控制 LLM 可调用的操作：

1. **工具隐藏** — 服务启动时解析白名单，`ListTools` 阶段只向 LLM 暴露被允许的工具
2. **执行拦截** — `CallTool` 执行时再次校验，未授权方法直接返回错误，不执行任何数据库操作

```bash
# 示例：LLM 只能查询，不能写入
ALLOWED_METHODS='connect,schema,query' npx -y @kk-2004/sql-mcp-server \
  --mode=sqlite \
  --db-path=/path/to/database.db \
  --tables='*'
```

### LLM 如何操作数据库？

LLM 本身不会直接连接数据库，而是通过 MCP 工具间接操作：

```
用户提问
  └─▶ LLM 决策（调用哪个工具、传什么参数）
        └─▶ MCP 客户端发起工具调用
              └─▶ 服务端：权限检查 → 参数校验 → 执行 SQL
                    └─▶ 返回 JSON 结果给 LLM
                          └─▶ LLM 生成最终回复
```

服务端返回给 LLM 的格式示例：

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"rowCount\": 2, \"rows\": [...]}"
    }
  ]
}
```

---

<a id="usage"></a>
## 🚀 快速开始

### 方式一：`npx`（推荐）

#### SQLite

```bash
npx -y @kk-2004/sql-mcp-server \
  --mode=sqlite \
  --db-path=/path/to/database.db \
  --tables='*'
```

#### SQLite + 环境变量

```bash
DB_MODE=sqlite \
SQLITE_DB_PATH=/path/to/database.db \
ALLOWED_TABLES='users,orders' \
ALLOWED_METHODS='connect,schema,query' \
DEFAULT_LIMIT=50 \
MAX_LIMIT=500 \
npx -y @kk-2004/sql-mcp-server
```

#### MySQL

```bash
npx -y @kk-2004/sql-mcp-server \
  --mysql-host=127.0.0.1 \
  --mysql-port=3306 \
  --mysql-user=root \
  --mysql-password=password \
  --mysql-database=mydb \
  --tables='*'
```

#### MySQL + 连接串

```bash
npx -y @kk-2004/sql-mcp-server \
  --mysql-url='mysql://root:password@127.0.0.1:3306/mydb' \
  --tables='users,orders' \
  --methods='connect,schema,query,insert'
```

#### MySQL + SSH 隧道（私钥路径）

```bash
npx -y @kk-2004/sql-mcp-server \
  --ssh-enabled=true \
  --ssh-host=jump.example.com \
  --ssh-port=22 \
  --ssh-user=ubuntu \
  --ssh-private-key-path=/Users/you/.ssh/id_rsa \
  --mysql-host=127.0.0.1 \
  --mysql-port=3306 \
  --mysql-user=root \
  --mysql-password=password \
  --mysql-database=mydb \
  --tables='*'
```

#### MySQL + SSH 隧道（私钥内容）

```bash
npx -y @kk-2004/sql-mcp-server \
  --ssh-enabled=true \
  --ssh-host=jump.example.com \
  --ssh-user=ubuntu \
  --ssh-private-key='-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----' \
  --ssh-passphrase='your-passphrase' \
  --mysql-host=127.0.0.1 \
  --mysql-user=root \
  --mysql-password=db-password \
  --mysql-database=mydb \
  --tables='*'
```

### 方式二：本地安装

```bash
# npm
npm install @kk-2004/sql-mcp-server

# pnpm
pnpm add @kk-2004/sql-mcp-server

# yarn
yarn add @kk-2004/sql-mcp-server

# bun
bun add @kk-2004/sql-mcp-server
```

安装后运行：

```bash
# 通过本地二进制
./node_modules/.bin/sql-mcp-server --mode=sqlite --db-path=/path/to/database.db --tables='*'

# 通过 npm exec
npm exec sql-mcp-server -- --mode=sqlite --db-path=/path/to/database.db --tables='*'

# 通过 node
node ./node_modules/@kk-2004/sql-mcp-server/server.js --mode=sqlite --db-path=/path/to/database.db --tables='*'
```

---

<a id="integration"></a>
## 🔌 集成

以下配置可直接放入 Claude Desktop 配置文件。

### SQLite

```json
{
  "mcpServers": {
    "sql-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@kk-2004/sql-mcp-server",
        "--mode=sqlite",
        "--db-path=/path/to/database.db",
        "--tables=*"
      ]
    }
  }
}
```

### MySQL

```json
{
  "mcpServers": {
    "sql-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@kk-2004/sql-mcp-server",
        "--mysql-host=127.0.0.1",
        "--mysql-port=3306",
        "--mysql-user=root",
        "--mysql-password=password",
        "--mysql-database=mydb",
        "--tables=users,orders"
      ]
    }
  }
}
```

### MySQL + SSH 隧道

```json
{
  "mcpServers": {
    "sql-mcp": {
      "command": "npx",
      "args": [
        "-y",
        "@kk-2004/sql-mcp-server",
        "--ssh-enabled=true",
        "--ssh-host=jump.example.com",
        "--ssh-port=22",
        "--ssh-user=ubuntu",
        "--ssh-private-key-path=/Users/you/.ssh/id_rsa",
        "--mysql-host=127.0.0.1",
        "--mysql-port=3306",
        "--mysql-user=root",
        "--mysql-password=password",
        "--mysql-database=mydb",
        "--tables=*"
      ]
    }
  }
}
```

### 使用环境变量（推荐用于敏感信息）

```json
{
  "mcpServers": {
    "sql-mcp": {
      "command": "npx",
      "args": ["-y", "@kk-2004/sql-mcp-server"],
      "env": {
        "DB_MODE": "mysql",
        "MYSQL_HOST": "127.0.0.1",
        "MYSQL_PORT": "3306",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your-password",
        "MYSQL_DATABASE": "mydb",
        "ALLOWED_TABLES": "users,orders",
        "ALLOWED_METHODS": "connect,schema,query,insert,delete",
        "DEFAULT_LIMIT": "100",
        "MAX_LIMIT": "1000",
        "ALLOW_EMPTY_DELETE": "false"
      }
    }
  }
}
```

### 本地安装版配置

#### 方式 A：直接调用本地二进制

```json
{
  "mcpServers": {
    "sql-mcp": {
      "command": "/Users/you/project/node_modules/.bin/sql-mcp-server",
      "args": ["--mode=sqlite", "--db-path=/path/to/database.db", "--tables=*"]
    }
  }
}
```

#### 方式 B：通过 `node` 调用入口文件

```json
{
  "mcpServers": {
    "sql-mcp": {
      "command": "node",
      "args": [
        "/Users/you/project/sql_mcp/server.js",
        "--mode=mysql",
        "--mysql-host=127.0.0.1",
        "--mysql-user=root",
        "--mysql-database=mydb",
        "--tables=users,orders"
      ]
    }
  }
}
```

---

<a id="config"></a>
## ⚙️ 配置参考

> **优先级**：CLI 参数 > 环境变量  
> **提示**：使用 `MYSQL_URL` 时，建议将数据库名写入连接串，如 `mysql://root:password@127.0.0.1:3306/mydb`

### 通用参数

| 参数 | 环境变量 | 命令行参数 | 必填 | 默认值 | 说明 |
|------|----------|------------|------|--------|------|
| 数据库模式 | `DB_MODE` | `--mode` | 否 | `mysql` | 支持 `mysql` 或 `sqlite` |
| 表白名单 | `ALLOWED_TABLES` | `--tables` | **是** | — | 允许访问的表，逗号分隔，`*` 表示全部 |
| 允许方法 | `ALLOWED_METHODS` | `--methods` | 否 | `connect,schema,query,insert,delete` | 允许的操作，逗号分隔 |
| 默认查询限制 | `DEFAULT_LIMIT` | `--default-limit` | 否 | `100` | 默认最大返回行数 |
| 最大查询限制 | `MAX_LIMIT` | `--max-limit` | 否 | `1000` | 返回行数上限 |
| 允许无条件删除 | `ALLOW_EMPTY_DELETE` | `--allow-empty-delete` | 否 | `false` | 是否允许不带 `WHERE` 的删除 |

### MySQL 参数

| 参数 | 环境变量 | 命令行参数 | 必填 | 默认值 | 说明 |
|------|----------|------------|------|--------|------|
| 连接字符串 | `MYSQL_URL` | `--mysql-url` | 否 | — | 完整的 MySQL 连接字符串 |
| 主机 | `MYSQL_HOST` | `--mysql-host` | 否 | `127.0.0.1` | MySQL 服务器地址 |
| 端口 | `MYSQL_PORT` | `--mysql-port` | 否 | `3306` | MySQL 服务器端口 |
| 用户名 | `MYSQL_USER` | `--mysql-user` | 否 | `root` | MySQL 用户名 |
| 密码 | `MYSQL_PASSWORD` | `--mysql-password` | 否 | — | MySQL 密码 |
| 数据库 | `MYSQL_DATABASE` | `--mysql-database` | **是** | — | 数据库名称 |

### SQLite 参数

| 参数 | 环境变量 | 命令行参数 | 必填 | 默认值 | 说明 |
|------|----------|------------|------|--------|------|
| 模式 | `DB_MODE` | `--mode` | 否 | `mysql` | 设为 `sqlite` 启用 SQLite |
| 数据库路径 | `SQLITE_DB_PATH` | `--db-path` | **是**（SQLite 模式）| — | SQLite 数据库文件路径 |

### SSH 隧道参数

| 参数 | 环境变量 | 命令行参数 | 必填 | 默认值 | 说明 |
|------|----------|------------|------|--------|------|
| 启用 SSH | `SSH_ENABLED` | `--ssh-enabled` | 否 | `false` | 是否启用 SSH 隧道 |
| SSH 主机 | `SSH_HOST` | `--ssh-host` | 否 | — | SSH 跳板机地址 |
| SSH 端口 | `SSH_PORT` | `--ssh-port` | 否 | `22` | SSH 端口 |
| SSH 用户 | `SSH_USER` | `--ssh-user` | 否 | — | SSH 用户名 |
| 私钥内容 | `SSH_PRIVATE_KEY` | `--ssh-private-key` | 否 | — | 直接传入私钥内容 |
| 私钥路径 | `SSH_PRIVATE_KEY_PATH` | `--ssh-private-key-path` | 否 | — | 私钥文件路径 |
| 私钥密码 | `SSH_PASSPHRASE` | `--ssh-passphrase` | 否 | — | 私钥密码（如有） |
| SSH 密码 | `SSH_PASSWORD` | `--ssh-password` | 否 | — | SSH 登录密码（替代私钥） |
| 本地绑定主机 | `SSH_LOCAL_HOST` | `--ssh-local-host` | 否 | `127.0.0.1` | SSH 隧道本地监听地址 |
| 本地绑定端口 | `SSH_LOCAL_PORT` | `--ssh-local-port` | 否 | `0` | 本地监听端口，`0` 表示自动分配 |
| 目标主机 | `SSH_DST_HOST` | `--ssh-dst-host` | 否 | 自动推断 | SSH 隧道转发目标主机 |
| 目标端口 | `SSH_DST_PORT` | `--ssh-dst-port` | 否 | 自动推断 | SSH 隧道转发目标端口 |

---

<a id="tools"></a>
## 🛠️ 支持的工具

| 工具 | 描述 |
|------|------|
| `db_connect` | 连接数据库并验证连接 |
| `db_describe_schema` | 查看表结构 |
| `db_query` | 查询数据（SELECT） |
| `db_insert` | 插入数据（INSERT） |
| `db_delete` | 删除数据（DELETE） |

---

<a id="examples"></a>
## 📖 使用示例

### `db_connect`

**请求**

```json
{}
```

**响应**

```json
{
  "connected": true,
  "database": "mydb",
  "tables": ["users", "orders"]
}
```

### `db_describe_schema`

**查询单表**

```json
{ "table": "users" }
```

**查询所有允许的表**

```json
{}
```

### `db_query`

```json
{
  "table": "users",
  "columns": ["id", "name", "email"],
  "where": { "status": "active" },
  "orderBy": { "column": "created_at", "direction": "DESC" },
  "limit": 10
}
```

### `db_insert`

```json
{
  "table": "users",
  "data": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### `db_delete`

```json
{
  "table": "users",
  "where": { "id": 123 }
}
```

---

<a id="security"></a>
## 🔒 安全注意事项

- **标识符校验** — 表名和字段名均通过合法性校验，防止注入
- **参数化查询** — 所有条件值使用参数化查询，杜绝 SQL 注入
- **强制 WHERE** — `DELETE` 默认要求携带 `WHERE` 条件，可通过 `ALLOW_EMPTY_DELETE=true` 关闭
- **结果限制** — 查询结果有最大行数限制，防止大量数据泄露

---

<a id="dev"></a>
## 🧑‍💻 本地开发

```bash
git clone <repo-url>
cd sql_mcp
npm install
node server.js --mode=sqlite --db-path=/path/to/database.db --tables='*'
```
