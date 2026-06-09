"use server";

import { revalidatePath } from "next/cache";
import { join } from "node:path";
import { createFont, deleteFont } from "@/lib/data/fonts";
import { saveFile, deleteFile, STORAGE_ROOT } from "@/lib/storage";
import { registerFontFile } from "@/lib/render/fonts";
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
    registerFontFile(join(STORAGE_ROOT, "fonts", filename), name);
  } catch {
    return { error: "Could not save font." };
  }

  revalidatePath("/fonts");
  return { ok: true };
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
