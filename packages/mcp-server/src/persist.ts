import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { resolve, join } from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";
import { getSession } from "./bridge.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export function getSourceFilePath(): string | null {
  const session = getSession();
  if (session?.url) {
    try {
      const parsed = new URL(session.url);
      let pathname = parsed.pathname;
      if (pathname === "/" || pathname.endsWith("/")) {
        pathname += "index.html";
      }
      const fullPath = join(ROOT, pathname);
      if (existsSync(fullPath)) return fullPath;
    } catch {
      // ignore
    }
  }

  const defaultDemo = join(ROOT, "demo/index.html");
  if (existsSync(defaultDemo)) return defaultDemo;

  return null;
}

export async function persistMutation(
  mutator: ($: cheerio.CheerioAPI) => void
): Promise<string | null> {
  const filePath = getSourceFilePath();
  if (!filePath) return null;

  try {
    const raw = await readFile(filePath, "utf-8");
    const $ = cheerio.load(raw);
    mutator($);
    await writeFile(filePath, $.html(), "utf-8");
    console.error(`[persist] Saved changes to ${filePath}`);
    return filePath;
  } catch (err: any) {
    console.error(`[persist] Failed to persist to ${filePath}:`, err.message);
    return null;
  }
}

export async function persistEditText(selector: string, text: string): Promise<string | null> {
  return persistMutation(($) => {
    $(selector).text(text);
  });
}

export async function persistSetStyle(selector: string, styles: Record<string, string>): Promise<string | null> {
  return persistMutation(($) => {
    const el = $(selector);
    const existing = el.attr("style") || "";
    const styleMap = new Map<string, string>();
    existing.split(";").forEach((pair) => {
      const [k, v] = pair.split(":").map((s) => s.trim());
      if (k && v) styleMap.set(k, v);
    });
    for (const [k, v] of Object.entries(styles)) {
      const kebab = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      styleMap.set(kebab, v);
    }
    const combined = Array.from(styleMap.entries())
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ");
    el.attr("style", combined);
  });
}

export async function persistReplaceElement(selector: string, html: string): Promise<string | null> {
  return persistMutation(($) => {
    $(selector).replaceWith(html);
  });
}

export async function persistInsertElement(
  parentSelector: string,
  html: string,
  position: "before" | "after" | "append" | "prepend"
): Promise<string | null> {
  return persistMutation(($) => {
    const target = $(parentSelector);
    if (position === "before") target.before(html);
    else if (position === "after") target.after(html);
    else if (position === "prepend") target.prepend(html);
    else target.append(html);
  });
}

export async function persistRemoveElement(selector: string): Promise<string | null> {
  return persistMutation(($) => {
    $(selector).remove();
  });
}

export async function persistUndo(selector: string, beforeHtml: string): Promise<string | null> {
  return persistMutation(($) => {
    $(selector).replaceWith(beforeHtml);
  });
}
