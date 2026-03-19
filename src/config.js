import process from "node:process";
import { SUPPORTED_METHODS } from "./constants.js";

const SUPPORTED_MODES = new Set(["mysql", "sqlite"]);

function parseCliArgs(argv) {
  const args = {};
  for (const part of argv) {
    if (!part.startsWith("--")) continue;
    const [rawKey, ...rest] = part.slice(2).split("=");
    if (!rawKey) continue;
    args[rawKey] = rest.join("=");
  }
  return args;
}

function splitCsv(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return value
    .toString()
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).toLowerCase().trim();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return fallback;
}

function assertPort(value, label, allowZero = false) {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }
  const min = allowZero ? 0 : 1;
  if (value < min || value > 65535) {
    throw new Error(`${label} must be between ${min} and 65535`);
  }
}

function normalizeEscapedNewlines(value) {
  if (typeof value !== "string") return value;
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

function parseMysqlUrlInfo(mysqlUrl) {
  if (!mysqlUrl) return null;
  try {
    const parsed = new URL(mysqlUrl);
    return {
      host: parsed.hostname || null,
      port: parsed.port ? Number(parsed.port) : 3306
    };
  } catch (error) {
    throw new Error(`MYSQL_URL is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function parseConfig() {
  const cli = parseCliArgs(process.argv.slice(2));
  if (cli.headers !== undefined || process.env.MCP_HEADERS !== undefined) {
    throw new Error("Header config is removed. Use CLI args or environment variables instead.");
  }
  const get = (cliKey, envKey, fallback = undefined) => {
    return cli[cliKey] ?? process.env[envKey] ?? fallback;
  };

  // Parse mode (default: mysql)
  const mode = get("mode", "DB_MODE", "mysql").toLowerCase();
  if (!SUPPORTED_MODES.has(mode)) {
    throw new Error(`Unsupported mode '${mode}'. Supported modes: ${Array.from(SUPPORTED_MODES).join(", ")}`);
  }

  const allowedTables = splitCsv(get("tables", "ALLOWED_TABLES"));
  const allowedMethods = splitCsv(
    get("methods", "ALLOWED_METHODS", "connect,schema,query,insert,delete")
  ).map((m) => m.toLowerCase());

  const defaultLimit = Number(get("default-limit", "DEFAULT_LIMIT", "100"));
  const maxLimit = Number(get("max-limit", "MAX_LIMIT", "1000"));
  const allowEmptyDelete = parseBoolean(get("allow-empty-delete", "ALLOW_EMPTY_DELETE", "false"), false);

  if (!allowedTables.length) {
    throw new Error("ALLOWED_TABLES is required, e.g. users,orders or *");
  }
  if (!allowedMethods.length) {
    throw new Error("ALLOWED_METHODS must include at least one supported method");
  }
  for (const method of allowedMethods) {
    if (!SUPPORTED_METHODS.has(method)) {
      throw new Error(`Unsupported method '${method}'. Supported: connect,schema,query,insert,delete`);
    }
  }
  if (allowedMethods.includes("schema") && !allowedMethods.includes("connect")) {
    throw new Error("If schema is enabled, connect must also be enabled");
  }
  if (Number.isNaN(defaultLimit) || Number.isNaN(maxLimit)) {
    throw new Error("DEFAULT_LIMIT and MAX_LIMIT must be numbers");
  }

  // SQLite-specific config
  if (mode === "sqlite") {
    const dbPath = get("db-path", "SQLITE_DB_PATH");
    if (!dbPath) {
      throw new Error("SQLITE_DB_PATH (or --db-path) is required for SQLite mode");
    }

    return {
      mode: "sqlite",
      dbPath,
      allowedTables: new Set(allowedTables),
      allowedMethods: new Set(allowedMethods),
      defaultLimit,
      maxLimit,
      allowEmptyDelete,
      ssh: { enabled: false }
    };
  }

  // MySQL-specific config
  const mysqlUrl = get("mysql-url", "MYSQL_URL");
  const host = get("mysql-host", "MYSQL_HOST");
  const port = Number(get("mysql-port", "MYSQL_PORT", "3306"));
  const user = get("mysql-user", "MYSQL_USER");
  const password = get("mysql-password", "MYSQL_PASSWORD");
  const database = get("mysql-database", "MYSQL_DATABASE");
  const mysqlUrlInfo = parseMysqlUrlInfo(mysqlUrl);

  const sshEnabled = parseBoolean(get("ssh-enabled", "SSH_ENABLED", "false"), false);
  const sshHost = get("ssh-host", "SSH_HOST");
  const sshPort = Number(get("ssh-port", "SSH_PORT", "22"));
  const sshUser = get("ssh-user", "SSH_USER");
  const sshPassword = get("ssh-password", "SSH_PASSWORD");
  const sshPrivateKey = normalizeEscapedNewlines(get("ssh-private-key", "SSH_PRIVATE_KEY"));
  const sshPrivateKeyPath = get("ssh-private-key-path", "SSH_PRIVATE_KEY_PATH");
  const sshPassphrase = get("ssh-passphrase", "SSH_PASSPHRASE");
  const sshLocalHost = get("ssh-local-host", "SSH_LOCAL_HOST", "127.0.0.1");
  const sshLocalPort = Number(get("ssh-local-port", "SSH_LOCAL_PORT", "0"));
  const sshDstHost = get("ssh-dst-host", "SSH_DST_HOST", host ?? mysqlUrlInfo?.host ?? "127.0.0.1");
  const sshDstPort = Number(
    get("ssh-dst-port", "SSH_DST_PORT", String(mysqlUrlInfo?.port ?? port))
  );

  if (!mysqlUrl && (!host || !user || !database)) {
    throw new Error("Provide MYSQL_URL or MYSQL_HOST + MYSQL_USER + MYSQL_DATABASE");
  }
  if (!mysqlUrl && (!host || !port)) {
    throw new Error("MYSQL_HOST and MYSQL_PORT are required when MYSQL_URL is not set");
  }
  if (!mysqlUrlInfo && Number.isNaN(port)) {
    throw new Error("MYSQL_PORT must be a number");
  }
  if (!mysqlUrlInfo) {
    assertPort(port, "MYSQL_PORT");
  }
  if (sshEnabled) {
    if (!sshHost) throw new Error("SSH_HOST is required when SSH_ENABLED=true");
    if (!sshUser) throw new Error("SSH_USER is required when SSH_ENABLED=true");
    if (!sshPassword && !sshPrivateKey && !sshPrivateKeyPath) {
      throw new Error("Provide SSH_PASSWORD or SSH_PRIVATE_KEY or SSH_PRIVATE_KEY_PATH");
    }
    if (Number.isNaN(sshPort) || Number.isNaN(sshLocalPort) || Number.isNaN(sshDstPort)) {
      throw new Error("SSH_PORT/SSH_LOCAL_PORT/SSH_DST_PORT must be numbers");
    }
    assertPort(sshPort, "SSH_PORT");
    assertPort(sshLocalPort, "SSH_LOCAL_PORT", true);
    assertPort(sshDstPort, "SSH_DST_PORT");
  }

  return {
    mode: "mysql",
    mysqlUrl,
    host,
    port,
    user,
    password,
    database,
    allowedTables: new Set(allowedTables),
    allowedMethods: new Set(allowedMethods),
    defaultLimit,
    maxLimit,
    allowEmptyDelete,
    ssh: {
      enabled: sshEnabled,
      host: sshHost,
      port: sshPort,
      user: sshUser,
      password: sshPassword,
      privateKey: sshPrivateKey,
      privateKeyPath: sshPrivateKeyPath,
      passphrase: sshPassphrase,
      localHost: sshLocalHost,
      localPort: sshLocalPort,
      dstHost: sshDstHost,
      dstPort: sshDstPort
    }
  };
}
