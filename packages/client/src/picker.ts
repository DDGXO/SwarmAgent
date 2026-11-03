/**
 * picker.ts — element picker mode.
 * Hover highlights elements, click locks selection and resolves the pick promise.
 */
import { showHighlight, hideHighlight, showPickHint } from "./overlay.js";
import { selectorOf, docRect } from "./utils.js";

type PickResult = {
  selector: string;
  rect: { x: number; y: number; w: number; h: number };
  outerHTML: string;
  computedStyle: Record<string, string>;
};

let active = false;
let resolveFunc: ((r: PickResult) => void) | null = null;
let rejectFunc: ((e: Error) => void) | null = null;

function onMove(e: MouseEvent): void {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el === document.documentElement || el === document.body) return;
  showHighlight(el.getBoundingClientRect(), "#4f8ef7");
}

function onClick(e: MouseEvent): void {
  e.preventDefault();
  e.stopPropagation();
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el === document.documentElement || el === document.body) return;

  const r = el.getBoundingClientRect();
  const cs = window.getComputedStyle(el);
  const result: PickResult = {
    selector: selectorOf(el),
    rect: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height },
    outerHTML: el.outerHTML.slice(0, 1000),
    computedStyle: {
      fontSize: cs.fontSize,
      color: cs.color,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      display: cs.display,
      background: cs.background,
    },
  };

  stopPicker();
  resolveFunc?.(result);
}

function onKey(e: KeyboardEvent): void {
  if (e.key === "Escape") {
    stopPicker();
    rejectFunc?.(new Error("Pick cancelled by user"));
  }
}

export function startPicker(): Promise<PickResult> {
  if (active) stopPicker();
  active = true;
  showPickHint(true);
  document.addEventListener("mousemove", onMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);

  return new Promise((resolve, reject) => {
    resolveFunc = resolve;
    rejectFunc = reject;
  });
}

function stopPicker(): void {
  if (!active) return;
  active = false;
  showPickHint(false);
  hideHighlight();
  document.removeEventListener("mousemove", onMove, true);
  document.removeEventListener("click", onClick, true);
  document.removeEventListener("keydown", onKey, true);
  resolveFunc = null;
  rejectFunc = null;
}
