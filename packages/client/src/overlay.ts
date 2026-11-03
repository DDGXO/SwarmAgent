/** Overlay: shadow root that hosts cursors, highlights, and status panel. */

let shadowHost: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;

const STYLE = `
  .cw-highlight {
    position: absolute;
    pointer-events: none;
    z-index: 2147483646;
    outline: 2px solid var(--cw-color, #4f8ef7);
    outline-offset: 2px;
    border-radius: 3px;
    transition: opacity 0.15s;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--cw-color, #4f8ef7) 20%, transparent);
  }
  .cw-status {
    position: fixed;
    bottom: 16px;
    right: 16px;
    background: rgba(20,20,28,0.92);
    color: #e8e8f0;
    font: 12px/1.5 system-ui, sans-serif;
    padding: 6px 12px;
    border-radius: 8px;
    z-index: 2147483647;
    pointer-events: none;
    backdrop-filter: blur(6px);
    max-width: 280px;
    transition: opacity 0.2s;
  }
  .cw-status .agent-dot {
    display: inline-block;
    width: 8px; height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }
  .cw-pick-hint {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20,20,28,0.9);
    color: #e8e8f0;
    font: 13px/1.6 system-ui, sans-serif;
    padding: 6px 18px;
    border-radius: 20px;
    z-index: 2147483647;
    pointer-events: none;
  }
`;

export function initOverlay(): ShadowRoot {
  shadowHost = document.createElement("div");
  shadowHost.style.cssText = "all: initial; position: absolute; top: 0; left: 0; width: 100%; min-height: 100%; pointer-events: none; z-index: 2147483640;";
  document.documentElement.appendChild(shadowHost);
  shadow = shadowHost.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLE;
  shadow.appendChild(style);

  return shadow;
}

export function getShadow(): ShadowRoot {
  if (!shadow) throw new Error("Overlay not initialized");
  return shadow;
}

let highlightEl: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;
let pickHintEl: HTMLElement | null = null;
const agentHighlights = new Map<string, HTMLElement>();
const agentStatuses = new Map<string, { text: string; color: string }>();
let connectionState = { connected: false, text: "Connecting…" };

export function setConnectionState(connected: boolean): void {
  connectionState = connected
    ? { connected: true, text: "Connected" }
    : { connected: false, text: "Reconnecting…" };
  renderStatuses();
}

export function showHighlight(rect: DOMRect | null, color = "#4f8ef7", agentName = "default"): void {
  if (!shadow) return;
  if (!rect) {
    hideHighlight(agentName);
    return;
  }
  let el = agentHighlights.get(agentName);
  if (!el) {
    el = document.createElement("div");
    el.className = "cw-highlight";
    shadow.appendChild(el);
    agentHighlights.set(agentName, el);
  }
  const docLeft = rect.left + window.scrollX;
  const docTop = rect.top + window.scrollY;
  el.style.setProperty("--cw-color", color);
  el.style.cssText += `
    left: ${docLeft}px; top: ${docTop}px;
    width: ${rect.width}px; height: ${rect.height}px;
    opacity: 1;
  `;
}

export function hideHighlight(agentName = "default"): void {
  const el = agentHighlights.get(agentName);
  if (el) el.style.opacity = "0";
}

export function setStatus(text: string, color = "#a0a0b8", agentName = "default"): void {
  if (!shadow) return;
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.className = "cw-status";
    shadow.appendChild(statusEl);
  }
  agentStatuses.set(agentName, { text, color });
  renderStatuses();
}

export function clearStatus(agentName?: string): void {
  if (agentName) {
    agentStatuses.delete(agentName);
    renderStatuses();
  } else {
    agentStatuses.clear();
    renderStatuses();
  }
}

function renderStatuses(): void {
  if (!shadow) return;
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.className = "cw-status";
    shadow.appendChild(statusEl);
  }

  const entries = Array.from(agentStatuses.entries()).filter(([_, val]) => val.text);
  const dotColor = connectionState.connected ? "#10b981" : "#f59e0b";

  let html = `<div style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:${dotColor};">
    <span class="agent-dot" style="background:${dotColor};margin:0;"></span>
    <span>${connectionState.text}</span>
  </div>`;

  if (entries.length > 0) {
    html += `<div style="margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px;">` +
      entries.slice(-4).map(([name, { text, color }]) => 
        `<div style="margin: 2px 0; font-size: 11px; color: #cbd5e1;"><span class="agent-dot" style="background:${color};"></span><strong>${name}</strong>: ${text}</div>`
      ).join("") + `</div>`;
  }

  statusEl.innerHTML = html;
  statusEl.style.opacity = "1";
}

export function showPickHint(visible: boolean): void {
  if (!shadow) return;
  if (!pickHintEl) {
    pickHintEl = document.createElement("div");
    pickHintEl.className = "cw-pick-hint";
    pickHintEl.textContent = "Click an element to select it as target  ·  Esc to cancel";
    shadow.appendChild(pickHintEl);
  }
  pickHintEl.style.display = visible ? "block" : "none";
}
