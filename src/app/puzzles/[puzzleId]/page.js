import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getPuzzleById, getClientTestInfo } from "@/lib/puzzles";
import { getNextPuzzleInChain } from "@/lib/lessonPuzzles";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
import CodeWorkspace from "@/components/CodeWorkspace";
import NextPuzzleLinks from "@/components/NextPuzzleLinks";

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

  // Only visible cases and a hidden-case count cross to the client.
  const { checkable, sampleTests, hiddenTestCount } = getClientTestInfo(puzzle);

  // The lesson that sent the reader here travels in the URL (?lesson=hello-world).
  // The lesson's `puzzles` array decides what comes next; at the end of the
  // chain (or when opened on its own) this is null and nothing is shown.
  const lessonId = typeof query?.lesson === "string" ? query.lesson : null;
  const nextPuzzle = lessonId ? getNextPuzzleInChain(lessonId, puzzle.id) : null;

  const description = (
    <article>
      <p className="font-mono text-sm text-teal-600 dark:text-teal-400"># {puzzle.difficulty}</p>
      <h1 className="mt-1 text-2xl font-semibold mb-4">{puzzle.title}</h1>
      <MDXRemote source={puzzle.content} components={mdxComponents} options={{ mdxOptions }} />

      <NextPuzzleLinks puzzle={nextPuzzle} lessonId={lessonId} />
    </article>
  );

  return (
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
  );
}