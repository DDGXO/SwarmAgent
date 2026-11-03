/**
 * bridge.ts - WebSocket connection to MCP server.
 * Receives tasks, routes them to engine or picker, sends results back.
 */
import type { LiveTask } from "./model.js";
import { executeTask, dismissAllAgents } from "./engine.js";
import { startPicker } from "./picker.js";
import { setConnectionState } from "./overlay.js";

export interface BridgeOptions {
  token: string;
  wsPort?: number;
  host?: string;
}

type ServerMessage =
  | { type: "task"; id: string; tool: string; args: Record<string, unknown> }
  | { type: "cancel_all" };

type ClientMessage =
  | { type: "hello"; url: string; title: string }
  | { type: "picked"; requestId: string; selector: string; rect: unknown; outerHTML: string; computedStyle: unknown }
  | { type: "result"; id: string; ok: boolean; data?: unknown; error?: string }
  | { type: "event"; name: string; data?: unknown };

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let opts: BridgeOptions | null = null;
let focusListenersInstalled = false;

export function connect(options: BridgeOptions): void {
  opts = options;
  connectWs();

  if (!focusListenersInstalled) {
    focusListenersInstalled = true;
    // Tell the server this tab is now active whenever it's focused
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

function connectWs(): void {
  if (ws) { ws.onclose = null; ws.close(); ws = null; }

  const port = opts!.wsPort ?? 3847;
  const host = opts!.host ?? "127.0.0.1";
  const url = `ws://${host}:${port}?token=${opts!.token}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    console.debug("[cursorweb] connected to MCP server");
    send({ type: "hello", url: location.href, title: document.title });
    setConnectionState(true);
  };

  ws.onmessage = async (ev) => {
    let msg: ServerMessage;
    try { msg = JSON.parse(ev.data as string) as ServerMessage; }
    catch { return; }
    await handleServerMessage(msg);
  };

  ws.onerror = () => {
    // Keep silent to prevent polluting browser console / dev server terminal
  };

  ws.onclose = () => {
    setConnectionState(false);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWs, 5000);
  };
}

async function handleServerMessage(msg: ServerMessage): Promise<void> {
  if (msg.type === "cancel_all") {
    dismissAllAgents();
    return;
  }

  if (msg.type === "task") {
    // Special case: await_pick is handled by picker, not engine
    if (msg.tool === "await_pick") {
      try {
        const picked = await startPicker();
        send({
          type: "picked",
          requestId: (msg.args as Record<string, string>).requestId ?? msg.id,
          selector: picked.selector,
          rect: picked.rect,
          outerHTML: picked.outerHTML,
          computedStyle: picked.computedStyle,
        });
      } catch (e) {
        send({ type: "result", id: msg.id, ok: false, error: String(e) });
      }
      return;
    }

    // All other tools: run concurrently through multi-agent engine
    const task: LiveTask = {
      id: msg.id,
      tool: msg.tool as LiveTask["tool"],
      args: msg.args,
    };

    executeTask(task).then((result) => {
      send({
        type: "result",
        id: result.id,
        ok: result.ok,
        data: result.data,
        error: result.error,
      });
    }).catch((err) => {
      send({
        type: "result",
        id: msg.id,
        ok: false,
        error: String(err),
      });
    });
  }
}

function send(msg: ClientMessage): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}
