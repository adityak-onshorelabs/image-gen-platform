import "server-only";
import { GlobalFonts } from "@napi-rs/canvas";
import { join, basename } from "node:path";
import { existsSync } from "node:fs";
import { listFonts } from "@/lib/data/fonts";
import { STORAGE_ROOT } from "@/lib/storage";

const registered = new Set<string>();

/**
 * Register all uploaded fonts with the canvas engine. Idempotent.
 * Each font is registered under its `name` so multiple weights share a family.
 * Returns the set of available family names.
 */
export async function registerAllFonts(): Promise<string[]> {
  const fonts = await listFonts();
  for (const f of fonts) {
    const file = basename(f.fileUrl); // /api/files/fonts/<file>
    const abs = join(STORAGE_ROOT, "fonts", file);
    if (registered.has(abs) || !existsSync(abs)) continue;
    try {
      GlobalFonts.registerFromPath(abs, f.name);
      registered.add(abs);
    } catch {
      // skip unreadable font file
    }
  }
  return [...new Set(fonts.map((f) => f.name))];
}

/** Register a single font file immediately (on upload). */
export function registerFontFile(absPath: string, family: string): void {
  if (registered.has(absPath)) return;
  try {
    GlobalFonts.registerFromPath(absPath, family);
    registered.add(absPath);
  } catch {
    // ignore
  }
}
