import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/data/projects";
import { listTemplates } from "@/lib/data/templates";
import { NewTemplateButton } from "@/components/NewTemplateButton";
import { ProjectSettingsButton } from "@/components/ProjectSettingsButton";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const templates = await listTemplates(project.id);

  return (
    <div className="p-8">
      <Link
        href="/projects"
        className="mb-4 inline-block text-sm text-neutral-500 hover:text-neutral-300"
      >
        ← Projects
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-neutral-400">{project.description || "—"}</p>
          <p className="mt-1 text-xs text-neutral-600">/{project.slug}</p>
        </div>
        <div className="flex gap-2">
          <ProjectSettingsButton
            id={project.id}
            name={project.name}
            description={project.description}
          />
          <NewTemplateButton projectSlug={project.slug} />
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center text-neutral-500">
          No templates yet. Create one from a preset.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/projects/${project.slug}/templates/${t.slug}`}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-700"
            >
              <div className="mb-1 font-semibold">{t.name}</div>
              <div className="text-sm text-neutral-400">
                {t.width}×{t.height}
              </div>
              <div className="mt-3 text-xs text-neutral-600">
                {t.baseImageUrl ? "Base uploaded" : "No base image"} · v{t.version}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
