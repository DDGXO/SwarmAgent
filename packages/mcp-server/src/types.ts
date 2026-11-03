// ---- Messages: Server → Browser
export interface TaskMessage {
  type: "task";
  id: string;
  tool: string;
  args: Record<string, unknown>;
}

export interface CancelAllMessage {
  type: "cancel_all";
}

export type ServerMessage = TaskMessage | CancelAllMessage;

// ---- Messages: Browser → Server
export interface HelloMessage {
  type: "hello";
  url: string;
  title: string;
}

export interface PickedMessage {
  type: "picked";
  requestId: string;
  selector: string;
  rect: { x: number; y: number; w: number; h: number };
  outerHTML: string;
  computedStyle: Record<string, string>;
}

export interface ResultMessage {
  type: "result";
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface EventMessage {
  type: "event";
  name: "scroll" | "resize" | "navigate";
  data?: unknown;
}

export type ClientMessage = HelloMessage | PickedMessage | ResultMessage | EventMessage;

// ---- Tool result shape
export interface ToolResult {
  ok: boolean;
  summary: string;
  after?: {
    selector: string;
    rect: { x: number; y: number; w: number; h: number };
    outerHTML: string;
  };
}

// ---- Session state
export interface Session {
  ws: import("ws").WebSocket;
  url: string;
  title: string;
  token: string;
  /** Pending pick request: resolve when browser sends "picked" */
  pickResolve?: (msg: PickedMessage) => void;
  /** Pending task callbacks keyed by task id */
  tasks: Map<string, { resolve: (r: ResultMessage) => void; timeout: NodeJS.Timeout }>;
}
