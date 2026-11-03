/** Overlay: shadow root that hosts cursors, highlights, and status panel. */

let shadowHost: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;

const STYLE = `
  .cw-highlight {
    position: fixed;
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
  shadowHost.style.cssText = "all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 2147483640;";
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

export function showHighlight(rect: DOMRect | null, color = "#4f8ef7"): void {
  if (!shadow) return;
  if (!rect) {
    if (highlightEl) highlightEl.style.opacity = "0";
    return;
  }
  if (!highlightEl) {
    highlightEl = document.createElement("div");
    highlightEl.className = "cw-highlight";
    shadow.appendChild(highlightEl);
  }
  highlightEl.style.setProperty("--cw-color", color);
  highlightEl.style.cssText += `
    left: ${rect.left}px; top: ${rect.top}px;
    width: ${rect.width}px; height: ${rect.height}px;
    opacity: 1;
  `;
}

export function hideHighlight(): void {
  if (highlightEl) highlightEl.style.opacity = "0";
}

export function setStatus(text: string, color = "#a0a0b8"): void {
  if (!shadow) return;
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.className = "cw-status";
    shadow.appendChild(statusEl);
  }
  statusEl.innerHTML = `<span class="agent-dot" style="background:${color}"></span>${text}`;
  statusEl.style.opacity = "1";
}

export function clearStatus(): void {
  if (statusEl) statusEl.style.opacity = "0";
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
