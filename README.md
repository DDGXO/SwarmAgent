# SwarmAgent

> Synchronized multi-agent visual web automation with live browser cursor swarm and automatic disk persistence.

SwarmAgent connects AI assistants (Claude Code, Cursor, Antigravity, OpenCode, Claude Desktop) directly to live web pages. Every agent action is rendered as a distinct Figma-style visual cursor with real-time flight physics, element highlights, and typing backspace animations, while simultaneously persisting DOM modifications directly to the source HTML file on disk.

---

## Key Features

* **Multi-Agent Cursor Swarm:** Spawn multiple autonomous cursors simultaneously with distinct names and 12 curated color palettes.
* **Synchronized Batch Execution:** Execute parallel DOM mutations across the swarm concurrently in the exact same millisecond via `swarm_execute`.
* **Zero-Code Injection Extension:** Connect to any local or remote web page without modifying source code by loading the unpacked Chrome Extension.
* **Automatic Disk Persistence:** All DOM changes (`edit_text`, `set_style`, `replace_element`, `insert_element`, `remove_element`) mutate and persist to disk via Cheerio.
* **Cross-Client MCP Standard:** Native support for Claude Code, Cursor, Google Antigravity, and Claude Desktop with built-in `/swarmagent` prompt and `cursorweb://guide` resource.

---

## Project Structure

```
SwarmAgent/
├── packages/
│   ├── client/          # Browser client runtime (IIFE, smooth cursor engine & animations)
│   ├── extension/       # Manifest V3 Chrome Extension for zero-touch page injection
│   └── mcp-server/      # Model Context Protocol server with WebSocket bridge & Cheerio persistence
├── demo/                # Static test fixtures (index.html, plain.html)
├── .agents/skills/      # Antigravity skill integration
├── .cursorrules         # Cursor IDE guidelines
├── CLAUDE.md            # Claude Code instructions
├── CONTRIBUTING.md      # Contribution guidelines
├── CODE_OF_CONDUCT.md   # Code of conduct
└── SECURITY.md          # Security & vulnerability reporting policy
```

---

## Quick Start

### 1. Installation & Build

```bash
npm install
npm run build
```

This compiles:
* `@cursorweb/client` into `packages/client/dist/index.global.js`
* `@cursorweb/extension` into `packages/extension/content.js`
* `@cursorweb/mcp-server` into `packages/mcp-server/dist/index.js`

### 2. Load the Chrome Extension

* Open Google Chrome and go to `chrome://extensions`
* Toggle on **Developer mode** in the top-right corner
* Click **Load unpacked**
* Select the folder: `packages/extension`
* Open any local or remote page in Chrome (e.g. `http://localhost:3848/demo/plain.html`)
* Look for the green `● Connected` indicator in the top-right corner

---

## MCP Server Configuration

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "swarmagent": {
      "command": "node",
      "args": ["<FULL_PATH_TO_SWARMAGENT>/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### Cursor IDE

Add the MCP server under **Cursor Settings > Features > MCP**:
* Name: `swarmagent`
* Type: `command`
* Command: `node <FULL_PATH_TO_SWARMAGENT>/packages/mcp-server/dist/index.js`

### Antigravity / Gemini CLI (`mcp_config.json`)

```json
{
  "mcpServers": {
    "cursorweb": {
      "command": "node",
      "args": ["<FULL_PATH_TO_SWARMAGENT>/packages/mcp-server/dist/index.js"]
    }
  }
}
```

---

## Tool Reference

| Tool | Description |
|------|-------------|
| `get_page` | Returns the URL and title of the active connected web page. |
| `await_pick` | Activates interactive element picker, waiting for user click. |
| `get_element` | Flies cursor to element, returning selector, rect, and computed styles. |
| `edit_text` | Visually types new text with backspace animation and disk persistence. |
| `set_style` | Applies inline CSS styles with visual cursor flight and disk persistence. |
| `replace_element` | Replaces full element HTML (requires `confirm: true`). |
| `insert_element` | Inserts new HTML element relative to parent (`before`, `after`, `append`, `prepend`). |
| `remove_element` | Removes element from DOM (requires `confirm: true`). |
| `undo` | Reverts the last DOM mutation and restores previous disk state. |
| `stop` | Aborts all cursor flights and clears the execution queue. |
| `swarm_execute` | Runs batch DOM manipulation tasks simultaneously across swarm cursors. |

---

## Documentation

* [CONTRIBUTING.md](CONTRIBUTING.md) : Contribution guidelines, development workflow, and coding standards.
* [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) : Community code of conduct and engineering ethics.
* [SECURITY.md](SECURITY.md) : Security policy and vulnerability disclosure procedures.
* [LICENSE](LICENSE) : MIT License.
