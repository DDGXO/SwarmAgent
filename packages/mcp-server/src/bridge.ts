import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import type { ClientMessage, ResultMessage, PickedMessage, ServerMessage, Session } from "./types.js";

const WS_PORT = parseInt(process.env.CURSORWEB_WS_PORT ?? "3847", 10);
const TASK_TIMEOUT_MS = 30_000;

// Multi-session: all connected tabs, keyed by WebSocket instance
const sessions = new Map<WebSocket, Session>();
// The "active" session — updated whenever a tab sends a hello (focus/load event)
let activeSession: Session | null = null;
let wss: WebSocketServer | null = null;

export function startBridge(token: string): void {
  wss = new WebSocketServer({ host: "127.0.0.1", port: WS_PORT });

  wss.on("error", (err) => {
    console.error("[bridge] ws server error:", err.message);
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1`);
    const reqToken = url.searchParams.get("token");
    if (token !== "default" && reqToken !== token) {
      ws.close(4001, "Unauthorized");
      return;
    }

    const sess: Session = {
      ws,
      url: "",
      title: "",
      token,
      tasks: new Map(),
    };

    sessions.set(ws, sess);
    // New tab becomes active until another one sends hello
    activeSession = sess;

    ws.on("message", (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        return;
      }
      handleClientMessage(sess, msg);
    });

    ws.on("close", () => {
      sessions.delete(ws);
      if (activeSession === sess) {
        // Fallback to any remaining open session
        activeSession = Array.from(sessions.values()).find(
          (s) => s.ws.readyState === WebSocket.OPEN
        ) ?? null;
      }
    });

    ws.on("error", (err) => {
      console.error("[bridge] ws error:", err.message);
    });

    console.error("[bridge] browser connected");
  });

  console.error(`[bridge] WebSocket listening on ws://127.0.0.1:${WS_PORT}`);
}

function handleClientMessage(sess: Session, msg: ClientMessage): void {
  if (msg.type === "hello") {
    sess.url = msg.url;
    sess.title = msg.title;
    // The tab that sent hello is the visible/focused tab — make it active
    activeSession = sess;
    console.error(`[bridge] hello from: ${msg.url}`);
    return;
  }

  if (msg.type === "picked") {
    sess.pickResolve?.(msg);
    sess.pickResolve = undefined;
    return;
  }

  if (msg.type === "result") {
    const pending = sess.tasks.get(msg.id);
    if (pending) {
      clearTimeout(pending.timeout);
      sess.tasks.delete(msg.id);
      pending.resolve(msg);
    }
    return;
  }

  if (msg.type === "event") {
    console.error(`[bridge] event: ${msg.name}`);
    return;
  }
}

export function getSession(): Session | null {
  // Return active session if still open
  if (activeSession?.ws.readyState === WebSocket.OPEN) return activeSession;
  // Otherwise find any open session
  const fallback = Array.from(sessions.values()).find(
    (s) => s.ws.readyState === WebSocket.OPEN
  ) ?? null;
  activeSession = fallback;
  return fallback;
}

/** Send a task to the browser and wait for result (max 30s). */
export async function sendTask(tool: string, args: Record<string, unknown>): Promise<ResultMessage> {
  const sess = getSession();
  if (!sess) throw new Error("No browser connected. Open the target page in Chrome with the SwarmAgent extension active.");

  const id = randomUUID();
  const msg: ServerMessage = { type: "task", id, tool, args };

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      sess.tasks.delete(id);
      reject(new Error(`Task ${id} timed out after ${TASK_TIMEOUT_MS}ms`));
    }, TASK_TIMEOUT_MS);

    sess.tasks.set(id, { resolve, timeout });
    sess.ws.send(JSON.stringify(msg));
  });
}

/** Ask browser to enter pick mode and wait for user click. */
export async function sendPick(): Promise<PickedMessage> {
  const sess = getSession();
  if (!sess) throw new Error("No browser connected.");

  const requestId = randomUUID();
  const msg: ServerMessage = { type: "task", id: requestId, tool: "await_pick", args: { requestId } };

  return new Promise((resolve) => {
    sess.pickResolve = resolve;
    sess.ws.send(JSON.stringify(msg));
  });
}

export function cancelAll(): void {
  for (const sess of sessions.values()) {
    try {
      const msg: ServerMessage = { type: "cancel_all" };
      sess.ws.send(JSON.stringify(msg));
      for (const { timeout } of sess.tasks.values()) clearTimeout(timeout);
      sess.tasks.clear();
    } catch { /* ignore closed sockets */ }
  }
}
