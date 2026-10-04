import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllPuzzles } from "@/lib/puzzles";
import { getCompletedIds } from "@/lib/progress";
import { loadTaxonomy, expandTaxonomy, labelFor } from "@/lib/taxonomy";
import { getAllCourses } from "@/lib/courses";
import { getCourseOutline } from "@/lib/courseNav";
import { getCourseProgress } from "@/lib/courseProgress";
import { isLessonComplete } from "@/lib/progressUtils";

const OTHER_AREA = "__other"; // puzzles with no area at all
const puzzleHref = (id) => `/puzzles/${id}`;
const courseHref = (id) => `/courses/${id}`; // adjust to wherever your course page lives

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/");

  const taxonomy = loadTaxonomy();
  const completedIds = new Set(await getCompletedIds(user.id, "puzzle"));

  // "Coming soon" puzzles aren't playable, so they don't count toward the total.
  const puzzles = (await getAllPuzzles()).filter((p) => p.available);
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

  // Per-course progress. The bar is course puzzles solved / total available
  // course puzzles. "Completed" uses the same rule as the ✓ on the course page.
  const courseRows = (
    await Promise.all(
      (await getAllCourses()).map(async (course) => {
        const outline = await getCourseOutline(course.id);
        if (!outline) return null;

        const raw = await getCourseProgress(user.id, outline);
        const progress = {
          puzzles: new Set(raw.puzzles),
          lessons: new Set(raw.lessons),
        };

        const lessons = outline.lessons.filter((l) => l.available);
        const availableIdsFor = (l) =>
          l.puzzles.filter((p) => p.available).map((p) => p.id);
        const totalPuzzles = new Set(lessons.flatMap(availableIdsFor)).size;
        const solvedPuzzles = progress.puzzles.size;

        return {
          id: course.id,
          title: outline.title,
          solvedPuzzles,
          totalPuzzles,
          pct: totalPuzzles ? Math.round((solvedPuzzles / totalPuzzles) * 100) : 0,
          started: solvedPuzzles > 0 || progress.lessons.size > 0,
          complete:
            lessons.length > 0 &&
            lessons.every((l) =>
              isLessonComplete(progress, l.id, availableIdsFor(l))
            ),
        };
      })
    )
  )
    .filter((c) => c && c.started)
    // in-progress first, completed last; otherwise keep course order
    .sort((a, b) => Number(a.complete) - Number(b.complete));

  const coursesCompleted = courseRows.filter((c) => c.complete).length;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="font-mono text-sm text-zinc-500">
          <span className="text-teal-400">~/</span>profile
        </p>

        <h1 className="mt-1 font-mono text-2xl text-white">
          {user.name || user.email}
        </h1>

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
                  <span className="text-sm text-zinc-500">
                    {" "}
                    / {countAt(puzzles, d.id)}
                  </span>
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
                areaId === OTHER_AREA
                  ? "Other"
                  : labelFor(taxonomy.areas, areaId);

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
                                {p.topicLabels.length > 3
                                  ? ` +${p.topicLabels.length - 3}`
                                  : ""}
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

        {/* Courses */}
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900">
          <div className="flex items-baseline justify-between px-4 py-3">
            <h2 className="font-mono text-sm text-zinc-100">Courses</h2>
            <p className="font-mono text-sm text-zinc-500">
              {coursesCompleted} completed
            </p>
          </div>

          {courseRows.length === 0 ? (
            <p className="border-t border-zinc-800 px-4 py-3 font-mono text-sm text-zinc-500">
              No courses started yet.{" "}
              <Link href="/lessons" className="text-teal-400 hover:underline">
                Browse courses →
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800 border-t border-zinc-800">
              {courseRows.map((c) => (
                <li key={c.id}>
                  <Link
                    href={courseHref(c.id)}
                    className="block px-4 py-3 hover:bg-zinc-800/50"
                    title={`${c.solvedPuzzles} / ${c.totalPuzzles} puzzles`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-zinc-100">{c.title}</span>

                      {c.complete && (
                        <span className="shrink-0 rounded border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 font-mono text-xs text-teal-400">
                          Completed
                        </span>
                      )}
                    </div>

                    <div
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={c.pct}
                      aria-label={`${c.title} progress`}
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800"
                    >
                      <div
                        className="h-full bg-teal-400"
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
