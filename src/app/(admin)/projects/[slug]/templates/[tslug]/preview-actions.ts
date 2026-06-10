"use server";

import { getSession } from "@/lib/auth";
import { getTemplateById } from "@/lib/data/templates";
import { renderPreview } from "@/lib/render/service";
import { RenderError } from "@/lib/render/engine";
import type { Layer } from "@/lib/layer-types";

export type PreviewResult =
  | { ok: true; dataUri: string; durationMs: number }
  | { ok: false; error: string };

/**
 * M6 preview: render the editor's CURRENT (possibly unsaved) layer state
 * in-memory with caller-supplied values. Session-guarded; no asset persisted.
 */
export async function previewAction(
  templateId: string,
  layers: Layer[],
  values: Record<string, string>
): Promise<PreviewResult> {
  if (!(await getSession())) return { ok: false, error: "Not authenticated." };

  const template = await getTemplateById(templateId);
  if (!template) return { ok: false, error: "Template not found." };

  try {
    const { dataUri, durationMs } = await renderPreview({ template, layers, values });
    return { ok: true, dataUri, durationMs };
  } catch (e) {
    if (e instanceof Error && e.message === "RATE_LIMITED") {
      return { ok: false, error: "Render busy — try again." };
    }
    if (e instanceof RenderError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "Preview failed." };
  }
}
