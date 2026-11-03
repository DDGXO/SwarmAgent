/**
 * CursorWeb client — browser-side entry point.
 * Usage:
 *   <script src="client.js"></script>
 *   <script>CursorWeb.connect({ token: "...", wsPort: 3847 })</script>
 */
import { initOverlay } from "./overlay.js";
import { initAgent } from "./engine.js";
import { connect, type BridgeOptions } from "./bridge.js";

// Inject blink keyframe into document head
const blink = document.createElement("style");
blink.textContent = `@keyframes cw-blink { 0%,100%{opacity:1} 50%{opacity:0} }`;
document.head.appendChild(blink);

export function init(options: BridgeOptions): void {
  initOverlay();
  connect(options);
}

// Alias
export { init as connect };
export type { BridgeOptions };
