/**
 * editor.ts — applies mutations to the real DOM, tracks undo history.
 */
import { selectorOf, docRect } from "./utils.js";
import type { UndoEntry, TaskTool } from "./model.js";

const undoStack: UndoEntry[] = [];
const MAX_UNDO = 50;

function push(entry: UndoEntry): void {
  undoStack.push(entry);
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function resolveEl(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

export function editText(selector: string, text: string): { ok: boolean; error?: string; after?: ReturnType<typeof elementInfo> } {
  const el = resolveEl(selector);
  if (!el) return { ok: false, error: `Element not found: ${selector}` };

  push({ selector, tool: "edit_text", before: el.outerHTML });
  el.textContent = text;
  return { ok: true, after: elementInfo(el) };
}

export function setStyle(selector: string, styles: Record<string, string>): { ok: boolean; error?: string; after?: ReturnType<typeof elementInfo> } {
  const el = resolveEl(selector);
  if (!el || !(el instanceof HTMLElement)) return { ok: false, error: `Element not found: ${selector}` };

  push({ selector, tool: "set_style", before: el.outerHTML });
  for (const [k, v] of Object.entries(styles)) {
    (el.style as unknown as Record<string, string>)[k] = v;
  }
  return { ok: true, after: elementInfo(el) };
}

export function replaceElement(selector: string, html: string): { ok: boolean; error?: string; after?: ReturnType<typeof elementInfo> } {
  const el = resolveEl(selector);
  if (!el) return { ok: false, error: `Element not found: ${selector}` };

  push({ selector, tool: "replace_element", before: el.outerHTML });
  const temp = document.createElement("template");
  temp.innerHTML = html.trim();
  const newEl = temp.content.firstElementChild;
  if (!newEl) return { ok: false, error: "html produced no element" };
  el.replaceWith(newEl);
  return { ok: true, after: elementInfo(newEl) };
}

export function insertElement(
  parentSelector: string,
  html: string,
  position: "before" | "after" | "append" | "prepend"
): { ok: boolean; error?: string; after?: ReturnType<typeof elementInfo> } {
  const parent = resolveEl(parentSelector);
  if (!parent) return { ok: false, error: `Parent not found: ${parentSelector}` };

  const temp = document.createElement("template");
  temp.innerHTML = html.trim();
  const newEl = temp.content.firstElementChild;
  if (!newEl) return { ok: false, error: "html produced no element" };

  push({ selector: parentSelector, tool: "insert_element", before: parent.outerHTML });

  if (position === "before") parent.before(newEl);
  else if (position === "after") parent.after(newEl);
  else if (position === "prepend") parent.prepend(newEl);
  else parent.append(newEl);

  return { ok: true, after: elementInfo(newEl) };
}

export function removeElement(selector: string): { ok: boolean; error?: string } {
  const el = resolveEl(selector);
  if (!el) return { ok: false, error: `Element not found: ${selector}` };

  push({ selector, tool: "remove_element", before: el.outerHTML });
  el.remove();
  return { ok: true };
}

export function undo(): { ok: boolean; error?: string; entry?: UndoEntry; after?: ReturnType<typeof elementInfo> } {
  const entry = undoStack.pop();
  if (!entry) return { ok: false, error: "Nothing to undo." };

  const el = resolveEl(entry.selector);
  if (!el) return { ok: false, error: `Undo target not found: ${entry.selector}` };

  const temp = document.createElement("template");
  temp.innerHTML = entry.before.trim();
  const restored = temp.content.firstElementChild;
  if (!restored) return { ok: false, error: "Undo: could not parse saved HTML." };

  el.replaceWith(restored);
  return { ok: true, entry, after: elementInfo(restored) };
}

export function elementInfo(el: Element) {
  const r = el.getBoundingClientRect();
  return {
    selector: selectorOf(el),
    rect: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height },
    outerHTML: el.outerHTML.slice(0, 500),
  };
}

export function getUndoStack(): UndoEntry[] { return undoStack; }
