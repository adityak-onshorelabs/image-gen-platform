import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/data/projects";
import { getTemplate } from "@/lib/data/templates";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { deleteTemplateAction } from "@/app/(admin)/projects/actions";

export const dynamic = "force-dynamic";

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ slug: string; tslug: string }>;
}) {
  const { slug, tslug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const template = await getTemplate(project.id, tslug);
  if (!template) notFound();

  return (
    <div className="p-8">
      <Link
        href={`/projects/${slug}`}
        className="mb-4 inline-block text-sm text-neutral-500 hover:text-neutral-300"
      >
        ← {project.name}
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <p className="text-sm text-neutral-400">
            {template.width}×{template.height} · {template.outputFormat.toUpperCase()} · v
            {template.version}
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            API: {project.slug} / {template.slug}
          </p>
        </div>
        <form action={deleteTemplateAction}>
          <input type="hidden" name="id" value={template.id} />
          <input type="hidden" name="projectSlug" value={slug} />
          <ConfirmSubmit
            message="Delete this template and its layers?"
            className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 transition hover:bg-red-950"
          >
            Delete
          </ConfirmSubmit>
        </form>
      </div>

      <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center text-neutral-500">
        Template editor — base image upload &amp; visual layer placement land in
        Milestone 4.
      </div>
    </div>
  );
}
