import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllPuzzles } from "@/lib/puzzles";
import { getCompletedIds } from "@/lib/progress";
import { loadTaxonomy, expandTaxonomy, labelFor } from "@/lib/taxonomy";

const OTHER_AREA = "__other"; // puzzles with no area at all
const puzzleHref = (id) => `/puzzles/${id}`;

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/");

  const taxonomy = loadTaxonomy();
  const completedIds = new Set(getCompletedIds(user.id, "puzzle"));

  // "Coming soon" puzzles aren't playable, so they don't count toward the total.
  const puzzles = getAllPuzzles().filter((p) => p.available);
  const solved = puzzles.filter((p) => completedIds.has(p.id));
  const pct = puzzles.length ? Math.round((solved.length / puzzles.length) * 100) : 0;

  const difficulties = taxonomy.difficulties;
  const difficultyRank = (id) => {
    const i = difficulties.findIndex((d) => d.id === id);
    return i === -1 ? difficulties.length : i;
  };
  const countAt = (list, id) => list.filter((p) => p.difficulty === id).length;

  // Group solved puzzles by effective area. A puzzle in several areas appears
  // under each one, but only counts once in the total above.
  const groups = new Map();
  for (const p of solved) {
    const { effectiveAreas, effectiveTopics } = expandTaxonomy(p, taxonomy);
    const entry = {
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      topicLabels: effectiveTopics.map((id) => labelFor(taxonomy.topics, id)),
    };
    for (const areaId of effectiveAreas.length ? effectiveAreas : [OTHER_AREA]) {
      if (!groups.has(areaId)) groups.set(areaId, []);
      groups.get(areaId).push(entry);
    }
  }
  for (const list of groups.values()) {
    list.sort(
      (a, b) =>
        difficultyRank(a.difficulty) - difficultyRank(b.difficulty) ||
        a.title.localeCompare(b.title)
    );
  }
  const orderedAreaIds = [...taxonomy.areas.map((a) => a.id), OTHER_AREA].filter((id) =>
    groups.has(id)
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="font-mono text-sm text-zinc-500">
          <span className="text-teal-400">~/</span>profile
        </p>
        <h1 className="mt-1 font-mono text-2xl text-white">{user.name || user.email}</h1>

        {/* Summary */}
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-4xl text-white">
              {solved.length}
              <span className="text-lg text-zinc-500"> / {puzzles.length}</span>
            </p>
            <p className="font-mono text-sm text-zinc-400">puzzles solved</p>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-teal-400" style={{ width: `${pct}%` }} />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {difficulties.map((d) => (
              <div
                key={d.id}
                className="min-w-24 flex-1 rounded border border-zinc-800 bg-zinc-950 p-3"
              >
                <p className="font-mono text-xs text-zinc-500">{d.label}</p>
                <p className="font-mono text-lg text-white">
                  {countAt(solved, d.id)}
                  <span className="text-sm text-zinc-500"> / {countAt(puzzles, d.id)}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Solved list, grouped by area */}
        <section className="mt-8 space-y-3">
          {orderedAreaIds.length === 0 ? (
            <p className="font-mono text-sm text-zinc-500">
              No puzzles solved yet.{" "}
              <Link href="/puzzles" className="text-teal-400 hover:underline">
                Go solve one →
              </Link>
            </p>
          ) : (
            orderedAreaIds.map((areaId) => {
              const list = groups.get(areaId);
              const areaLabel =
                areaId === OTHER_AREA ? "Other" : labelFor(taxonomy.areas, areaId);
              return (
                <details
                  key={areaId}
                  open
                  className="group rounded-lg border border-zinc-800 bg-zinc-900"
                >
                  <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 font-mono text-sm text-zinc-100">
                    <span>{areaLabel}</span>
                    <span className="text-zinc-500">
                      {list.length} solved
                      <span className="ml-2 inline-block transition-transform group-open:rotate-90">
                        ›
                      </span>
                    </span>
                  </summary>

                  <ul className="divide-y divide-zinc-800 border-t border-zinc-800">
                    {list.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={puzzleHref(p.id)}
                          className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-800/50"
                        >
                          <span className="text-sm text-zinc-100">{p.title}</span>
                          <span className="flex shrink-0 items-center gap-3">
                            {p.topicLabels.length > 0 && (
                              <span className="font-mono text-xs text-zinc-500">
                                {p.topicLabels.slice(0, 3).join(", ")}
                                {p.topicLabels.length > 3 ? ` +${p.topicLabels.length - 3}` : ""}
                              </span>
                            )}
                            <span className="rounded border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 font-mono text-xs text-teal-400">
                              {labelFor(difficulties, p.difficulty)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}