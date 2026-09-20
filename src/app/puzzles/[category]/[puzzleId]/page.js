import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getCategoryById, getPuzzle } from "@/lib/puzzles";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
import CodeWorkspace from "@/components/CodeWorkspace";

export default async function PuzzlePage({ params }) {
  const { category: categoryId, puzzleId } = await params;
  const category = getCategoryById(categoryId);
  const puzzle = getPuzzle(categoryId, puzzleId);
console.log(
  "starterCode:",
  typeof puzzle.starterCode,
  puzzle.starterCode?.constructor?.name,
  puzzle.starterCode
);
  if (!category || !puzzle) notFound();

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
      <p className="font-mono text-sm text-teal-600 dark:text-teal-400"># {puzzle.difficulty.toLowerCase()}</p>
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
      backHref={`/puzzles/${categoryId}`}
      backLabel={category.title.toLowerCase()}
      itemType="puzzle"
      itemId={puzzle.id}
    />
  );
}