import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryById, puzzlesByCategory } from "@/lib/puzzles";

export default async function PuzzleCategoryPage({ params }) {
  const { category: categoryId } = await params;
  const category = getCategoryById(categoryId);
  if (!category) notFound();

  const puzzles = puzzlesByCategory[categoryId] || [];

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/puzzles" className="font-mono text-sm text-teal-600 hover:underline dark:text-teal-400">
          ← /puzzles
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">{category.title}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">{category.tagline}</p>

        {puzzles.length === 0 ? (
          <p className="mt-8 font-mono text-sm text-zinc-400"># nothing here yet — check back soon</p>
        ) : (
          <div className="mt-8 divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {puzzles.map((puzzle) => {
              const fileName = `${puzzle.id.replace(/-/g, "_")}.py`;

              return puzzle.available ? (
                <Link
                  key={puzzle.id}
                  href={`/puzzles/${categoryId}/${puzzle.id}`}
                  className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-teal-50 dark:hover:bg-zinc-900"
                >
                  <span className="font-mono text-sm">{fileName}</span>
                  <span className="font-mono text-xs text-teal-600 dark:text-teal-400">
                    # {puzzle.difficulty.toLowerCase()}
                  </span>
                </Link>
              ) : (
                <div
                  key={puzzle.id}
                  className="flex cursor-not-allowed items-center justify-between px-4 py-3.5 text-zinc-400 dark:text-zinc-600"
                >
                  <span className="font-mono text-sm">{fileName}</span>
                  <span className="font-mono text-xs text-zinc-300 dark:text-zinc-700"># coming soon</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}