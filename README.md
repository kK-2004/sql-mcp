# SQL MCP Server

这是一个最小可运行的 MCP Server，运行方式为 `stdio`，让 LLM 受控访问 MySQL 或 SQLite 数据库。

## 支持工具

- `db_connect` - 连接数据库并验证连接
- `db_describe_schema` - 查看表结构
- `db_query` - 查询数据
- `db_insert` - 插入数据
- `db_delete` - 删除数据

## 支持数据库

- **MySQL** (默认) - 通过连接字符串或 SSH 隧道连接
- **SQLite** - 通过本地文件路径连接

## 支持安全控制参数

- **通用参数**:
  - `ALLOWED_TABLES` - 表白名单（必填，支持 `*` 代表所有表）
  - `ALLOWED_METHODS` - 允许方法（默认 `connect,schema,query,insert,delete`）
  - `DEFAULT_LIMIT` - 默认查询限制（默认 `100`）
  - `MAX_LIMIT` - 最大查询限制（默认 `1000`）
  - `ALLOW_EMPTY_DELETE` - 是否允许无条件删除（默认 `false`）

- **MySQL 参数**:
  - `MYSQL_URL` 或 `MYSQL_HOST/MYSQL_PORT/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE`
  - SSH 隧道: `SSH_ENABLED/SSH_HOST/SSH_PORT/SSH_USER` + 密钥或密码

- **SQLite 参数**:
  - `SQLITE_DB_PATH` - SQLite 数据库文件路径（必填）

## 安装

```bash
npm install
# 或
pnpm install
```

## 使用方式

### MySQL 模式（默认)

```bash
# 环境变量方式
export MYSQL_HOST='127.0.0.1'
export MYSQL_PORT=3306
export MYSQL_USER='root'
export MYSQL_PASSWORD='password'
export MYSQL_DATABASE='mydb'
export ALLOWED_TABLES='users,orders'

# 命令行参数方式
node server.js \
  --mysql-host=127.0.0.1 \
  --mysql-port=3306 \
  --mysql-user=root \
  --mysql-password=password \
  --mysql-database=mydb \
  --tables='users,orders'
```

### SQLite 模式

```bash
# 环境变量方式
export MODE=sqlite
export SQLITE_DB_PATH='/path/to/database.db'
export ALLOWED_TABLES='users,orders'

# 命令行参数方式
node server.js \
  --mode=sqlite \
  --db-path=/path/to/database.db \
  --tables='users,orders'
```

### MySQL + SSH 隧道

```bash
# 环境变量方式
export SSH_ENABLED=true
export SSH_HOST='jump.example.com'
export SSH_PORT=22
export SSH_USER='ubuntu'
export SSH_PRIVATE_KEY_PATH='/Users/you/.ssh/id_rsa'
export MYSQL_HOST='127.0.0.1'
export MYSQL_PORT=3306
export MYSQL_USER='root'
export MYSQL_PASSWORD='password'
export MYSQL_DATABASE='mydb'
export ALLOWED_TABLES='*'

# 命令行参数方式
node server.js \
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

## 工具使用示例

### db_connect

连接数据库并返回连接信息。

```json
{}
```

### db_describe_schema

查看表结构。

查询单表:
```json
{
  "table": "users"
}
```

查询所有允许表:
```json
{}
```

### db_query

查询数据。

```json
{
  "table": "users",
  "columns": ["id", "name", "email"],
  "where": { "status": "active" },
  "orderBy": { "column": "created_at", "direction": "DESC" },
  "limit": 10
}
```

### db_insert

插入数据。

```json
{
  "table": "users",
  "data": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### db_delete

删除数据。

```json
{
  "table": "users",
  "where": { "id": 123 }
}
```

## 目录结构

```
server.js               # 入口
src/
├── config.js           # 参数解析
├── constants.js        # 常量定义
├── mcp-server.js       # MCP 服务器
├── ssh-tunnel.js       # SSH 隧道
├── tools.js            # MCP 工具定义
├── tool-handlers.js    # 工具处理
├── results.js           # 响应格式化
└── adapters/
    ├── base.js           # 适配器接口
    ├── mysql.js          # MySQL 适配器
    └── sqlite.js          # SQLite 适配器
```

## 安全注意事项

- 表名和字段名都做了标识符校验，避免 SQL 注入
- 条件值使用参数化查询
- `delete` 默认需要 `where` 条件
- 埥询结果有最大限制
- 建议使用最小权限的数据库账号

