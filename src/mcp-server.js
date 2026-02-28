import process from "node:process";
import mysql from "mysql2/promise";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseConfig } from "./config.js";
import { SERVER_META } from "./constants.js";
import { buildPoolConfig, closeSshTunnel, createSshTunnel } from "./ssh-tunnel.js";
import { registerToolHandlers } from "./tool-handlers.js";

export async function startServer() {
  const config = parseConfig();
  let tunnel = null;

  if (config.ssh.enabled) {
    tunnel = await createSshTunnel(config.ssh);
  }

  const pool = mysql.createPool(buildPoolConfig(config, tunnel));

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

  registerToolHandlers({ server, pool, config, tunnel });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    await pool.end().catch(() => undefined);
    await closeSshTunnel(tunnel).catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
