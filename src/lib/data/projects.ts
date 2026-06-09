import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, templates } from "@/db/schema";
import { slugify, uniqueSlug } from "@/lib/slug";

export async function listProjects() {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      templateCount: sql<number>`count(${templates.id})::int`,
    })
    .from(projects)
    .leftJoin(templates, eq(templates.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  return row ?? null;
}

async function freeProjectSlug(name: string): Promise<string> {
  const rows = await db.select({ slug: projects.slug }).from(projects);
  return uniqueSlug(slugify(name), new Set(rows.map((r) => r.slug)));
}

export async function createProject(name: string, description: string | null) {
  const slug = await freeProjectSlug(name);
  const [row] = await db
    .insert(projects)
    .values({ name, slug, description })
    .returning();
  return row;
}

export async function updateProject(
  id: string,
  name: string,
  description: string | null
) {
  const [row] = await db
    .update(projects)
    .set({ name, description, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  return row;
}

export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id)); // cascades to templates/layers
}
