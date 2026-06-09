import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { slugify, uniqueSlug } from "@/lib/slug";

export type Template = {
  id: string;
  projectId: string;
  name: string;
  slug: string;
  width: number;
  height: number;
  baseImageUrl: string | null;
  outputFormat: string;
  defaultQuality: string;
  dpi: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type TemplateRow = {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  width: number;
  height: number;
  base_image_url: string | null;
  output_format: string;
  default_quality: string;
  dpi: number;
  version: number;
  created_at: string;
  updated_at: string;
};

function toTemplate(r: TemplateRow): Template {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    slug: r.slug,
    width: r.width,
    height: r.height,
    baseImageUrl: r.base_image_url,
    outputFormat: r.output_format,
    defaultQuality: r.default_quality,
    dpi: r.dpi,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listTemplates(projectId: string): Promise<Template[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("templates")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as TemplateRow[]).map(toTemplate);
}

export async function getTemplate(
  projectId: string,
  slug: string
): Promise<Template | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("templates")
    .select("*")
    .eq("project_id", projectId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toTemplate(data as TemplateRow) : null;
}

async function freeTemplateSlug(
  projectId: string,
  name: string
): Promise<string> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("templates")
    .select("slug")
    .eq("project_id", projectId);
  if (error) throw error;
  return uniqueSlug(
    slugify(name),
    new Set((data ?? []).map((r: { slug: string }) => r.slug))
  );
}

export async function createTemplate(input: {
  projectId: string;
  name: string;
  width: number;
  height: number;
}): Promise<Template> {
  const sb = supabaseAdmin();
  const slug = await freeTemplateSlug(input.projectId, input.name);
  const { data, error } = await sb
    .from("templates")
    .insert({
      project_id: input.projectId,
      name: input.name,
      slug,
      width: input.width,
      height: input.height,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toTemplate(data as TemplateRow);
}

export async function updateTemplateMeta(
  id: string,
  data: { name?: string; width?: number; height?: number }
): Promise<Template> {
  const sb = supabaseAdmin();
  const { data: row, error } = await sb
    .from("templates")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return toTemplate(row as TemplateRow);
}

export async function deleteTemplate(id: string): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb.from("templates").delete().eq("id", id); // cascades
  if (error) throw error;
}
