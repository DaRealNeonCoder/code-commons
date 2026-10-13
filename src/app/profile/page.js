import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllPuzzles } from "@/lib/puzzles";
import { getCompletedIds, getCurrentStreak } from "@/lib/progress";
import { calculateLongestStreak, getActivityDates, getProgressEntries } from "@/lib/progress";
import { loadTaxonomy, expandTaxonomy, labelFor } from "@/lib/taxonomy";
import { getAllContent } from "@/lib/content";
import { getAllCourses } from "@/lib/courses";
import { getCourseOutline } from "@/lib/courseNav";
import { getCourseProgress } from "@/lib/courseProgress";
import { isLessonComplete } from "@/lib/progressUtils";
import ProfilePictureEditor from "@/components/ProfilePictureEditor";
import { getUserAvatar } from "@/lib/profile";
import { getOwnedProjectSummaries } from "@/lib/publicProfiles";
import ProfileProjects from "@/components/ProfileProjects";
import { ProfileProgressiveSections } from "@/components/ProfileProgressiveSections";

const OTHER_AREA = "__other"; // puzzles with no area at all
const puzzleHref = (id) => `/puzzles/${id}`;
const courseHref = (id) => `/courses/${id}`; // adjust to wherever your course page lives

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/");
  const avatar = await getUserAvatar(user.id);

  const taxonomy = loadTaxonomy();
  const completedIds = new Set(await getCompletedIds(user.id, "puzzle"));
  const currentStreak = await getCurrentStreak(user.id);
  const [progressEntries, activityDates, allContent] = await Promise.all([
    getProgressEntries(user.id),
    getActivityDates(user.id),
    getAllContent(),
  ]);
  const projects = await getOwnedProjectSummaries(user.id);

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

  const contentByKey = new Map(allContent.map((item) => [`${item.type}:${item.id}`, item]));
  const availableContent = allContent.filter((item) => item.available !== false);
  const completedContent = progressEntries
    .map((entry) => ({ ...entry, item: contentByKey.get(`${entry.itemType}:${entry.itemId}`) }))
    .filter((entry) => entry.item && entry.item.available !== false);
  const completionPercent = availableContent.length
    ? Math.round((completedContent.length / availableContent.length) * 100)
    : 0;
  const completedByType = new Map();
  for (const entry of completedContent) {
    completedByType.set(entry.itemType, (completedByType.get(entry.itemType) || 0) + 1);
  }

  const topicStats = taxonomy.topics.map((topic) => {
    const topicPuzzles = puzzles.filter((puzzle) => {
      const expanded = expandTaxonomy(puzzle, taxonomy);
      return puzzle.available && expanded.effectiveTopics.includes(topic.id);
    });
    const solvedCount = topicPuzzles.filter((puzzle) => completedIds.has(puzzle.id)).length;
    return {
      id: topic.id,
      label: topic.label,
      total: topicPuzzles.length,
      solved: solvedCount,
      percent: topicPuzzles.length ? Math.round((solvedCount / topicPuzzles.length) * 100) : 0,
    };
  }).filter((topic) => topic.total > 0);

  const topicById = new Map(topicStats.map((topic) => [topic.id, topic]));
  const recommendationCandidates = availableContent
    .filter((item) => !progressEntries.some((entry) => entry.itemType === item.type && entry.itemId === item.id))
    .map((item) => {
      const topics = item.effectiveTopics || [];
      const topicMatches = topics.reduce((count, topicId) => count + (topicById.has(topicId) ? 1 : 0), 0);
      const practiceNeed = topics.reduce((score, topicId) => {
        const topic = topicById.get(topicId);
        return score + (topic ? 1 - topic.percent / 100 : 0);
      }, 0);
      return {
        item,
        score: topicMatches * 2 + practiceNeed + (item.type === "lesson" ? 0.5 : 0),
        topicId: topics.find((topicId) => topicById.has(topicId)) || null,
      };
    })
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  const recommendations = recommendationCandidates.slice(0, 30).map(({ item, topicId }) => ({
    id: item.id,
    href: item.href,
    title: item.title,
    type: item.type,
    summary: item.summary,
    topic: topicId ? topicById.get(topicId)?.label : null,
  }));

  const today = new Date();
  const activityCells = Array.from({ length: 84 }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (83 - index)));
    const key = date.toISOString().slice(0, 10);
    return { key, active: activityDates.includes(key) };
  });
  const activityWeeks = Array.from({ length: 12 }, (_, index) => activityCells.slice(index * 7, index * 7 + 7));
  const recentActivity = completedContent.slice(0, 5).map((entry) => ({
    ...entry,
    date: entry.completedAt instanceof Date ? entry.completedAt.toISOString().slice(0, 10) : String(entry.completedAt).slice(0, 10),
  }));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-950">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="font-mono text-sm text-zinc-500">
          <span className="text-teal-400">~/</span>profile
        </p>

        <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-zinc-500">your account</p>
              <h1 className="mt-1 font-mono text-2xl text-white">{user.name || user.email}</h1>
            </div>
            <ProfilePictureEditor
              initialImage={avatar?.image || user.image}
              defaultImage={avatar?.defaultImage || user.image}
              initialCustomImage={avatar?.customImage}
              initialScale={avatar?.scale}
              initialPositionX={avatar?.positionX}
              initialPositionY={avatar?.positionY}
              name={user.name || user.email}
            />
          </div>
        </div>

        {/* Summary */}
        <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
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
            </div>

            <div className="rounded border border-orange-500/30 bg-orange-500/5 px-4 py-3 sm:min-w-36">
              <p className="font-mono text-xs uppercase tracking-wide text-orange-300">Daily streak</p>
              <p className="mt-1 font-mono text-3xl text-white">
                {currentStreak}
                <span className="ml-2 text-sm text-zinc-500">
                  {currentStreak === 1 ? "day" : "days"}
                </span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">Solve a puzzle each day</p>
            </div>
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

        {/* Analytics */}
        <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-wide text-teal-400">learning analytics</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Your momentum</h2>
            </div>
            <p className="font-mono text-xs text-zinc-500">{completionPercent}% of the library completed</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["completed", completedContent.length],
              ["active days", activityDates.length],
              ["longest streak", `${calculateLongestStreak(activityDates)} days`],
            ].map(([label, value]) => (
              <div key={label} className="rounded border border-zinc-800 bg-zinc-950 p-3">
                <p className="font-mono text-xs text-zinc-500">{label}</p>
                <p className="mt-1 font-mono text-xl text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-mono text-xs text-zinc-500">activity</span>
            <div className="flex gap-1" aria-label={`${activityDates.length} active days in the last twelve weeks`}>
              {activityWeeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid gap-1">
                  {week.map((cell) => (
                    <span
                      key={cell.key}
                      title={`${cell.key}${cell.active ? " · active" : ""}`}
                      className={`h-2.5 w-2.5 rounded-sm ${cell.active ? "bg-teal-400" : "bg-zinc-800"}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
            {[...completedByType.entries()].map(([type, count]) => (
              <span key={type} className="rounded-full border border-zinc-700 px-2.5 py-1 font-mono text-xs text-zinc-400">
                {count} {type}{count === 1 ? "" : "s"}
              </span>
            ))}
            {completedContent.length === 0 && <span className="font-mono text-xs text-zinc-500">Complete a lesson or puzzle to start building your map.</span>}
          </div>
        </section>

        <ProfileProjects projects={projects} own />

        <ProfileProgressiveSections topics={topicStats} recommendations={recommendations} />

        {recentActivity.length > 0 && (
          <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="px-4 py-3">
              <h2 className="font-mono text-sm text-zinc-100">Recent progress</h2>
            </div>
            <ul className="divide-y divide-zinc-800 border-t border-zinc-800">
              {recentActivity.map((entry) => (
                <li key={`${entry.itemType}:${entry.itemId}`}>
                  <Link href={entry.item.href} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-800/50">
                    <span className="min-w-0 truncate text-sm text-zinc-200">{entry.item.title}</span>
                    <span className="shrink-0 font-mono text-xs text-zinc-500">{entry.date}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Solved list, grouped by area */}
        <section className="mt-8 space-y-3">
          {orderedAreaIds.length === 0 ? (
            <p className="font-mono text-sm text-zinc-500">
              No puzzles solved yet.{" "}
              <Link href="/browse" className="text-teal-400 hover:underline">
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
              <Link href="/browse" className="text-teal-400 hover:underline">
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
