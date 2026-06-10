"use server";

import { getSession } from "@/lib/auth";
import { listFonts, createFont } from "@/lib/data/fonts";
import { saveFile } from "@/lib/storage";
import { registerFontBuffer } from "@/lib/render/fonts";
import { fetchGoogleFont, GoogleFontError } from "@/lib/fonts/google";
import { slugify } from "@/lib/slug";

export type FontDef = { name: string; weight: number; style: string; fileUrl: string };
export type AddFontResult =
  | { ok: true; font: FontDef }
  | { ok: false; error: string };

/**
 * Add a single Google Font variant from inside the editor (for the current
 * layer's weight/style), register it, and return its def so the editor can
 * inject the @font-face + select it immediately.
 */
export async function addEditorGoogleFont(
  family: string,
  weight: number,
  italic: boolean
): Promise<AddFontResult> {
  if (!(await getSession())) return { ok: false, error: "Not authenticated." };

  const fam = family.trim();
  if (!fam) return { ok: false, error: "Family required." };
  const w = Number.isFinite(weight) ? weight : 400;
  const style = italic ? "italic" : "normal";

  try {
    // reuse an already-stored variant if present
    const existing = await listFonts();
    const dup = existing.find(
      (f) =>
        f.name.toLowerCase() === fam.toLowerCase() &&
        f.weight === w &&
        f.style === style
    );
    if (dup) {
      return {
        ok: true,
        font: { name: dup.name, weight: dup.weight, style: dup.style, fileUrl: dup.fileUrl },
      };
    }

    const { buffer, ext } = await fetchGoogleFont(fam, w, italic);
    const filename = `${slugify(fam)}-${w}-${style}.${ext}`;
    const fileUrl = await saveFile("fonts", filename, buffer);
    await createFont({ name: fam, weight: w, style, fileUrl });
    registerFontBuffer(buffer, fam, fileUrl);

    return { ok: true, font: { name: fam, weight: w, style, fileUrl } };
  } catch (e) {
    if (e instanceof GoogleFontError) return { ok: false, error: e.message };
    return { ok: false, error: "Could not add font." };
  }
}
