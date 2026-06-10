"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { deleteRender, listRecentRenders } from "@/lib/data/generated";
import { deleteFile } from "@/lib/storage";

export async function deleteRenderAction(formData: FormData) {
  if (!(await getSession())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // best-effort remove the file too (url shape: /api/files/generated/<file>)
  const all = await listRecentRenders(500);
  const row = all.find((r) => r.id === id);
  if (row) {
    const file = row.imageUrl.split("/").pop();
    if (file) await deleteFile("generated", file);
  }
  await deleteRender(id);
  revalidatePath("/assets");
}
