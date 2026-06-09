import Link from "next/link";
import { listProjects } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await listProjects();
  const templateTotal = projects.reduce((n, p) => n + p.templateCount, 0);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-3xl font-bold">{projects.length}</div>
          <div className="text-sm text-neutral-400">Projects</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-3xl font-bold">{templateTotal}</div>
          <div className="text-sm text-neutral-400">Templates</div>
        </div>
      </div>

      <Link
        href="/projects"
        className="text-sm text-sky-400 hover:text-sky-300"
      >
        Go to Projects →
      </Link>
    </div>
  );
}
