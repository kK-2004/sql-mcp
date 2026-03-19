import process from "node:process";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseConfig } from "./config.js";
import { SERVER_META } from "./constants.js";
import { closeSshTunnel, createSshTunnel } from "./ssh-tunnel.js";
import { registerToolHandlers } from "./tool-handlers.js";
import { MySQLAdapter } from "./adapters/mysql.js";
import { SQLiteAdapter } from "./adapters/sqlite.js";

export async function startServer() {
  const config = parseConfig();
  let tunnel = null;
  let adapter = null;

  // Create SSH tunnel for MySQL mode if configured
  if (config.mode === "mysql" && config.ssh.enabled) {
    tunnel = await createSshTunnel(config.ssh);
  }

  // Create the appropriate adapter based on mode
  if (config.mode === "sqlite") {
    adapter = new SQLiteAdapter(config);
  } else {
    adapter = new MySQLAdapter(config, tunnel);
  }

  const server = new Server(
    {
      name: SERVER_META.name,
      version: SERVER_META.version
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  registerToolHandlers({ server, adapter, config, tunnel });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    await adapter.close().catch(() => undefined);
    await closeSshTunnel(tunnel).catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
