import Link from "next/link";
import { listRecentRenders } from "@/lib/data/generated";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { deleteRenderAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const renders = await listRecentRenders(120);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Assets</h1>
        <p className="text-sm text-neutral-400">
          Images produced by the render API and previews. Newest first.
        </p>
      </div>

      {renders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center text-neutral-500">
          No renders yet. Hit <code className="text-neutral-300">POST /api/render</code> or
          generate a preview in the editor.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {renders.map((r) => (
            <div
              key={r.id}
              className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950"
            >
              <a href={r.imageUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.imageUrl}
                  alt={r.templateName}
                  className="aspect-square w-full bg-neutral-900 object-contain"
                />
              </a>
              <div className="space-y-1 p-3">
                <div className="truncate text-sm font-medium text-neutral-200">
                  {r.projectSlug && r.templateSlug ? (
                    <Link
                      href={`/projects/${r.projectSlug}/templates/${r.templateSlug}`}
                      className="hover:text-sky-400"
                    >
                      {r.templateName}
                    </Link>
                  ) : (
                    r.templateName
                  )}
                </div>
                <div className="flex flex-wrap gap-x-2 text-xs text-neutral-500">
                  <span className="uppercase">{r.format}</span>
                  <span>v{r.templateVersion}</span>
                  {r.durationMs != null && <span>{r.durationMs}ms</span>}
                  {r.cached && <span className="text-emerald-500">cached</span>}
                </div>
                <div className="text-xs text-neutral-600">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <a
                    href={r.imageUrl}
                    download
                    className="text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    Download
                  </a>
                  <form action={deleteRenderAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmSubmit
                      message="Delete this render?"
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </ConfirmSubmit>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
