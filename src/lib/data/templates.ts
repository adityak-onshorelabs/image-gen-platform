import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { templates } from "@/db/schema";
import { slugify, uniqueSlug } from "@/lib/slug";

export async function listTemplates(projectId: string) {
  return db
    .select()
    .from(templates)
    .where(eq(templates.projectId, projectId))
    .orderBy(desc(templates.updatedAt));
}

export async function getTemplate(projectId: string, slug: string) {
  const [row] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.projectId, projectId), eq(templates.slug, slug)))
    .limit(1);
  return row ?? null;
}

async function freeTemplateSlug(projectId: string, name: string): Promise<string> {
  const rows = await db
    .select({ slug: templates.slug })
    .from(templates)
    .where(eq(templates.projectId, projectId));
  return uniqueSlug(slugify(name), new Set(rows.map((r) => r.slug)));
}

export async function createTemplate(input: {
  projectId: string;
  name: string;
  width: number;
  height: number;
}) {
  const slug = await freeTemplateSlug(input.projectId, input.name);
  const [row] = await db
    .insert(templates)
    .values({
      projectId: input.projectId,
      name: input.name,
      slug,
      width: input.width,
      height: input.height,
    })
    .returning();
  return row;
}

export async function updateTemplateMeta(
  id: string,
  data: { name?: string; width?: number; height?: number }
) {
  const [row] = await db
    .update(templates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(templates.id, id))
    .returning();
  return row;
}

export async function deleteTemplate(id: string) {
  await db.delete(templates).where(eq(templates.id, id)); // cascades to layers
}
