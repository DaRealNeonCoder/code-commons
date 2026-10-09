import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listProjects } from "@/lib/creatorProjects";
import { getType } from "@/lib/creatorTypes";
import DeleteProjectButton from "@/components/creator/DeleteProjectButton";
import PublishBadge from "@/components/creator/PublishBadge";
import { getPublishedForProjects } from "@/lib/publishedStatus";
function timeAgo(iso) {
const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));

if (seconds < 60) return "just now";

const days = Math.floor(seconds / 86400);
if (days >= 30) {
return new Date(iso).toLocaleDateString("en-US", {
month: "short",
day: "numeric",
year: "numeric",
});
}

const units = [
["day", 86400],
["hour", 3600],
["minute", 60],
];

for (const [name, size] of units) {
if (seconds >= size) {
const n = Math.floor(seconds / size);
return n + " " + name + (n === 1 ? "" : "s") + " ago";
}
}

return "just now";
}


const newButtonClass =
  "inline-block rounded-md bg-violet-600 px-5 py-2.5 font-mono text-sm font-medium text-white transition-colors hover:bg-violet-700";

export default async function CreateDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/");

  const projects = (await listProjects(user.id)).filter((p) => getType(p.type));
  const published = await getPublishedForProjects(projects);

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-sm text-violet-600 dark:text-violet-400">/create</p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Your projects</h1>
          {projects.length > 0 && (
            <Link href="/create/new" className={newButtonClass}>
              $ new project
            </Link>
          )}
        </div>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">Pick up where you left off, or start something new.</p>

        {projects.length === 0 ? (
          <div className="mt-8 rounded-md border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <p className="text-zinc-600 dark:text-zinc-400">You haven&apos;t started anything yet.</p>
            <Link href="/create/new" className={`mt-4 ${newButtonClass}`}>
              $ new project
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {projects.map((p) => {
              const type = getType(p.type);
              const title = p.title.trim() || "Untitled";
              return (
                <li
                  key={p.id}
                  className={`flex items-stretch rounded-md border border-zinc-200 transition-colors dark:border-zinc-800 ${type.hoverBorder}`}
                >
                  <Link href={`/create/${p.type}/${p.id}`} className="min-w-0 flex-1 p-4">
                    <span className={`inline-block rounded border px-2 py-0.5 font-mono text-xs ${type.badge}`}>
                      {type.label.toLowerCase()}
                    </span>
                    <h2 className="mt-2 truncate text-lg font-semibold">{title}</h2>
                    <p className="mt-1">
                      <PublishBadge state={published[p.id]?.state ?? "draft"} />
                    </p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">edited {timeAgo(p.updatedAt)}</p>
                  </Link>
                  <div className="flex items-center pr-3">
                    <DeleteProjectButton id={p.id} title={title} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
