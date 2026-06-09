import Link from "next/link";
import { listProjects } from "@/lib/data/projects";
import { NewProjectButton } from "@/components/NewProjectButton";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-neutral-400">
            Organize templates by product, brand, or client.
          </p>
        </div>
        <NewProjectButton />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center text-neutral-500">
          No projects yet. Create your first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.slug}`}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-700"
            >
              <div className="mb-1 font-semibold">{p.name}</div>
              <div className="mb-4 line-clamp-2 text-sm text-neutral-400">
                {p.description || "—"}
              </div>
              <div className="flex justify-between text-xs text-neutral-500">
                <span>{p.templateCount} templates</span>
                <span>Updated {fmtDate(p.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
