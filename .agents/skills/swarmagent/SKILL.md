---
name: swarmagent
description: Multi-agent visual browser automation and synchronized live DOM editing via MCP CursorWeb. Use when redesigning or transforming web pages visually with concurrent multi-agent cursors.
---

# SwarmAgent Playbook

This skill coordinates autonomous agents and subagents to manipulate target web pages visually in real time using multi-agent browser cursors.

## 1. Verify Browser Connection
Before executing DOM manipulation, verify connection status:
Call the \`get_page\` tool.

If the response returns "No browser connected":
Guide the user through connecting the browser:
- Open Google Chrome and navigate to \`chrome://extensions\`
- Enable "Developer mode" toggle in the top-right corner
- Click "Load unpacked"
- Select the extension folder at: \`packages/extension\`
- Open or reload the target web page in Chrome (e.g. \`http://localhost:3848/demo/plain.html\`)
- Verify the green status indicator '● Connected' appears in the top-right corner

## 2. Swarm Strategy & Subagent Delegation
For UI redesigns and layout overhaul tasks:
- Inspect page structure using \`get_page\` or \`get_element\`
- Decompose the page into independent visual zones:
  * Header & Navigation
  * Hero Section
  * Product & Feature Cards
  * Call to Action & Buttons
  * Footer
- Execute concurrently:
  * Use \`swarm_execute\` to run multiple DOM mutations simultaneously in a single round-trip
  * Or spawn subagents with distinct \`agent_name\` values for each tool call (e.g. "Agent 1", "Hero Styler", "Navbar Designer")
- All visual DOM mutations are automatically persisted to the source HTML file on disk via Cheerio persistence.

## 3. Tool Reference
- \`get_page\`: Retrieve URL and title of the active connected web page
- \`await_pick\`: Interactive element picker waiting for a user click
- \`get_element\`: Read selector, bounding rect, and computed styles of an element
- \`edit_text\`: Edit text with visual backspace and typing animations
- \`set_style\`: Update inline CSS properties with visual cursor movement
- \`replace_element\`: Replace full element HTML
- \`insert_element\`: Insert new HTML elements (before, after, append, prepend)
- \`remove_element\`: Remove element from the DOM
- \`undo\`: Revert the last DOM mutation
- \`stop\`: Abort all cursor flights and clear task queue
- \`swarm_execute\`: Run batch DOM manipulations simultaneously across the swarm
