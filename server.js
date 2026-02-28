import { startServer } from "./src/mcp-server.js";

startServer().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
