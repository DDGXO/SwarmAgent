# Contributing to SwarmAgent

Thank you for your interest in contributing to SwarmAgent. This guide outlines the development process, coding standards, and pull request procedures.

---

## Code of Conduct

All contributors are expected to uphold our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Please treat all members of the community with respect and technical rigor.

---

## Architecture Overview

SwarmAgent consists of three decoupled workspaces:
* `packages/client`: Browser-side engine compiled as an IIFE bundle, managing visual cursors, smooth animations, status overlays, and element picking.
* `packages/extension`: Manifest V3 browser extension injecting the client runtime into target web pages without touching source HTML.
* `packages/mcp-server`: MCP server implementing JSON-RPC tools over stdio, a WebSocket bridge communicating with the browser client, and Cheerio-based file persistence.

---

## Development Workflow

### Prerequisites
* Node.js v18 or higher
* npm v9 or higher
* Google Chrome or Chromium-based browser

### Setup & Build
1. Clone the repository and install dependencies:
```bash
npm install
```

2. Build all workspaces:
```bash
npm run build
```

3. Run in development mode:
```bash
# Terminal 1: Watch client build
npm run dev:client

# Terminal 2: Run MCP server
npm run dev:server
```

---

## Coding Standards

* **TypeScript**: Strict mode enabled across all packages. Do not use `any` unless strictly necessary for dynamic DOM payloads.
* **Formatting**: Maintain clean, consistent formatting. Do not introduce extraneous whitespace or unreferenced imports.
* **Persistence Integrity**: Any tool that mutates DOM elements must ensure synchronous disk synchronization in `persist.ts`.
* **Zero Hallucination**: Do not expose or document unverified tool parameters or placeholder endpoints.
* **Commit Messages**: Follow Conventional Commits convention:
  * `feat(client): add smooth scroll tracking for document-relative cursors`
  * `fix(mcp): prevent duplicate websocket listeners on reconnect`
  * `docs(readme): update extension loading guide`

---

## Pull Request Guidelines

* Create a feature branch from `main`: `feat/feature-name` or `fix/issue-description`.
* Ensure `npm run build` succeeds with zero errors across all workspaces.
* Verify live browser interaction and disk mutation on the demo fixture.
* Submit a detailed pull request describing the changes, motivation, and verification steps.
