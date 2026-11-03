import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { sendTask, sendPick, cancelAll, getSession } from "./bridge.js";
import type { ToolResult } from "./types.js";

export function registerTools(server: McpServer): void {
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
    },
    async ({ selector }) => {
      try {
        const res = await sendTask("get_element", { selector });
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
    },
    async ({ selector, text }) => {
      try {
        const res = await sendTask("edit_text", { selector, text });
        if (!res.ok) return err(res.error ?? "edit_text failed");
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
    },
    async ({ selector, styles }) => {
      try {
        const res = await sendTask("set_style", { selector, styles });
        if (!res.ok) return err(res.error ?? "set_style failed");
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
    },
    async ({ selector, html, confirm }) => {
      if (!confirm) return err("confirm must be true to use replace_element. Only set it when the user explicitly asked for replacement.");
      try {
        const res = await sendTask("replace_element", { selector, html });
        if (!res.ok) return err(res.error ?? "replace_element failed");
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
    },
    async ({ parent, html, position }) => {
      try {
        const res = await sendTask("insert_element", { parent, html, position });
        if (!res.ok) return err(res.error ?? "insert_element failed");
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
    },
    async ({ selector, confirm }) => {
      if (!confirm) return err("confirm must be true to use remove_element.");
      try {
        const res = await sendTask("remove_element", { selector });
        if (!res.ok) return err(res.error ?? "remove_element failed");
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
    {},
    async () => {
      try {
        const res = await sendTask("undo", {});
        if (!res.ok) return err(res.error ?? "undo failed");
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
