import Link from "next/link";
import { getType } from "@/lib/creatorTypes";

function projectHref(project) {
  return project.publication?.href || `/create/${project.type}/${project.id}`;
}

export default function ProfileProjects({ projects, own = false }) {
  return (
    <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <h2 className="font-mono text-sm text-zinc-100">{own ? "Your projects" : "Projects"}</h2>
        <span className="font-mono text-xs text-zinc-500">{projects.length} project{projects.length === 1 ? "" : "s"}</span>
      </div>
      {projects.length === 0 ? (
        <p className="border-t border-zinc-800 px-4 py-4 text-sm text-zinc-500">{own ? "You have not created a project yet." : "No projects to show yet."}</p>
      ) : (
        <ul className="divide-y divide-zinc-800 border-t border-zinc-800">
          {projects.map((project) => {
            const type = getType(project.type);
            const published = Boolean(project.publication);
            return (
              <li key={project.id}>
                <Link href={projectHref(project)} className="block px-4 py-3 transition-colors hover:bg-zinc-800/50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm text-zinc-100">{project.title}</span>
                    <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] ${type?.badge || "border-zinc-700 text-zinc-400"}`}>
                      {type?.label || project.type}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-zinc-500">
                    <span>{published ? "published" : "draft"}</span>
                    {project.rating && <span>★ {project.rating.likes} like{project.rating.likes === 1 ? "" : "s"}</span>}
                    {project.publication?.state === "edited" && <span className="text-amber-400">edited since publish</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
