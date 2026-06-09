"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { getTemplateById, setBaseImage } from "@/lib/data/templates";
import { saveFile } from "@/lib/storage";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

export type UploadState = { error?: string; ok?: boolean };

export async function uploadBaseImageAction(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  const templateId = String(formData.get("templateId") ?? "");
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const tslug = String(formData.get("tslug") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0)
    return { error: "No file selected." };
  if (!ALLOWED.includes(file.type))
    return { error: "Unsupported format. Use PNG, JPEG, or WEBP." };
  if (file.size > MAX_BYTES)
    return { error: "File too large (max 15 MB)." };

  const template = await getTemplateById(templateId);
  if (!template) return { error: "Template not found." };

  try {
    const input = Buffer.from(await file.arrayBuffer());
    // Normalize to PNG at exact template dimensions (cover) so the editor
    // canvas always matches the rendered output.
    const png = await sharp(input)
      .resize(template.width, template.height, { fit: "cover" })
      .png()
      .toBuffer();

    const url = await saveFile("templates", `${templateId}.png`, png);
    await setBaseImage(templateId, url, template.version);
  } catch {
    return { error: "Could not process image. Is it a valid image file?" };
  }

  revalidatePath(`/projects/${projectSlug}/templates/${tslug}`);
  return { ok: true };
}
