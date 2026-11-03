/**
 * bridge.ts — WebSocket connection to MCP server.
 * Receives tasks, routes them to engine or picker, sends results back.
 */
import type { LiveTask } from "./model.js";
import { executeTask } from "./engine.js";
import { startPicker } from "./picker.js";
import { setStatus } from "./overlay.js";

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

export function connect(options: BridgeOptions): void {
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

function connectWs(): void {
  if (ws) { ws.onclose = null; ws.close(); ws = null; }

  const port = opts!.wsPort ?? 3847;
  const host = opts!.host ?? "127.0.0.1";
  const url = `ws://${host}:${port}?token=${opts!.token}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("[cursorweb] connected to MCP server");
    send({ type: "hello", url: location.href, title: document.title });
    setStatus("Atlas — connected", "#7c3aed");
  };

  ws.onmessage = async (ev) => {
    let msg: ServerMessage;
    try { msg = JSON.parse(ev.data as string) as ServerMessage; }
    catch { return; }
    await handleServerMessage(msg);
  };

  ws.onerror = () => {
    console.warn("[cursorweb] WebSocket error");
  };

  ws.onclose = () => {
    console.warn("[cursorweb] disconnected, retrying in 3s…");
    setStatus("Atlas — reconnecting…", "#f59e0b");
    reconnectTimer = setTimeout(connectWs, 3000);
  };
}

async function handleServerMessage(msg: ServerMessage): Promise<void> {
  if (msg.type === "cancel_all") {
    // TODO: signal running task to abort
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

    // All other tools: run through engine
    const task: LiveTask = {
      id: msg.id,
      tool: msg.tool as LiveTask["tool"],
      args: msg.args,
    };

    setStatus(`Atlas — ${humanize(msg.tool)}…`, "#7c3aed");

    const result = await executeTask(task);
    send({
      type: "result",
      id: result.id,
      ok: result.ok,
      data: result.data,
      error: result.error,
    });
  }
}

function send(msg: ClientMessage): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function humanize(tool: string): string {
  return tool.replace(/_/g, " ");
}
