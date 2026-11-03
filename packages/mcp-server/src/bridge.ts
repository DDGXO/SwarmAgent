import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import type { ClientMessage, ResultMessage, PickedMessage, ServerMessage, Session } from "./types.js";

const WS_PORT = 3847;
const TASK_TIMEOUT_MS = 30_000;

let session: Session | null = null;
let wss: WebSocketServer | null = null;

export function startBridge(token: string): void {
  wss = new WebSocketServer({ host: "127.0.0.1", port: WS_PORT });

  wss.on("error", (err) => {
    console.error("[bridge] ws server error:", err.message);
  });

  wss.on("connection", (ws, req) => {
    // Validate token via query param (allow 'default' or match)
    const url = new URL(req.url ?? "/", `http://127.0.0.1`);
    const reqToken = url.searchParams.get("token");
    if (token !== "default" && reqToken !== token) {
      ws.close(4001, "Unauthorized");
      return;
    }

    if (session) {
      session.ws.close(4000, "Replaced by new connection");
    }

    session = {
      ws,
      url: "",
      title: "",
      token,
      tasks: new Map(),
    };

    ws.on("message", (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as ClientMessage;
      } catch {
        return;
      }
      handleClientMessage(msg);
    });

    ws.on("close", () => {
      if (session?.ws === ws) session = null;
    });

    ws.on("error", (err) => {
      console.error("[bridge] ws error:", err.message);
    });

    console.error("[bridge] browser connected");
  });

  console.error(`[bridge] WebSocket listening on ws://127.0.0.1:${WS_PORT}`);
}

function handleClientMessage(msg: ClientMessage): void {
  if (!session) return;

  if (msg.type === "hello") {
    session.url = msg.url;
    session.title = msg.title;
    console.error(`[bridge] hello from: ${msg.url}`);
    return;
  }

  if (msg.type === "picked") {
    session.pickResolve?.(msg);
    session.pickResolve = undefined;
    return;
  }

  if (msg.type === "result") {
    const pending = session.tasks.get(msg.id);
    if (pending) {
      clearTimeout(pending.timeout);
      session.tasks.delete(msg.id);
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
  return session;
}

/** Send a task to the browser and wait for result (max 30s). */
export async function sendTask(tool: string, args: Record<string, unknown>): Promise<ResultMessage> {
  if (!session) throw new Error("No browser connected. Open the target page with CursorWeb client injected.");

  const id = randomUUID();
  const msg: ServerMessage = { type: "task", id, tool, args };

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      session?.tasks.delete(id);
      reject(new Error(`Task ${id} timed out after ${TASK_TIMEOUT_MS}ms`));
    }, TASK_TIMEOUT_MS);

    session!.tasks.set(id, { resolve, timeout });
    session!.ws.send(JSON.stringify(msg));
  });
}

/** Ask browser to enter pick mode and wait for user click. */
export async function sendPick(): Promise<PickedMessage> {
  if (!session) throw new Error("No browser connected.");

  const requestId = randomUUID();
  const msg: ServerMessage = { type: "task", id: requestId, tool: "await_pick", args: { requestId } };

  return new Promise((resolve) => {
    session!.pickResolve = resolve;
    session!.ws.send(JSON.stringify(msg));
  });
}

export function cancelAll(): void {
  if (!session) return;
  const msg: ServerMessage = { type: "cancel_all" };
  session.ws.send(JSON.stringify(msg));
  for (const { timeout } of session.tasks.values()) clearTimeout(timeout);
  session.tasks.clear();
}
