"use server";

import { revalidatePath } from "next/cache";
import { saveLayers } from "@/lib/data/layers";
import type { Layer } from "@/lib/layer-types";

export type SaveLayersResult = { ok: boolean; error?: string };

export async function saveLayersAction(
  templateId: string,
  projectSlug: string,
  tslug: string,
  layers: Layer[]
): Promise<SaveLayersResult> {
  // validate unique, non-empty, normalized names
  const names = new Set<string>();
  for (const l of layers) {
    if (!l.name) return { ok: false, error: "Every layer needs a name." };
    if (names.has(l.name))
      return { ok: false, error: `Duplicate layer name: "${l.name}".` };
    names.add(l.name);
  }

  try {
    await saveLayers(templateId, layers);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed." };
  }
  revalidatePath(`/projects/${projectSlug}/templates/${tslug}`);
  return { ok: true };
}
