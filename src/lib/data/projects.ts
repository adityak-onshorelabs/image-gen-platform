import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { slugify, uniqueSlug } from "@/lib/slug";

export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};
export type ProjectWithCount = Project & { templateCount: number };

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

function toProject(r: ProjectRow): Project {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listProjects(): Promise<ProjectWithCount[]> {
  const sb = supabaseAdmin();
  const [{ data: projs, error: pErr }, { data: tpls, error: tErr }] =
    await Promise.all([
      sb.from("projects").select("*").order("updated_at", { ascending: false }),
      sb.from("templates").select("project_id"),
    ]);
  if (pErr) throw pErr;
  if (tErr) throw tErr;

  const counts = new Map<string, number>();
  for (const t of (tpls ?? []) as { project_id: string }[]) {
    counts.set(t.project_id, (counts.get(t.project_id) ?? 0) + 1);
  }
  return ((projs ?? []) as ProjectRow[]).map((r) => ({
    ...toProject(r),
    templateCount: counts.get(r.id) ?? 0,
  }));
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toProject(data as ProjectRow) : null;
}

async function freeProjectSlug(name: string): Promise<string> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("projects").select("slug");
  if (error) throw error;
  return uniqueSlug(
    slugify(name),
    new Set((data ?? []).map((r: { slug: string }) => r.slug))
  );
}

export async function createProject(
  name: string,
  description: string | null
): Promise<Project> {
  const sb = supabaseAdmin();
  const slug = await freeProjectSlug(name);
  const { data, error } = await sb
    .from("projects")
    .insert({ name, slug, description })
    .select("*")
    .single();
  if (error) throw error;
  return toProject(data as ProjectRow);
}

export async function updateProject(
  id: string,
  name: string,
  description: string | null
): Promise<Project> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("projects")
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return toProject(data as ProjectRow);
}

export async function deleteProject(id: string): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb.from("projects").delete().eq("id", id); // cascades
  if (error) throw error;
}
