import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sendTask, sendPick, cancelAll, getSession } from "./bridge.js";
import type { ToolResult } from "./types.js";
import {
  persistEditText,
  persistSetStyle,
  persistReplaceElement,
  persistInsertElement,
  persistRemoveElement,
  persistUndo,
} from "./persist.js";

const GUIDE_TEXT = `# SwarmAgent / CursorWeb Guide

SwarmAgent is a multi-agent visual web automation toolkit connecting AI models directly to the live browser DOM with visual multi-cursor animations and automatic disk persistence.

## 1. Setup & Browser Connection
Before running any visual tools, check browser connection using \`get_page\`.
If you receive "No browser connected":
- Open Google Chrome and navigate to \`chrome://extensions\`
- Enable "Developer mode" toggle in the top-right corner
- Click "Load unpacked"
- Select the extension folder: \`packages/extension\`
- Open target web page in Chrome (e.g. http://localhost:3848/demo/plain.html)
- Ensure the green '● Connected' badge appears in the top-right corner of the web page

## 2. Multi-Agent & Parallel Swarm Execution
For UI redesigns and layout overhaul tasks:
- Inspect page structure using \`get_page\` and \`get_element\`
- Decompose the page into distinct visual zones:
  * Header & Navigation
  * Hero Section
  * Content Cards & Grid
  * Call To Action & Buttons
  * Footer
- Execute concurrently:
  * Option 1 (Single agent batch): Use \`swarm_execute\` tool with an array of tasks. All cursors spawn and execute simultaneously in the exact same millisecond.
  * Option 2 (Multi-agent delegation): Assign subagents with distinct \`agent_name\` parameters (e.g. 'Header Designer', 'Hero Styler', 'CTA Specialist'). Each agent receives a unique cursor color and name tag.

## 3. Tool Reference
- get_page: Return URL and title of the connected web page.
- await_pick: Activate interactive element picker and wait for user click.
- get_element: Fly cursor to element and return DOM details and computed styles.
- edit_text: Type new text with visual backspace and typing animations, automatically persisted to HTML.
- set_style: Apply inline CSS styles with visual cursor flight, automatically persisted to HTML.
- replace_element: Replace full element HTML (requires confirm: true).
- insert_element: Insert new HTML element (before, after, append, prepend).
- remove_element: Remove element from DOM (requires confirm: true).
- undo: Revert previous DOM mutation.
- stop: Abort all cursor animations and clear queue.
- swarm_execute: Run multiple DOM manipulation tasks simultaneously across the swarm.
`;

export function registerTools(server: McpServer): void {
  // ---- Resources
  server.resource(
    "cursorweb-guide",
    "cursorweb://guide",
    {
      description: "Complete SwarmAgent guide: Chrome extension setup, connection troubleshooting, and multi-agent swarm workflow.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: GUIDE_TEXT,
          mimeType: "text/markdown",
        },
      ],
    })
  );

  // ---- Prompts
  server.prompt(
    "swarmagent",
    "System instructions and playbook for orchestrating visual web redesigns with SwarmAgent multi-agent cursors.",
    {
      task: z.string().optional().describe("Description of the web manipulation or redesign task."),
    },
    async ({ task }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `${GUIDE_TEXT}\n\nCurrent Task:\n${task || "Inspect page and coordinate visual changes with swarm agents."}\n\nExecution steps:\n- Run get_page to ensure browser connection.\n- If disconnected, instruct user to load unpacked extension at chrome://extensions.\n- Decompose the task into independent UI zones and execute concurrently via swarm_execute or subagents with distinct agent_name values.`,
          },
        },
      ],
    })
  );
  // ---- get_page
  server.tool(
    "get_page",
    "Returns the URL and title of the connected page, plus the currently locked target element (if any).",
    {},
    async () => {
      const s = getSession();
      if (!s) return err("No browser connected.");
      return ok({ url: s.url, title: s.title });
    }
  );

  // ---- await_pick
  server.tool(
    "await_pick",
    "Activates the element picker in the browser. Waits for the user to click an element, then returns its selector, rect, outerHTML and key computed styles.",
    {},
    async () => {
      try {
        const picked = await sendPick();
        return ok({
          selector: picked.selector,
          rect: picked.rect,
          outerHTML: picked.outerHTML,
          computedStyle: picked.computedStyle,
        });
      } catch (e) {
        return err(String(e));
      }
    }
  );

  // ---- get_element
  server.tool(
    "get_element",
    "Fly the cursor to an element and highlight it, then return its selector, rect, outerHTML and key computed styles. Use this to read an element without waiting for a user click.",
    {
      selector: z.string().describe("CSS selector identifying the target element."),
      agent_name: z.string().optional().describe("Label for the cursor or subagent (e.g. 'Agent 1', 'Hero Designer')."),
    },
    async ({ selector, agent_name }) => {
      try {
        const res = await sendTask("get_element", { selector, agent_name });
        if (!res.ok) return err(res.error ?? "get_element failed");
        return ok(res.data as ToolResult);
      } catch (e) {
        return err(String(e));
      }
    }
  );

  // ---- edit_text
  server.tool(
    "edit_text",
    "Fly the cursor to an element, erase its current text content with a visible backspace effect, then type the new text character by character. Mutates the real DOM. Returns the element state after edit.",
    {
      selector: z.string().describe("CSS selector of the text element to edit."),
      text: z.string().describe("New text content to type into the element."),
      agent_name: z.string().optional().describe("Label for the cursor or subagent (e.g. 'Agent 1', 'Hero Designer')."),
    },
    async ({ selector, text, agent_name }) => {
      try {
        const res = await sendTask("edit_text", { selector, text, agent_name });
        if (!res.ok) return err(res.error ?? "edit_text failed");
        await persistEditText(selector, text);
        return ok(res.data as ToolResult);
      } catch (e) {
        return err(String(e));
      }
    }
  );

  // ---- set_style
  server.tool(
    "set_style",
    "Fly the cursor to an element and apply inline CSS styles. Returns the element state after the change.",
    {
      selector: z.string().describe("CSS selector of the target element."),
      styles: z.record(z.string(), z.string()).describe("Object of CSS property → value pairs (camelCase properties). Example: { color: 'red', fontSize: '24px' }"),
      agent_name: z.string().optional().describe("Label for the cursor or subagent (e.g. 'Agent 1', 'Hero Designer')."),
    },
    async ({ selector, styles, agent_name }) => {
      try {
        const res = await sendTask("set_style", { selector, styles, agent_name });
        if (!res.ok) return err(res.error ?? "set_style failed");
        await persistSetStyle(selector, styles);
        return ok(res.data as ToolResult);
      } catch (e) {
        return err(String(e));
      }
    }
  );

  // ---- replace_element
  server.tool(
    "replace_element",
    "Fly the cursor to an element, fade it out, then replace it with new HTML. DESTRUCTIVE: requires confirm: true. Returns the element state after replacement.",
    {
      selector: z.string().describe("CSS selector of the element to replace."),
      html: z.string().describe("New HTML string to replace the element with."),
      confirm: z.boolean().describe("Must be true to confirm this destructive operation. Only set true when the user explicitly requested removal or replacement."),
      agent_name: z.string().optional().describe("Label for the cursor or subagent (e.g. 'Agent 1', 'Hero Designer')."),
    },
    async ({ selector, html, confirm, agent_name }) => {
      if (!confirm) return err("confirm must be true to use replace_element. Only set it when the user explicitly asked for replacement.");
      try {
        const res = await sendTask("replace_element", { selector, html, agent_name });
        if (!res.ok) return err(res.error ?? "replace_element failed");
        await persistReplaceElement(selector, html);
        return ok(res.data as ToolResult);
      } catch (e) {
        return err(String(e));
      }
    }
  );

  // ---- insert_element
  server.tool(
    "insert_element",
    "Fly the cursor to the insertion point and insert a new element. Returns the new element state.",
    {
      parent: z.string().describe("CSS selector of the parent element."),
      html: z.string().describe("HTML string of the element to insert."),
      position: z.enum(["before", "after", "append", "prepend"]).describe("Where to insert relative to the parent."),
      agent_name: z.string().optional().describe("Label for the cursor or subagent (e.g. 'Agent 1', 'Hero Designer')."),
    },
    async ({ parent, html, position, agent_name }) => {
      try {
        const res = await sendTask("insert_element", { parent, html, position, agent_name });
        if (!res.ok) return err(res.error ?? "insert_element failed");
        await persistInsertElement(parent, html, position);
        return ok(res.data as ToolResult);
      } catch (e) {
        return err(String(e));
      }
    }
  );

  // ---- remove_element
  server.tool(
    "remove_element",
    "Fly the cursor to an element and remove it from the DOM. DESTRUCTIVE: requires confirm: true.",
    {
      selector: z.string().describe("CSS selector of the element to remove."),
      confirm: z.boolean().describe("Must be true to confirm this destructive operation."),
      agent_name: z.string().optional().describe("Label for the cursor or subagent (e.g. 'Agent 1', 'Hero Designer')."),
    },
    async ({ selector, confirm, agent_name }) => {
      if (!confirm) return err("confirm must be true to use remove_element.");
      try {
        const res = await sendTask("remove_element", { selector, agent_name });
        if (!res.ok) return err(res.error ?? "remove_element failed");
        await persistRemoveElement(selector);
        return ok(res.data as ToolResult);
      } catch (e) {
        return err(String(e));
      }
    }
  );

  // ---- undo
  server.tool(
    "undo",
    "Undo the last edit. Cursor flies back to the previously edited element and restores its state. One step per call.",
    {
      agent_name: z.string().optional().describe("Label for the cursor or subagent."),
    },
    async ({ agent_name }) => {
      try {
        const res = await sendTask("undo", { agent_name });
        if (!res.ok) return err(res.error ?? "undo failed");
        const entry = (res.data as any)?.entry;
        if (entry?.selector && entry?.before) {
          await persistUndo(entry.selector, entry.before);
        }
        return ok(res.data as ToolResult);
      } catch (e) {
        return err(String(e));
      }
    }
  );

  // ---- stop
  server.tool(
    "stop",
    "Stop all cursors and clear the task queue immediately.",
    {},
    async () => {
      cancelAll();
      return ok({ summary: "Stopped." });
    }
  );

  // ---- swarm_execute
  server.tool(
    "swarm_execute",
    "Execute multiple visual edits simultaneously as a synchronized swarm. All cursors spawn and work concurrently at the exact same millisecond.",
    {
      tasks: z.array(
        z.object({
          tool: z.enum(["edit_text", "set_style", "replace_element", "insert_element", "remove_element"]),
          selector: z.string().optional(),
          text: z.string().optional(),
          styles: z.record(z.string(), z.string()).optional(),
          html: z.string().optional(),
          parent: z.string().optional(),
          position: z.enum(["before", "after", "append", "prepend"]).optional(),
          confirm: z.boolean().optional(),
          agent_name: z.string().optional(),
        })
      ).describe("List of edit tasks to execute in parallel across the swarm."),
    },
    async ({ tasks }) => {
      try {
        const results = await Promise.all(
          tasks.map(async (t, idx) => {
            const agent_name = t.agent_name || `Agent ${idx + 1}`;
            const payload: Record<string, unknown> = { ...t, agent_name };
            const res = await sendTask(t.tool, payload);

            if (res.ok) {
              if (t.tool === "edit_text" && t.selector && t.text) {
                await persistEditText(t.selector, t.text);
              } else if (t.tool === "set_style" && t.selector && t.styles) {
                await persistSetStyle(t.selector, t.styles);
              } else if (t.tool === "replace_element" && t.selector && t.html) {
                await persistReplaceElement(t.selector, t.html);
              } else if (t.tool === "insert_element" && t.parent && t.html && t.position) {
                await persistInsertElement(t.parent, t.html, t.position);
              } else if (t.tool === "remove_element" && t.selector) {
                await persistRemoveElement(t.selector);
              }
            }
            return { task: t.tool, agent: agent_name, ok: res.ok, error: res.error };
          })
        );
        return ok({ summary: `Swarm executed ${tasks.length} tasks simultaneously`, results });
      } catch (e) {
        return err(String(e));
      }
    }
  );
}

// ---- helpers
function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(msg: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${msg}` }],
    isError: true,
  };
}
