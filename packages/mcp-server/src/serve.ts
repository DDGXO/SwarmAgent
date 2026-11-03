/**
 * Simple static file server for the demo page + client bundle.
 * Runs alongside the MCP server on port 3848.
 */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join, resolve } from "path";
import { fileURLToPath } from "url";

const PORT = 3848;
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../..");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

export function startStaticServer(): void {
  const server = createServer(async (req, res) => {
    let urlPath = req.url?.split("?")[0] ?? "/";
    if (urlPath === "/" || urlPath.endsWith("/")) urlPath += "index.html";

    // Route: /client.js → packages/client/dist/index.global.js
    if (urlPath === "/client.js") {
      urlPath = "/packages/client/dist/index.global.js";
    }

    const filePath = join(ROOT, urlPath);
    try {
      const data = await readFile(filePath);
      const ext = extname(filePath);
      res.writeHead(200, {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  server.on("error", (err: Error) => {
    console.error(`[serve] static server error:`, err.message);
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.error(`[serve] Demo at http://localhost:${PORT}/demo/`);
  });
}
