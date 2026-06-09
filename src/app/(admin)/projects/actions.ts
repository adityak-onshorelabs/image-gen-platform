"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createProject,
  deleteProject,
  getProjectBySlug,
  updateProject,
} from "@/lib/data/projects";
import { createTemplate, deleteTemplate } from "@/lib/data/templates";

// ---- Projects ----

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) return;
  const project = await createProject(name, description);
  revalidatePath("/projects");
  redirect(`/projects/${project.slug}`);
}

export async function updateProjectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!id || !name) return;
  await updateProject(id, name, description);
  revalidatePath("/projects");
}

export async function deleteProjectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteProject(id);
  revalidatePath("/projects");
  redirect("/projects");
}

// ---- Templates ----

export async function createTemplateAction(formData: FormData) {
  const projectSlug = String(formData.get("projectSlug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const width = Number(formData.get("width"));
  const height = Number(formData.get("height"));
  if (!projectSlug || !name || !width || !height) return;

  const project = await getProjectBySlug(projectSlug);
  if (!project) return;

  const tpl = await createTemplate({ projectId: project.id, name, width, height });
  revalidatePath(`/projects/${projectSlug}`);
  redirect(`/projects/${projectSlug}/templates/${tpl.slug}`);
}

export async function deleteTemplateAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const projectSlug = String(formData.get("projectSlug") ?? "");
  if (!id) return;
  await deleteTemplate(id);
  revalidatePath(`/projects/${projectSlug}`);
  redirect(`/projects/${projectSlug}`);
}
