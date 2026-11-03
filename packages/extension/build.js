import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../..");
const clientBundlePath = join(ROOT, "packages/client/dist/index.global.js");

if (!existsSync(clientBundlePath)) {
  console.error("Client bundle not found! Run npm run build in packages/client first.");
  process.exit(1);
}

const clientJs = readFileSync(clientBundlePath, "utf-8");

const contentScript = `/**
 * CursorWeb Chrome Extension Content Script
 * Auto-injects CursorWeb client and connects to local MCP WebSocket bridge.
 */
(() => {
  if (window.__cursorweb_active) return;
  window.__cursorweb_active = true;

${clientJs}

  if (typeof CursorWeb !== "undefined" && CursorWeb.connect) {
    CursorWeb.connect({ token: "default", wsPort: 3847 });
    console.debug("[cursorweb-extension] Connected to local MCP bridge.");
  }
})();
`;

writeFileSync(join(__dirname, "content.js"), contentScript, "utf-8");
console.log("[extension] content.js generated successfully!");
