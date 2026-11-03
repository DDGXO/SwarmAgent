export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export type TaskTool =
  | "await_pick"
  | "get_element"
  | "edit_text"
  | "set_style"
  | "replace_element"
  | "insert_element"
  | "remove_element"
  | "undo";

export interface LiveTask {
  id: string;
  tool: TaskTool;
  args: Record<string, unknown>;
}

export interface TaskResult {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface UndoEntry {
  selector: string;
  tool: TaskTool;
  before: string; // outerHTML before mutation
}

export interface Agent {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  name: string;
  color: string;
  label: string;
  visible: boolean;
  state: "idle" | "moving" | "working";
  node: HTMLElement | null;
  labelNode: HTMLElement | null;
  caretNode: HTMLElement | null;
}
