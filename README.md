# 本地 `stdio` MySQL MCP 开发示例

这是一个最小可运行的 MCP Server，运行方式为 `stdio`，用于让 LLM 受控访问 MySQL。

支持工具：
- `mysql_connect`
- `mysql_describe_schema`
- `mysql_query`
- `mysql_insert`
- `mysql_delete`

支持安全控制参数：
- 连接信息：`MYSQL_URL` 或 `MYSQL_HOST/MYSQL_PORT/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE`
- SSH 隧道：`SSH_ENABLED/SSH_HOST/SSH_PORT/SSH_USER` + 密钥或密码
- 表白名单：`ALLOWED_TABLES`（必填，支持 `*` 代表所有表）
- 允许方法：`ALLOWED_METHODS`（默认 `connect,schema,query,insert,delete`）
- 查询限制：`DEFAULT_LIMIT`、`MAX_LIMIT`
- 删除保护：`ALLOW_EMPTY_DELETE`（默认 `false`）

## 1. 安装

```bash
npm install
```

## 目录结构

```text
server.js               # 入口，仅负责启动
src/config.js           # 参数解析与校验（CLI/env）
src/ssh-tunnel.js       # SSH 隧道
src/sql-utils.js        # SQL 标识符/where/order 拼接
src/tools.js            # MCP 工具定义
src/tool-handlers.js    # 各工具调用处理
src/mcp-server.js       # MCP 生命周期管理
```

## 2. 启动

方式 A：用环境变量

```bash
MYSQL_URL='mysql://root:123456@127.0.0.1:3306/test_db' \
ALLOWED_TABLES='users,orders' \
ALLOWED_METHODS='connect,schema,query,insert,delete' \
node server.js
```

允许所有表（高风险）：

```bash
MYSQL_URL='mysql://root:123456@127.0.0.1:3306/test_db' \
ALLOWED_TABLES='*' \
ALLOWED_METHODS='connect,schema,query,insert,delete' \
node server.js
```

方式 B：用命令行参数

```bash
node server.js \
  --mysql-url='mysql://root:123456@127.0.0.1:3306/test_db' \
  --tables='users,orders' \
  --methods='connect,schema,query,insert,delete'
```

方式 C：SSH 远程连接 MySQL（跳板机）

```bash
SSH_ENABLED=true \
SSH_HOST='1.2.3.4' \
SSH_PORT=22 \
SSH_USER='ubuntu' \
SSH_PRIVATE_KEY_PATH='/Users/kk/.ssh/id_rsa' \
MYSQL_HOST='127.0.0.1' \
MYSQL_PORT=3306 \
MYSQL_USER='root' \
MYSQL_PASSWORD='123456' \
MYSQL_DATABASE='test_db' \
ALLOWED_TABLES='users,orders' \
ALLOWED_METHODS='connect,schema,query,insert,delete' \
node server.js
```

## 3. 在 MCP 客户端中配置（stdio）

以支持 MCP 的客户端为例，配置一个 `command` 指向 Node：

```json
{
  "mcpServers": {
    "mysql-local": {
      "command": "node",
      "args": [
        "/Users/kk/code/MysqlMCP/server.js",
        "--mysql-url=mysql://root:123456@127.0.0.1:3306/test_db",
        "--tables=users,orders",
        "--methods=connect,schema,query,insert,delete"
      ]
    }
  }
}
```

如果你使用的是 ChatBox 或其他支持 MCP 的桌面端，本质也是同样的 `stdio` 命令配置。

注意：
- 如果开启 SSH，MySQL 会自动走本地隧道端口，不需要手工 `ssh -L`。

## 4. LLM 可调用的工具参数

推荐顺序：
1. 先调用 `mysql_connect`
2. 再调用 `mysql_describe_schema`
3. 最后再根据结构做 `query/insert/delete`

### `mysql_query`

输入示例：

```json
{
  "table": "users",
  "columns": ["id", "name", "email"],
  "where": { "id": 1 },
  "orderBy": { "column": "id", "direction": "DESC" },
  "limit": 10
}
```

### `mysql_insert`

输入示例：

```json
{
  "table": "users",
  "data": { "name": "Tom", "email": "tom@example.com" }
}
```

### `mysql_delete`

输入示例：

```json
{
  "table": "users",
  "where": { "id": 10 }
}
```

默认不允许无条件删除。若要允许 `DELETE FROM table`，需显式设置 `ALLOW_EMPTY_DELETE=true`。

### `mysql_connect`

输入示例：

```json
{}
```

用途：显式检查数据库连接与当前库信息。  
建议让 LLM 在会话开始先调用一次。

### `mysql_describe_schema`

输入示例（查询单表）：

```json
{
  "table": "users"
}
```

输入示例（查询所有允许表）：

```json
{}
```

注意：该工具要求先调用 `mysql_connect`，否则会返回错误。
当 `ALLOWED_TABLES='*'` 时，`{}` 会返回当前数据库所有表结构。

## 5. 关键安全点

- 默认只允许访问 `ALLOWED_TABLES` 里的表；如果设置 `*` 则允许所有表。
- 字段名和表名都做了标识符校验，避免注入。
- 条件值使用参数化查询（`?` 占位符）。
- `delete` 默认必须带 `where` 条件。
- 建议优先给数据库账号最小权限（只授权必要库、必要表、必要动作）。
