# Claude Code Guidelines for SwarmAgent

## MCP Tools & Prompts
This project provides the `cursorweb` MCP server for multi-agent visual browser automation.
- Prompt: `/swarmagent` (use to initialize a multi-agent visual editing session).
- Resource: `cursorweb://guide` (read the comprehensive swarm playbook and extension troubleshooting guide).

## Strict Rule: Zero Source Code Reading for DOM Discovery
- NEVER use `grep`, `git grep`, or file read tools to search source code for selectors or text strings.
- ALWAYS inspect and manipulate the live DOM directly via CursorWeb tools (`get_page`, `get_element`, `await_pick`).
- If unsure of the target selector, query semantic elements via `get_element` or invoke `await_pick` for user click.

## Visual DOM Workflow
- Verify browser connection via `get_page`.
- If disconnected: instruct the user to open `chrome://extensions`, enable Developer Mode, click "Load unpacked", select `packages/extension`, and open the target web page.
- For simultaneous multi-element mutations, use the `swarm_execute` batch tool or pass a distinct `agent_name` to each tool call.
- All visual DOM mutations are automatically persisted to the source HTML file on disk via Cheerio persistence.
