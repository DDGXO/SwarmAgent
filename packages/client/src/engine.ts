/**
 * engine.ts — animates multiple cursor agents through tasks, then calls editor to mutate DOM.
 * Fully multi-agent: no agent limit, dynamic agent creation, distinct names and colors.
 */
import type { Agent, LiveTask, TaskResult } from "./model.js";
import { createAgentNode, moveTo, placeCursor, hideCursor } from "./cursor.js";
import { showHighlight, hideHighlight, setStatus, clearStatus, getShadow } from "./overlay.js";
import { docCenter, viewCenter, selectorOf, docRect, sleep, nextFrame } from "./utils.js";
import * as editor from "./editor.js";

const PALETTE = [
  "#7c3aed", // Violet
  "#06b6d4", // Cyan
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#ef4444", // Red
  "#14b8a6", // Teal
  "#eab308", // Yellow
  "#6366f1", // Indigo
  "#d946ef", // Fuchsia
];

const agents = new Map<string, Agent>();
let agentCounter = 0;

export function getOrCreateAgent(name?: string, color?: string): Agent {
  const shadow = getShadow();

  if (name && agents.has(name)) {
    return agents.get(name)!;
  }

  if (!name) {
    // Find an idle agent if any
    for (const a of agents.values()) {
      if (a.state === "idle") {
        return a;
      }
    }
    agentCounter++;
    name = `Agent ${agentCounter}`;
  }

  const assignedColor = color ?? PALETTE[agents.size % PALETTE.length];
  const initialX = Math.floor(Math.random() * (Math.max(window.innerWidth - 300, 200)) + 50) + window.scrollX;
  const initialY = Math.floor(Math.random() * (Math.max(window.innerHeight - 300, 200)) + 50) + window.scrollY;

  const agent: Agent = {
    x: initialX,
    y: initialY,
    targetX: 0,
    targetY: 0,
    name,
    color: assignedColor,
    label: name,
    visible: false,
    state: "idle",
    node: null,
    labelNode: null,
    caretNode: null,
  };

  createAgentNode(agent, shadow);
  placeCursor(agent, initialX, initialY);
  agents.set(name, agent);
  return agent;
}

export function initAgent(): void {}

export function dismissAgent(agent: Agent, delayMs = 1000): void {
  if (agent.dismissTimer) clearTimeout(agent.dismissTimer);
  agent.dismissTimer = setTimeout(() => {
    if (agent.state === "idle") {
      hideCursor(agent);
      clearStatus(agent.name);
    }
  }, delayMs);
}

export function dismissAllAgents(): void {
  for (const agent of agents.values()) {
    if (agent.dismissTimer) clearTimeout(agent.dismissTimer);
    hideCursor(agent);
  }
  clearStatus();
}

/** Execute one live task with a dedicated or requested agent cursor. */
export async function executeTask(task: LiveTask): Promise<TaskResult> {
  const agentName = (task.args?.agent_name as string) || task.agentName;
  const agentColor = (task.args?.agent_color as string) || task.agentColor;
  const agent = getOrCreateAgent(agentName, agentColor);

  if (agent.dismissTimer) {
    clearTimeout(agent.dismissTimer);
    agent.dismissTimer = null;
  }

  try {
    let result: TaskResult;
    switch (task.tool) {
      case "await_pick":
        result = await handlePick(task);
        break;
      case "get_element":
        result = await handleGetElement(agent, task);
        break;
      case "edit_text":
        result = await handleEditText(agent, task);
        break;
      case "set_style":
        result = await handleSetStyle(agent, task);
        break;
      case "replace_element":
        result = await handleReplaceElement(agent, task);
        break;
      case "insert_element":
        result = await handleInsertElement(agent, task);
        break;
      case "remove_element":
        result = await handleRemoveElement(agent, task);
        break;
      case "undo":
        result = await handleUndo(agent, task);
        break;
      default:
        result = { id: task.id, ok: false, error: `Unknown tool: ${task.tool}` };
        break;
    }
    dismissAgent(agent, 1000);
    return result;
  } catch (e) {
    dismissAgent(agent, 1000);
    return { id: task.id, ok: false, error: String(e) };
  }
}

// ---------------------------------------------------------------- handlers

async function handlePick(task: LiveTask): Promise<TaskResult> {
  return { id: task.id, ok: true };
}

async function flyTo(agent: Agent, selector: string): Promise<Element | null> {
  const el = document.querySelector(selector);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  if (rect.top < 60 || rect.bottom > window.innerHeight - 60) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(400);
  }

  const dc = docCenter(el);
  await moveTo(agent, dc.x, dc.y);
  showHighlight(el.getBoundingClientRect(), agent.color, agent.name);
  setStatus(`${agent.name} — editing…`, agent.color, agent.name);
  return el;
}

async function handleGetElement(agent: Agent, task: LiveTask): Promise<TaskResult> {
  const { selector } = task.args as { selector: string };
  const el = await flyTo(agent, selector);
  if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };

  setStatus(`${agent.name} — reading element`, agent.color, agent.name);
  await sleep(250);

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

  hideHighlight(agent.name);
  setStatus(`${agent.name} — idle`, agent.color, agent.name);
  return { id: task.id, ok: true, data: { ok: true, summary: `Read element: ${selector}`, after } };
}

async function handleEditText(agent: Agent, task: LiveTask): Promise<TaskResult> {
  const { selector, text } = task.args as { selector: string; text: string };

  const el = await flyTo(agent, selector);
  if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };

  agent.state = "working";

  // Backspace existing text visually
  const original = el.textContent ?? "";
  await animateBackspace(el, original);

  // Type new text with agent-colored caret
  await animateTyping(agent, el, text as string);

  // Apply real mutation
  const res = editor.editText(selector, text as string);
  hideHighlight(agent.name);
  agent.state = "idle";
  setStatus(`${agent.name} — idle`, agent.color, agent.name);

  if (!res.ok) return { id: task.id, ok: false, error: res.error };
  return { id: task.id, ok: true, data: { ok: true, summary: `Edited text of ${selector}`, after: res.after } };
}

async function handleSetStyle(agent: Agent, task: LiveTask): Promise<TaskResult> {
  const { selector, styles } = task.args as { selector: string; styles: Record<string, string> };

  const el = await flyTo(agent, selector);
  if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };

  agent.state = "working";
  setStatus(`${agent.name} — applying styles…`, agent.color, agent.name);
  await sleep(60);

  const res = editor.setStyle(selector, styles);
  hideHighlight(agent.name);
  agent.state = "idle";
  setStatus(`${agent.name} — idle`, agent.color, agent.name);

  if (!res.ok) return { id: task.id, ok: false, error: res.error };
  return { id: task.id, ok: true, data: { ok: true, summary: `Styled ${selector}`, after: res.after } };
}

async function handleReplaceElement(agent: Agent, task: LiveTask): Promise<TaskResult> {
  const { selector, html } = task.args as { selector: string; html: string };

  const el = await flyTo(agent, selector);
  if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };

  agent.state = "working";
  setStatus(`${agent.name} — replacing element…`, agent.color, agent.name);

  if (el instanceof HTMLElement) {
    el.style.transition = "opacity 0.2s";
    el.style.opacity = "0";
    await sleep(60);
  }

  const res = editor.replaceElement(selector, html as string);
  hideHighlight(agent.name);
  agent.state = "idle";
  setStatus(`${agent.name} — idle`, agent.color, agent.name);

  if (!res.ok) return { id: task.id, ok: false, error: res.error };
  return { id: task.id, ok: true, data: { ok: true, summary: `Replaced ${selector}`, after: res.after } };
}

async function handleInsertElement(agent: Agent, task: LiveTask): Promise<TaskResult> {
  const { parent, html, position } = task.args as { parent: string; html: string; position: "before" | "after" | "append" | "prepend" };

  const el = await flyTo(agent, parent);
  if (!el) return { id: task.id, ok: false, error: `Parent not found: ${parent}` };

  agent.state = "working";
  setStatus(`${agent.name} — inserting element…`, agent.color, agent.name);
  await sleep(60);

  const res = editor.insertElement(parent, html as string, position);
  hideHighlight(agent.name);
  agent.state = "idle";
  setStatus(`${agent.name} — idle`, agent.color, agent.name);

  if (!res.ok) return { id: task.id, ok: false, error: res.error };
  return { id: task.id, ok: true, data: { ok: true, summary: `Inserted element into ${parent}`, after: res.after } };
}

async function handleRemoveElement(agent: Agent, task: LiveTask): Promise<TaskResult> {
  const { selector } = task.args as { selector: string };

  const el = await flyTo(agent, selector);
  if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };

  agent.state = "working";
  setStatus(`${agent.name} — removing element…`, agent.color, agent.name);

  if (el instanceof HTMLElement) {
    el.style.transition = "opacity 0.2s, transform 0.2s";
    el.style.opacity = "0";
    el.style.transform = "scale(0.9)";
    await sleep(60);
  }

  const res = editor.removeElement(selector);
  hideHighlight(agent.name);
  agent.state = "idle";
  setStatus(`${agent.name} — idle`, agent.color, agent.name);

  if (!res.ok) return { id: task.id, ok: false, error: res.error };
  return { id: task.id, ok: true, data: { ok: true, summary: `Removed ${selector}` } };
}

async function handleUndo(agent: Agent, task: LiveTask): Promise<TaskResult> {
  agent.state = "working";
  setStatus(`${agent.name} — undoing…`, agent.color, agent.name);

  const res = editor.undo();
  if (!res.ok) return { id: task.id, ok: false, error: res.error };

  if (res.after) {
    const el = document.querySelector(res.after.selector);
    if (el) {
      const dc = docCenter(el);
      await moveTo(agent, dc.x, dc.y);
      showHighlight(el.getBoundingClientRect(), "#22c55e", agent.name);
      await sleep(150);
      hideHighlight(agent.name);
    }
  }

  agent.state = "idle";
  setStatus(`${agent.name} — idle`, agent.color, agent.name);
  return { id: task.id, ok: true, data: { ok: true, summary: "Undone.", entry: res.entry, after: res.after } };
}

// ---------------------------------------------------------------- animation helpers

async function animateBackspace(el: Element, text: string): Promise<void> {
  const chars = [...text];
  for (let i = chars.length; i >= 0; i--) {
    el.textContent = chars.slice(0, i).join("");
    await sleep(15);
  }
}

async function animateTyping(agent: Agent, el: Element, text: string): Promise<void> {
  const chars = [...text];
  const caret = document.createElement("span");
  caret.style.cssText = `display:inline-block;width:2px;height:1.1em;background:${agent.color};vertical-align:text-bottom;animation:cw-blink 0.7s step-end infinite;margin-left:1px;`;
  el.appendChild(caret);

  for (let i = 0; i <= chars.length; i++) {
    el.textContent = chars.slice(0, i).join("");
    if (caret.parentElement !== el) el.appendChild(caret);
    await sleep(25 + Math.random() * 15);
  }
  caret.remove();
}
