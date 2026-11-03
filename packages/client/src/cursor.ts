import type { Agent } from "./model.js";
import { easeInOut, lerp, dist, nextFrame } from "./utils.js";

const CURSOR_SVG = `
<svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 2L16.5 10.5L10 11.5L13 20L10 21L7 12L2 14L4 2Z" fill="COLOR" stroke="white" stroke-width="1.5"/>
</svg>`.trim();

/** Create cursor DOM element */
export function createAgentNode(agent: Agent, shadow: ShadowRoot): void {
  const wrap = document.createElement("div");
  wrap.style.cssText = `
    position: absolute;
    pointer-events: none;
    z-index: 2147483647;
    transform: translate(-2px, -2px);
    transition: opacity 0.2s;
    opacity: 0;
    display: none;
    top: 0; left: 0;
    will-change: transform;
  `;

  wrap.innerHTML = CURSOR_SVG.replace("COLOR", agent.color);

  const label = document.createElement("div");
  label.style.cssText = `
    position: absolute;
    top: 22px;
    left: 8px;
    background: ${agent.color};
    color: white;
    font: bold 11px/1.4 system-ui, sans-serif;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
  `;
  label.textContent = agent.name;
  wrap.appendChild(label);

  shadow.appendChild(wrap);
  agent.node = wrap;
  agent.labelNode = label;
}

/** Show cursor at viewport position (x, y) */
export function placeCursor(agent: Agent, x: number, y: number): void {
  agent.x = x;
  agent.y = y;
  if (!agent.node) return;
  agent.node.style.transform = `translate(${x}px, ${y}px)`;
  agent.node.style.opacity = agent.visible ? "1" : "0";
}

/** Animate cursor from current pos to (tx, ty) in viewport coords. */
export async function moveTo(
  agent: Agent,
  tx: number,
  ty: number,
  speed: number = 1
): Promise<void> {
  if (!agent.node) return;
  if (agent.dismissTimer) {
    clearTimeout(agent.dismissTimer);
    agent.dismissTimer = null;
  }
  agent.node.style.display = "block";
  agent.node.style.transition = "opacity 0.2s";
  agent.node.style.opacity = "1";
  agent.visible = true;
  agent.state = "moving";

  const sx = agent.x;
  const sy = agent.y;
  const d = dist(sx, sy, tx, ty);
  const durationMs = clamp(d / (1.8 * speed), 100, 320);
  const start = performance.now();

  while (true) {
    const now = await nextFrame();
    const t = easeInOut(clamp((now - start) / durationMs, 0, 1));
    const cx = lerp(sx, tx, t);
    const cy = lerp(sy, ty, t);
    placeCursor(agent, cx, cy);
    if (t >= 1) break;
  }

  agent.state = "idle";
}

/** Fade out and hide cursor from screen */
export function hideCursor(agent: Agent): void {
  if (!agent.node) return;
  agent.visible = false;
  agent.node.style.transition = "opacity 0.4s ease-out";
  agent.node.style.opacity = "0";
  setTimeout(() => {
    if (!agent.visible && agent.node) {
      agent.node.style.display = "none";
    }
  }, 450);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
