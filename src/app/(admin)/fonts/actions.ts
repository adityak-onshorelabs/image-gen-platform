"use server";

import { revalidatePath } from "next/cache";
import { createFont, deleteFont, listFonts } from "@/lib/data/fonts";
import { saveFile, deleteFile } from "@/lib/storage";
import { registerFontBuffer } from "@/lib/render/fonts";
import { fetchGoogleFont, GoogleFontError } from "@/lib/fonts/google";
import { slugify } from "@/lib/slug";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXT = [".ttf", ".otf", ".woff2"];

export type FontUploadState = { error?: string; ok?: boolean };

export async function uploadFontAction(
  _prev: FontUploadState,
  formData: FormData
): Promise<FontUploadState> {
  const name = String(formData.get("name") ?? "").trim();
  const weight = Number(formData.get("weight") ?? 400);
  const style = String(formData.get("style") ?? "normal");
  const file = formData.get("file");

  if (!name) return { error: "Font family name required." };
  if (!(file instanceof File) || file.size === 0)
    return { error: "No file selected." };
  if (file.size > MAX_BYTES) return { error: "File too large (max 5 MB)." };

  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  if (!ALLOWED_EXT.includes(ext))
    return { error: "Unsupported format. Use TTF, OTF, or WOFF2." };

  const filename = `${slugify(name)}-${weight}-${style}${ext}`;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const url = await saveFile("fonts", filename, buf);
    await createFont({ name, weight, style, fileUrl: url });
    registerFontBuffer(buf, name, url);
  } catch {
    return { error: "Could not save font." };
  }

  revalidatePath("/fonts");
  return { ok: true };
}

export type GoogleFontState = { error?: string; ok?: string };

/** Pull one or more weights of a Google Font into local storage + register. */
export async function addGoogleFontAction(
  _prev: GoogleFontState,
  formData: FormData
): Promise<GoogleFontState> {
  const family = String(formData.get("family") ?? "").trim();
  const italic = String(formData.get("style") ?? "normal") === "italic";
  const weights = formData
    .getAll("weights")
    .map((w) => Number(w))
    .filter((w) => Number.isFinite(w) && w >= 100 && w <= 900);

  if (!family) return { error: "Font family name required." };
  if (weights.length === 0) return { error: "Pick at least one weight." };

  const existing = await listFonts();
  const style = italic ? "italic" : "normal";
  let added = 0;

  try {
    for (const weight of weights) {
      const dup = existing.some(
        (f) =>
          f.name.toLowerCase() === family.toLowerCase() &&
          f.weight === weight &&
          f.style === style
      );
      if (dup) continue;

      const { buffer, ext } = await fetchGoogleFont(family, weight, italic);
      const filename = `${slugify(family)}-${weight}-${style}.${ext}`;
      const url = await saveFile("fonts", filename, buffer);
      await createFont({ name: family, weight, style, fileUrl: url });
      registerFontBuffer(buffer, family, url);
      added++;
    }
  } catch (e) {
    if (e instanceof GoogleFontError) return { error: e.message };
    return { error: "Could not add Google Font." };
  }

  revalidatePath("/fonts");
  return {
    ok:
      added === 0
        ? `${family} ${style} already present for those weights.`
        : `Added ${family} (${added} weight${added > 1 ? "s" : ""}).`,
  };
}

export async function deleteFontAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const removed = await deleteFont(id);
  if (removed) {
    const filename = removed.fileUrl.split("/").pop();
    if (filename) await deleteFile("fonts", filename);
  }
  revalidatePath("/fonts");
}
