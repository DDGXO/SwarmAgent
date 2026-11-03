/**
 * CursorWeb Chrome Extension Content Script
 * Auto-injects CursorWeb client and connects to local MCP WebSocket bridge.
 */
(() => {
  if (window.__cursorweb_active) return;
  window.__cursorweb_active = true;

"use strict";
var CursorWeb = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    connect: () => init,
    init: () => init
  });

  // src/overlay.ts
  var shadowHost = null;
  var shadow = null;
  var STYLE = `
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
  function initOverlay() {
    shadowHost = document.createElement("div");
    shadowHost.style.cssText = "all: initial; position: fixed; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 2147483640;";
    document.documentElement.appendChild(shadowHost);
    shadow = shadowHost.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    shadow.appendChild(style);
    return shadow;
  }
  function getShadow() {
    if (!shadow) throw new Error("Overlay not initialized");
    return shadow;
  }
  var highlightEl = null;
  var statusEl = null;
  var pickHintEl = null;
  function showHighlight(rect, color = "#4f8ef7") {
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
  function hideHighlight() {
    if (highlightEl) highlightEl.style.opacity = "0";
  }
  function setStatus(text, color = "#a0a0b8") {
    if (!shadow) return;
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.className = "cw-status";
      shadow.appendChild(statusEl);
    }
    statusEl.innerHTML = `<span class="agent-dot" style="background:${color}"></span>${text}`;
    statusEl.style.opacity = "1";
  }
  function showPickHint(visible) {
    if (!shadow) return;
    if (!pickHintEl) {
      pickHintEl = document.createElement("div");
      pickHintEl.className = "cw-pick-hint";
      pickHintEl.textContent = "Click an element to select it as target  \xB7  Esc to cancel";
      shadow.appendChild(pickHintEl);
    }
    pickHintEl.style.display = visible ? "block" : "none";
  }

  // src/utils.ts
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  function nextFrame() {
    return new Promise((r) => requestAnimationFrame(r));
  }
  function dist(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function selectorOf(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let cur = el;
    while (cur && cur !== document.documentElement) {
      let seg = cur.tagName.toLowerCase();
      if (cur.id) {
        seg = `#${CSS.escape(cur.id)}`;
        parts.unshift(seg);
        break;
      }
      const parent = cur.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (c) => c.tagName === cur.tagName
        );
        if (siblings.length > 1) {
          seg += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
        }
      }
      parts.unshift(seg);
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }
  function viewCenter(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // src/cursor.ts
  var CURSOR_SVG = `
<svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 2L16.5 10.5L10 11.5L13 20L10 21L7 12L2 14L4 2Z" fill="COLOR" stroke="white" stroke-width="1.5"/>
</svg>`.trim();
  function createAgentNode(agent2, shadow2) {
    const wrap = document.createElement("div");
    wrap.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
    transform: translate(-2px, -2px);
    transition: opacity 0.2s;
    opacity: 0;
    top: 0; left: 0;
    will-change: transform;
  `;
    wrap.innerHTML = CURSOR_SVG.replace("COLOR", agent2.color);
    const label = document.createElement("div");
    label.style.cssText = `
    position: absolute;
    top: 22px;
    left: 8px;
    background: ${agent2.color};
    color: white;
    font: bold 11px/1.4 system-ui, sans-serif;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
  `;
    label.textContent = agent2.name;
    wrap.appendChild(label);
    shadow2.appendChild(wrap);
    agent2.node = wrap;
    agent2.labelNode = label;
  }
  function placeCursor(agent2, x, y) {
    agent2.x = x;
    agent2.y = y;
    if (!agent2.node) return;
    agent2.node.style.transform = `translate(${x}px, ${y}px)`;
    agent2.node.style.opacity = agent2.visible ? "1" : "0";
  }
  async function moveTo(agent2, tx, ty, speed = 1) {
    if (!agent2.node) return;
    agent2.node.style.opacity = "1";
    agent2.visible = true;
    agent2.state = "moving";
    const sx = agent2.x;
    const sy = agent2.y;
    const d = dist(sx, sy, tx, ty);
    const durationMs = clamp(d / (0.8 * speed), 200, 700);
    const start = performance.now();
    while (true) {
      const now = await nextFrame();
      const t = easeInOut(clamp((now - start) / durationMs, 0, 1));
      const cx = lerp(sx, tx, t);
      const cy = lerp(sy, ty, t);
      placeCursor(agent2, cx, cy);
      if (t >= 1) break;
    }
    agent2.state = "idle";
  }
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // src/editor.ts
  var undoStack = [];
  var MAX_UNDO = 50;
  function push(entry) {
    undoStack.push(entry);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }
  function resolveEl(selector) {
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }
  function editText(selector, text) {
    const el = resolveEl(selector);
    if (!el) return { ok: false, error: `Element not found: ${selector}` };
    push({ selector, tool: "edit_text", before: el.outerHTML });
    el.textContent = text;
    return { ok: true, after: elementInfo(el) };
  }
  function setStyle(selector, styles) {
    const el = resolveEl(selector);
    if (!el || !(el instanceof HTMLElement)) return { ok: false, error: `Element not found: ${selector}` };
    push({ selector, tool: "set_style", before: el.outerHTML });
    for (const [k, v] of Object.entries(styles)) {
      el.style[k] = v;
    }
    return { ok: true, after: elementInfo(el) };
  }
  function replaceElement(selector, html) {
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
  function insertElement(parentSelector, html, position) {
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
  function removeElement(selector) {
    const el = resolveEl(selector);
    if (!el) return { ok: false, error: `Element not found: ${selector}` };
    push({ selector, tool: "remove_element", before: el.outerHTML });
    el.remove();
    return { ok: true };
  }
  function undo() {
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
  function elementInfo(el) {
    const r = el.getBoundingClientRect();
    return {
      selector: selectorOf(el),
      rect: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height },
      outerHTML: el.outerHTML.slice(0, 500)
    };
  }

  // src/engine.ts
  var AGENT_NAME = "Atlas";
  var AGENT_COLOR = "#7c3aed";
  var agent = null;
  function initAgent() {
    const shadow2 = getShadow();
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
      caretNode: null
    };
    createAgentNode(agent, shadow2);
  }
  async function executeTask(task) {
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
  async function handlePick(task) {
    return { id: task.id, ok: true };
  }
  async function flyTo(selector) {
    const el = document.querySelector(selector);
    if (!el) return null;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(350);
    const vc = viewCenter(el);
    await moveTo(agent, vc.x, vc.y);
    showHighlight(el.getBoundingClientRect(), AGENT_COLOR);
    setStatus(`${AGENT_NAME} \u2014 editing\u2026`, AGENT_COLOR);
    return el;
  }
  async function handleGetElement(task) {
    const { selector } = task.args;
    const el = await flyTo(selector);
    if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };
    setStatus(`${AGENT_NAME} \u2014 reading element`, AGENT_COLOR);
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
        display: cs.display
      }
    };
    hideHighlight();
    setStatus(`${AGENT_NAME} \u2014 idle`, AGENT_COLOR);
    return { id: task.id, ok: true, data: { ok: true, summary: `Read element: ${selector}`, after } };
  }
  async function handleEditText(task) {
    const { selector, text } = task.args;
    const el = await flyTo(selector);
    if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };
    agent.state = "working";
    const original = el.textContent ?? "";
    await animateBackspace(el, original);
    await animateTyping(el, text);
    const res = editText(selector, text);
    hideHighlight();
    agent.state = "idle";
    setStatus(`${AGENT_NAME} \u2014 idle`, AGENT_COLOR);
    if (!res.ok) return { id: task.id, ok: false, error: res.error };
    return { id: task.id, ok: true, data: { ok: true, summary: `Edited text of ${selector}`, after: res.after } };
  }
  async function handleSetStyle(task) {
    const { selector, styles } = task.args;
    const el = await flyTo(selector);
    if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };
    agent.state = "working";
    setStatus(`${AGENT_NAME} \u2014 applying styles\u2026`, AGENT_COLOR);
    await sleep(400);
    const res = setStyle(selector, styles);
    hideHighlight();
    agent.state = "idle";
    setStatus(`${AGENT_NAME} \u2014 idle`, AGENT_COLOR);
    if (!res.ok) return { id: task.id, ok: false, error: res.error };
    return { id: task.id, ok: true, data: { ok: true, summary: `Styled ${selector}`, after: res.after } };
  }
  async function handleReplaceElement(task) {
    const { selector, html } = task.args;
    const el = await flyTo(selector);
    if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };
    agent.state = "working";
    setStatus(`${AGENT_NAME} \u2014 replacing element\u2026`, AGENT_COLOR);
    if (el instanceof HTMLElement) {
      el.style.transition = "opacity 0.3s";
      el.style.opacity = "0";
      await sleep(350);
    }
    const res = replaceElement(selector, html);
    hideHighlight();
    agent.state = "idle";
    setStatus(`${AGENT_NAME} \u2014 idle`, AGENT_COLOR);
    if (!res.ok) return { id: task.id, ok: false, error: res.error };
    return { id: task.id, ok: true, data: { ok: true, summary: `Replaced ${selector}`, after: res.after } };
  }
  async function handleInsertElement(task) {
    const { parent, html, position } = task.args;
    const el = await flyTo(parent);
    if (!el) return { id: task.id, ok: false, error: `Parent not found: ${parent}` };
    agent.state = "working";
    setStatus(`${AGENT_NAME} \u2014 inserting element\u2026`, AGENT_COLOR);
    await sleep(400);
    const res = insertElement(parent, html, position);
    hideHighlight();
    agent.state = "idle";
    setStatus(`${AGENT_NAME} \u2014 idle`, AGENT_COLOR);
    if (!res.ok) return { id: task.id, ok: false, error: res.error };
    return { id: task.id, ok: true, data: { ok: true, summary: `Inserted element into ${parent}`, after: res.after } };
  }
  async function handleRemoveElement(task) {
    const { selector } = task.args;
    const el = await flyTo(selector);
    if (!el) return { id: task.id, ok: false, error: `Element not found: ${selector}` };
    agent.state = "working";
    setStatus(`${AGENT_NAME} \u2014 removing element\u2026`, AGENT_COLOR);
    if (el instanceof HTMLElement) {
      el.style.transition = "opacity 0.3s, transform 0.3s";
      el.style.opacity = "0";
      el.style.transform = "scale(0.9)";
      await sleep(350);
    }
    const res = removeElement(selector);
    hideHighlight();
    agent.state = "idle";
    setStatus(`${AGENT_NAME} \u2014 idle`, AGENT_COLOR);
    if (!res.ok) return { id: task.id, ok: false, error: res.error };
    return { id: task.id, ok: true, data: { ok: true, summary: `Removed ${selector}` } };
  }
  async function handleUndo(task) {
    agent.state = "working";
    setStatus(`${AGENT_NAME} \u2014 undoing\u2026`, AGENT_COLOR);
    const res = undo();
    if (!res.ok) return { id: task.id, ok: false, error: res.error };
    if (res.after) {
      const el = document.querySelector(res.after.selector);
      if (el) {
        const vc = viewCenter(el);
        await moveTo(agent, vc.x, vc.y);
        showHighlight(el.getBoundingClientRect(), "#22c55e");
        await sleep(500);
        hideHighlight();
      }
    }
    agent.state = "idle";
    setStatus(`${AGENT_NAME} \u2014 idle`, AGENT_COLOR);
    return { id: task.id, ok: true, data: { ok: true, summary: "Undone.", after: res.after } };
  }
  async function animateBackspace(el, text) {
    const chars = [...text];
    for (let i = chars.length; i >= 0; i--) {
      el.textContent = chars.slice(0, i).join("");
      await sleep(20);
    }
  }
  async function animateTyping(el, text) {
    const chars = [...text];
    showCaret(el);
    for (let i = 0; i <= chars.length; i++) {
      el.textContent = chars.slice(0, i).join("");
      updateCaret(el);
      await sleep(40 + Math.random() * 30);
    }
    hideCaret(el);
  }
  var caretEl = null;
  function showCaret(el) {
    if (!caretEl) {
      caretEl = document.createElement("span");
      caretEl.style.cssText = "display:inline-block;width:2px;height:1.1em;background:currentColor;vertical-align:text-bottom;animation:cw-blink 0.7s step-end infinite;margin-left:1px;";
    }
    el.appendChild(caretEl);
  }
  function updateCaret(el) {
    if (caretEl && caretEl.parentElement !== el) el.appendChild(caretEl);
  }
  function hideCaret(_el) {
    caretEl?.remove();
  }

  // src/picker.ts
  var active = false;
  var resolveFunc = null;
  var rejectFunc = null;
  function onMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.documentElement || el === document.body) return;
    showHighlight(el.getBoundingClientRect(), "#4f8ef7");
  }
  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.documentElement || el === document.body) return;
    const r = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const result = {
      selector: selectorOf(el),
      rect: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height },
      outerHTML: el.outerHTML.slice(0, 1e3),
      computedStyle: {
        fontSize: cs.fontSize,
        color: cs.color,
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight,
        display: cs.display,
        background: cs.background
      }
    };
    stopPicker();
    resolveFunc?.(result);
  }
  function onKey(e) {
    if (e.key === "Escape") {
      stopPicker();
      rejectFunc?.(new Error("Pick cancelled by user"));
    }
  }
  function startPicker() {
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
  function stopPicker() {
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

  // src/bridge.ts
  var ws = null;
  var reconnectTimer = null;
  var opts = null;
  function connect(options) {
    opts = options;
    connectWs();
    if (typeof window !== "undefined") {
      window.addEventListener("focus", () => {
        send({ type: "hello", url: location.href, title: document.title });
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          send({ type: "hello", url: location.href, title: document.title });
        }
      });
    }
  }
  function connectWs() {
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    const port = opts.wsPort ?? 3847;
    const host = opts.host ?? "127.0.0.1";
    const url = `ws://${host}:${port}?token=${opts.token}`;
    ws = new WebSocket(url);
    ws.onopen = () => {
      console.log("[cursorweb] connected to MCP server");
      send({ type: "hello", url: location.href, title: document.title });
      setStatus("Atlas \u2014 connected", "#7c3aed");
    };
    ws.onmessage = async (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      await handleServerMessage(msg);
    };
    ws.onerror = () => {
      console.warn("[cursorweb] WebSocket error");
    };
    ws.onclose = () => {
      console.warn("[cursorweb] disconnected, retrying in 3s\u2026");
      setStatus("Atlas \u2014 reconnecting\u2026", "#f59e0b");
      reconnectTimer = setTimeout(connectWs, 3e3);
    };
  }
  async function handleServerMessage(msg) {
    if (msg.type === "cancel_all") {
      return;
    }
    if (msg.type === "task") {
      if (msg.tool === "await_pick") {
        try {
          const picked = await startPicker();
          send({
            type: "picked",
            requestId: msg.args.requestId ?? msg.id,
            selector: picked.selector,
            rect: picked.rect,
            outerHTML: picked.outerHTML,
            computedStyle: picked.computedStyle
          });
        } catch (e) {
          send({ type: "result", id: msg.id, ok: false, error: String(e) });
        }
        return;
      }
      const task = {
        id: msg.id,
        tool: msg.tool,
        args: msg.args
      };
      setStatus(`Atlas \u2014 ${humanize(msg.tool)}\u2026`, "#7c3aed");
      const result = await executeTask(task);
      send({
        type: "result",
        id: result.id,
        ok: result.ok,
        data: result.data,
        error: result.error
      });
    }
  }
  function send(msg) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
  function humanize(tool) {
    return tool.replace(/_/g, " ");
  }

  // src/index.ts
  var blink = document.createElement("style");
  blink.textContent = `@keyframes cw-blink { 0%,100%{opacity:1} 50%{opacity:0} }`;
  document.head.appendChild(blink);
  function init(options) {
    initOverlay();
    initAgent();
    connect(options);
  }
  return __toCommonJS(index_exports);
})();


  if (typeof CursorWeb !== "undefined" && CursorWeb.connect) {
    CursorWeb.connect({ token: "default", wsPort: 3847 });
    console.debug("[cursorweb-extension] Connected to local MCP bridge.");
  }
})();
