import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startBridge } from "./bridge.js";
import { registerTools } from "./tools.js";
import { startStaticServer } from "./serve.js";

const WS_PORT = parseInt(process.env.CURSORWEB_WS_PORT ?? "3847", 10);

// Default token if not set via environment
const token = process.env.CURSORWEB_TOKEN ?? "default";

// Start WebSocket bridge
startBridge(token);

// Start static demo server
startStaticServer();

// Print connection instructions to stderr (stdout is reserved for MCP protocol)
console.error("=".repeat(60));
console.error("SwarmAgent / CursorWeb MCP Server");
console.error("=".repeat(60));
console.error();
console.error("Inject this into your target page (before </body>):");
console.error();
console.error(
  `  <script src="http://localhost:3848/client.js"></script>\n  <script>CursorWeb.connect({ token: "${token}", wsPort: ${WS_PORT} })</script>`
);
console.error();
console.error("Or open the demo:");
console.error(
  `  http://localhost:3848/demo/?token=${token}`
);
console.error();
console.error("Waiting for browser connection...");
console.error("=".repeat(60));

// Start MCP server on stdio
const server = new McpServer({
  name: "cursorweb",
  version: "0.1.0",
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
