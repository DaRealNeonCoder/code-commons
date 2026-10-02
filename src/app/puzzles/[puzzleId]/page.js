import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getPuzzleById, getClientTestInfo } from "@/lib/puzzles";
import { getNextPuzzleInChain } from "@/lib/lessonPuzzles";
import { getCourseContext } from "@/lib/courseNav";
import { getCurrentUserId } from "@/lib/session";
import { getCourseProgress } from "@/lib/courseProgress";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
import CodeWorkspace from "@/components/CodeWorkspace";
import NextPuzzleLinks from "@/components/NextPuzzleLinks";
import NextLessonLink from "@/components/NextLessonLink";
import CourseShell from "@/components/CourseShell";

export default async function PuzzlePage({ params, searchParams }) {
  const { puzzleId } = await params;
  const query = await searchParams;
  const puzzle = getPuzzleById(puzzleId);
  if (!puzzle) notFound();

  if (!puzzle.available) {
    return (
      <div className="flex w-full h-full items-center justify-center px-6">
        <div className="text-center">
          <p className="font-mono text-sm text-zinc-400">{puzzle.title}</p>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">This puzzle is coming soon.</p>
        </div>
      </div>
    );
  }

  const { checkable, sampleTests, hiddenTestCount } = getClientTestInfo(puzzle);

  const lessonId = typeof query?.lesson === "string" ? query.lesson : null;
  const nextPuzzle = lessonId ? getNextPuzzleInChain(lessonId, puzzle.id) : null;

  // Non-null only when the lesson is in a course AND this puzzle is really in
  // its chain. No next puzzle means end of chain, so the next step is the next lesson.
  const ctx = lessonId ? getCourseContext(lessonId, puzzle.id) : null;
  const userId = ctx ? await getCurrentUserId() : null;
  const progress = ctx ? await getCourseProgress(userId, ctx.outline) : null;

  const description = (
    <article>
      <p className="font-mono text-sm text-teal-600 dark:text-teal-400"># {puzzle.difficulty}</p>
      <h1 className="mt-1 text-2xl font-semibold mb-4">{puzzle.title}</h1>
      <MDXRemote source={puzzle.content} components={mdxComponents} options={{ mdxOptions }} />

      <NextPuzzleLinks puzzle={nextPuzzle} lessonId={lessonId} />
      {ctx && !nextPuzzle && <NextLessonLink course={ctx.outline} nextLesson={ctx.nextLesson} />}
    </article>
  );

  return (
    <CourseShell outline={ctx?.outline} progress={progress} lessonId={lessonId} puzzleId={puzzle.id}>
      <CodeWorkspace
        accent="teal"
        fileBaseName={`${puzzle.id.replace(/-/g, "_")}`}
        starterCode={puzzle.starterCode}
        description={description}
        backHref="/puzzles"
        backLabel="all puzzles"
        itemType="puzzle"
        itemId={puzzle.id}
        checkPuzzleId={checkable ? puzzle.id : undefined}
        sampleTests={sampleTests}
        hiddenTestCount={hiddenTestCount}
      />
    </CourseShell>
  );
}