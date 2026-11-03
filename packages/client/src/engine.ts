/**
 * engine.ts — animates the cursor agent through a task, then calls editor to mutate DOM.
 * One agent, one task at a time (Fase 0 / Fase 1 single-agent).
 */
import type { Agent, LiveTask, TaskResult } from "./model.js";
import { createAgentNode, moveTo, placeCursor } from "./cursor.js";
import { showHighlight, hideHighlight, setStatus, getShadow } from "./overlay.js";
import { viewCenter, selectorOf, docRect } from "./utils.js";
import { sleep, nextFrame } from "./utils.js";
import * as editor from "./editor.js";

const AGENT_NAME = "Atlas";
const AGENT_COLOR = "#7c3aed";

let agent: Agent | null = null;

export function initAgent(): void {
  const shadow = getShadow();
  agent = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    targetX: 0,
    targetY: 0,
    name: AGENT_NAME,
    color: AGENT_COLOR,
    label: AGENT_NAME,
    visible: false,
    state: "idle",
    node: null,
    labelNode: null,
    caretNode: null,
  };
  createAgentNode(agent, shadow);
}

/** Execute one live task, resolve with result. */
export async function executeTask(task: LiveTask): Promise<TaskResult> {
  if (!agent) initAgent();

  try {
    switch (task.tool) {
      case "await_pick":
        return await handlePick(task);
      case "get_element":
        return await handleGetElement(task);
      case "edit_text":
        return await handleEditText(task);
      case "set_style":
        return await handleSetStyle(task);
      case "replace_element":
        return await handleReplaceElement(task);
      case "insert_element":
        return await handleInsertElement(task);
      case "remove_element":
        return await handleRemoveElement(task);
      case "undo":
        return await handleUndo(task);
      default:
        return { id: task.id, ok: false, error: `Unknown tool: ${task.tool}` };
    }
  } catch (e) {
    return { id: task.id, ok: false, error: String(e) };
  }
}

// ---------------------------------------------------------------- handlers

async function handlePick(task: LiveTask): Promise<TaskResult> {
  // Pick is handled by bridge.ts directly (UI interaction), engine doesn't animate here
  return { id: task.id, ok: true };
}

async function flyTo(selector: string): Promise<Element | null> {
  const el = document.querySelector(selector);
  if (!el) return null;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  await sleep(350);
  const vc = viewCenter(el);
  await moveTo(agent!, vc.x, vc.y);
  showHighlight(el.getBoundingClientRect(), AGENT_COLOR);
  setStatus(`${AGENT_NAME} — editing…`, AGENT_COLOR);
  return el;
}

async function handleGetElement(task: LiveTask): Promise<TaskResult> {
  const { selector } = task.args as { selector: string };
  const el = await flyTo(selector);
  if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };

  setStatus(`${AGENT_NAME} — reading element`, AGENT_COLOR);
  await sleep(300);

  const r = el.getBoundingClientRect();
  const cs = window.getComputedStyle(el);
  const after = {
    selector: selectorOf(el),
    rect: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height },
    outerHTML: el.outerHTML.slice(0, 500),
    computedStyle: {
      fontSize: cs.fontSize,
      color: cs.color,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      display: cs.display,
    },
  };

  hideHighlight();
  setStatus(`${AGENT_NAME} — idle`, AGENT_COLOR);
  return { id: task.id, ok: true, data: { ok: true, summary: `Read element: ${selector}`, after } };
}

async function handleEditText(task: LiveTask): Promise<TaskResult> {
  const { selector, text } = task.args as { selector: string; text: string };

  const el = await flyTo(selector);
  if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };

  agent!.state = "working";

  // Backspace existing text visually
  const original = el.textContent ?? "";
  await animateBackspace(el, original);

  // Type new text
  await animateTyping(el, text as string);

  // Apply real mutation
  const res = editor.editText(selector, text as string);
  hideHighlight();
  agent!.state = "idle";
  setStatus(`${AGENT_NAME} — idle`, AGENT_COLOR);

  if (!res.ok) return { id: task.id, ok: false, error: res.error };
  return { id: task.id, ok: true, data: { ok: true, summary: `Edited text of ${selector}`, after: res.after } };
}

async function handleSetStyle(task: LiveTask): Promise<TaskResult> {
  const { selector, styles } = task.args as { selector: string; styles: Record<string, string> };

  const el = await flyTo(selector);
  if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };

  agent!.state = "working";
  setStatus(`${AGENT_NAME} — applying styles…`, AGENT_COLOR);
  await sleep(400);

  const res = editor.setStyle(selector, styles);
  hideHighlight();
  agent!.state = "idle";
  setStatus(`${AGENT_NAME} — idle`, AGENT_COLOR);

  if (!res.ok) return { id: task.id, ok: false, error: res.error };
  return { id: task.id, ok: true, data: { ok: true, summary: `Styled ${selector}`, after: res.after } };
}

async function handleReplaceElement(task: LiveTask): Promise<TaskResult> {
  const { selector, html } = task.args as { selector: string; html: string };

  const el = await flyTo(selector);
  if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };

  agent!.state = "working";
  setStatus(`${AGENT_NAME} — replacing element…`, AGENT_COLOR);

  // Fade out old element
  if (el instanceof HTMLElement) {
    el.style.transition = "opacity 0.3s";
    el.style.opacity = "0";
    await sleep(350);
  }

  const res = editor.replaceElement(selector, html as string);
  hideHighlight();
  agent!.state = "idle";
  setStatus(`${AGENT_NAME} — idle`, AGENT_COLOR);

  if (!res.ok) return { id: task.id, ok: false, error: res.error };
  return { id: task.id, ok: true, data: { ok: true, summary: `Replaced ${selector}`, after: res.after } };
}

async function handleInsertElement(task: LiveTask): Promise<TaskResult> {
  const { parent, html, position } = task.args as { parent: string; html: string; position: "before" | "after" | "append" | "prepend" };

  const el = await flyTo(parent);
  if (!el) return { id: task.id, ok: false, error: `Parent not found: ${parent}` };

  agent!.state = "working";
  setStatus(`${AGENT_NAME} — inserting element…`, AGENT_COLOR);
  await sleep(400);

  const res = editor.insertElement(parent, html as string, position);
  hideHighlight();
  agent!.state = "idle";
  setStatus(`${AGENT_NAME} — idle`, AGENT_COLOR);

  if (!res.ok) return { id: task.id, ok: false, error: res.error };
  return { id: task.id, ok: true, data: { ok: true, summary: `Inserted element into ${parent}`, after: res.after } };
}

async function handleRemoveElement(task: LiveTask): Promise<TaskResult> {
  const { selector } = task.args as { selector: string };

  const el = await flyTo(selector);
  if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };

  agent!.state = "working";
  setStatus(`${AGENT_NAME} — removing element…`, AGENT_COLOR);

  if (el instanceof HTMLElement) {
    el.style.transition = "opacity 0.3s, transform 0.3s";
    el.style.opacity = "0";
    el.style.transform = "scale(0.9)";
    await sleep(350);
  }

  const res = editor.removeElement(selector);
  hideHighlight();
  agent!.state = "idle";
  setStatus(`${AGENT_NAME} — idle`, AGENT_COLOR);

  if (!res.ok) return { id: task.id, ok: false, error: res.error };
  return { id: task.id, ok: true, data: { ok: true, summary: `Removed ${selector}` } };
}

async function handleUndo(task: LiveTask): Promise<TaskResult> {
  agent!.state = "working";
  setStatus(`${AGENT_NAME} — undoing…`, AGENT_COLOR);

  const res = editor.undo();
  if (!res.ok) return { id: task.id, ok: false, error: res.error };

  // Fly to undone element
  if (res.after) {
    const el = document.querySelector(res.after.selector);
    if (el) {
      const vc = viewCenter(el);
      await moveTo(agent!, vc.x, vc.y);
      showHighlight(el.getBoundingClientRect(), "#22c55e");
      await sleep(500);
      hideHighlight();
    }
  }

  agent!.state = "idle";
  setStatus(`${AGENT_NAME} — idle`, AGENT_COLOR);
  return { id: task.id, ok: true, data: { ok: true, summary: "Undone.", after: res.after } };
}

// ---------------------------------------------------------------- animation helpers

async function animateBackspace(el: Element, text: string): Promise<void> {
  const chars = [...text];
  for (let i = chars.length; i >= 0; i--) {
    el.textContent = chars.slice(0, i).join("");
    await sleep(20);
  }
}

async function animateTyping(el: Element, text: string): Promise<void> {
  const chars = [...text];
  // Show caret
  showCaret(el);
  for (let i = 0; i <= chars.length; i++) {
    el.textContent = chars.slice(0, i).join("");
    updateCaret(el);
    await sleep(40 + Math.random() * 30);
  }
  hideCaret(el);
}

let caretEl: HTMLElement | null = null;

function showCaret(el: Element): void {
  if (!caretEl) {
    caretEl = document.createElement("span");
    caretEl.style.cssText = "display:inline-block;width:2px;height:1.1em;background:currentColor;vertical-align:text-bottom;animation:cw-blink 0.7s step-end infinite;margin-left:1px;";
  }
  el.appendChild(caretEl);
}

function updateCaret(el: Element): void {
  if (caretEl && caretEl.parentElement !== el) el.appendChild(caretEl);
}

function hideCaret(_el: Element): void {
  caretEl?.remove();
}
