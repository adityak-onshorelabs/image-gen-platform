import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type GeneratedImage = {
  id: string;
  templateId: string;
  templateVersion: number;
  imageUrl: string;
  renderPayload: Record<string, unknown> | null;
  payloadHash: string | null;
  format: string;
  durationMs: number | null;
  cached: boolean;
  createdAt: string;
};

type GeneratedRow = {
  id: string;
  template_id: string;
  template_version: number;
  image_url: string;
  render_payload: Record<string, unknown> | null;
  payload_hash: string | null;
  format: string;
  duration_ms: number | null;
  cached: boolean;
  created_at: string;
};

function toGenerated(r: GeneratedRow): GeneratedImage {
  return {
    id: r.id,
    templateId: r.template_id,
    templateVersion: r.template_version,
    imageUrl: r.image_url,
    renderPayload: r.render_payload,
    payloadHash: r.payload_hash,
    format: r.format,
    durationMs: r.duration_ms,
    cached: r.cached,
    createdAt: r.created_at,
  };
}

/** Cache lookup: most recent render with matching (template, version, hash). */
export async function findCachedRender(
  templateId: string,
  templateVersion: number,
  payloadHash: string
): Promise<GeneratedImage | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("generated_images")
    .select("*")
    .eq("template_id", templateId)
    .eq("template_version", templateVersion)
    .eq("payload_hash", payloadHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toGenerated(data as GeneratedRow) : null;
}

export async function recordRender(input: {
  templateId: string;
  templateVersion: number;
  imageUrl: string;
  renderPayload: Record<string, unknown> | null;
  payloadHash: string | null;
  format: string;
  durationMs: number;
}): Promise<GeneratedImage> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("generated_images")
    .insert({
      template_id: input.templateId,
      template_version: input.templateVersion,
      image_url: input.imageUrl,
      render_payload: input.renderPayload,
      payload_hash: input.payloadHash,
      format: input.format,
      duration_ms: input.durationMs,
      cached: false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toGenerated(data as GeneratedRow);
}

export type GeneratedWithTemplate = GeneratedImage & {
  templateName: string;
  templateSlug: string;
  projectSlug: string;
};

/** Recent renders across all templates, newest first, joined for display. */
export async function listRecentRenders(limit = 100): Promise<GeneratedWithTemplate[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("generated_images")
    .select(
      "*, templates(name, slug, projects(slug))"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  type Joined = GeneratedRow & {
    templates: {
      name: string;
      slug: string;
      projects: { slug: string } | null;
    } | null;
  };
  return ((data ?? []) as Joined[]).map((r) => ({
    ...toGenerated(r),
    templateName: r.templates?.name ?? "(deleted)",
    templateSlug: r.templates?.slug ?? "",
    projectSlug: r.templates?.projects?.slug ?? "",
  }));
}

export async function deleteRender(id: string): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb.from("generated_images").delete().eq("id", id);
  if (error) throw error;
}
