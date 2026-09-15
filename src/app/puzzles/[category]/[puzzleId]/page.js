import { notFound } from "next/navigation";
import { getCategoryById, getPuzzle } from "@/lib/puzzles";
import CodeWorkspace from "@/components/CodeWorkspace";

export default async function PuzzlePage({ params }) {
  const { category: categoryId, puzzleId } = await params;
  const category = getCategoryById(categoryId);
  const puzzle = getPuzzle(categoryId, puzzleId);
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
    <>
      <p className="font-mono text-sm text-teal-600 dark:text-teal-400"># {puzzle.difficulty.toLowerCase()}</p>
      <h1 className="mt-1 text-2xl font-semibold mb-4">{puzzle.title}</h1>
      {puzzle.prompt.map((paragraph, i) => (
        <p key={i} className="mb-4">
          {paragraph}
        </p>
      ))}
    </>
  );

  return (
    <CodeWorkspace
      accent="teal"
      fileName={`${puzzle.id.replace(/-/g, "_")}.py`}
      starterCode={puzzle.starterCode}
      description={description}
      backHref={`/puzzles/${categoryId}`}
      backLabel={category.title.toLowerCase()}
    />
  );
}