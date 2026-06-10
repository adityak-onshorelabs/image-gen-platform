import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/data/projects";
import { getTemplate } from "@/lib/data/templates";
import { listLayers } from "@/lib/data/layers";
import { listFonts } from "@/lib/data/fonts";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CopyId } from "@/components/CopyId";
import { BaseImageUpload } from "@/components/BaseImageUpload";
import { TemplateEditor } from "@/components/editor/TemplateEditor";
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

  const [layers, fonts] = await Promise.all([
    listLayers(template.id),
    listFonts(),
  ]);

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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CopyId label="Template ID" id={template.id} full />
            <CopyId label="Project ID" id={project.id} />
          </div>
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

      <section className="mb-6">
        <BaseImageUpload
          templateId={template.id}
          projectSlug={slug}
          tslug={tslug}
          width={template.width}
          height={template.height}
          baseImageUrl={template.baseImageUrl}
          version={template.version}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Layers
        </h2>
        <TemplateEditor
          templateId={template.id}
          projectSlug={slug}
          tslug={tslug}
          width={template.width}
          height={template.height}
          baseImageUrl={template.baseImageUrl}
          version={template.version}
          initialLayers={layers}
          fonts={fonts.map((f) => ({
            name: f.name,
            weight: f.weight,
            style: f.style,
            fileUrl: f.fileUrl,
          }))}
        />
      </section>
    </div>
  );
}
