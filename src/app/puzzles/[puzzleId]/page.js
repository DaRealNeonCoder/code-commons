import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getPuzzleById } from "@/lib/puzzles";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
import CodeWorkspace from "@/components/CodeWorkspace";

export default async function PuzzlePage({ params }) {
  const { puzzleId } = await params;
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

  const description = (
    <article>
      <p className="font-mono text-sm text-teal-600 dark:text-teal-400"># {puzzle.difficulty}</p>
      <h1 className="mt-1 text-2xl font-semibold mb-4">{puzzle.title}</h1>
      <MDXRemote source={puzzle.content} components={mdxComponents} options={{ mdxOptions }} />
    </article>
  );

  return (
    <CodeWorkspace
      accent="teal"
      fileName={`${puzzle.id.replace(/-/g, "_")}.py`}
      starterCode={puzzle.starterCode}
      description={description}
      backHref="/puzzles"
      backLabel="all puzzles"
    />
  );
}


src/
  lib/
    puzzles.js                       (REPLACE — categories now auto-unlock)
  components/
    creator/
      TextBlockEditor.jsx            (NEW — extracted shared block editor)
      LessonCreator.jsx              (REPLACE — now uses TextBlockEditor)
      PuzzleCreator.jsx              (NEW)
      ShaderCreator.jsx              (NEW)
  app/
    create/
      page.js                        (REPLACE — now a type picker)
      lesson/page.js                 (NEW — moved from the old /create/page.js)
      puzzle/page.js                 (NEW)
      shader/page.js                 (NEW)
      circuit/page.js                (NEW — placeholder, see part 3 below)
    puzzles/
      page.js                        (REPLACE — small change, see below)
    api/
      puzzles/route.js               (NEW — saves content/puzzles/<category>/)
      shader-lessons/route.js        (NEW — saves content/shaders/)