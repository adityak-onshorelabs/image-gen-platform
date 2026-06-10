import "server-only";
import { GlobalFonts } from "@napi-rs/canvas";
import { join, basename } from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { listFonts } from "@/lib/data/fonts";
import { STORAGE_ROOT } from "@/lib/storage";

// Fonts now live in Supabase Storage (public URLs). We download each face into
// a Buffer and register it with skia (registerFromPath needs a local file, which
// doesn't exist on serverless). Keyed by URL so each is registered once per
// process. Legacy `/api/files/...` rows still resolve from local disk in dev.
const registered = new Set<string>();

async function fetchFontBuffer(fileUrl: string): Promise<Buffer | null> {
  if (/^https?:\/\//i.test(fileUrl)) {
    const res = await fetch(fileUrl);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  // legacy local path (/api/files/fonts/<file>)
  const abs = join(STORAGE_ROOT, "fonts", basename(fileUrl));
  if (!existsSync(abs)) return null;
  return readFile(abs);
}

/**
 * Register all uploaded fonts with the canvas engine. Idempotent.
 * Each font registers under its `name` so multiple weights share a family.
 * Returns the set of available family names.
 */
export async function registerAllFonts(): Promise<string[]> {
  const fonts = await listFonts();
  await Promise.all(
    fonts.map(async (f) => {
      if (registered.has(f.fileUrl)) return;
      try {
        const buf = await fetchFontBuffer(f.fileUrl);
        if (buf) {
          GlobalFonts.register(buf, f.name);
          registered.add(f.fileUrl);
        }
      } catch {
        // skip unreadable font
      }
    })
  );
  return [...new Set(fonts.map((f) => f.name))];
}

/** Register a single font from an in-memory buffer immediately (on upload). */
export function registerFontBuffer(buf: Buffer, family: string, key: string): void {
  if (registered.has(key)) return;
  try {
    GlobalFonts.register(buf, family);
    registered.add(key);
  } catch {
    // ignore
  }
}
