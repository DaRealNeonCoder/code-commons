import Link from "next/link";
import { puzzleCategories } from "@/lib/puzzles";

export default function PuzzleCategoriesPage() {
  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-sm text-teal-600 dark:text-teal-400">/puzzles</p>
        <h1 className="mt-1 text-2xl font-semibold">Categories</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">Pick a category to start solving.</p>

        <div className="mt-8 divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {puzzleCategories.map((category) => {
            const dirName = `${category.id.replace(/-/g, "_")}/`;

            return category.available ? (
              <Link
                key={category.id}
                href={`/puzzles/${category.id}`}
                className="flex flex-col gap-0.5 px-4 py-3.5 transition-colors hover:bg-teal-50 dark:hover:bg-zinc-900"
              >
                <span className="font-mono text-sm">{dirName}</span>
                <span className="text-sm text-zinc-500">{category.tagline}</span>
              </Link>
            ) : (
              <div
                key={category.id}
                className="flex cursor-not-allowed flex-col gap-0.5 px-4 py-3.5 text-zinc-400 dark:text-zinc-600"
              >
                <span className="font-mono text-sm">
                  {dirName} <span className="text-zinc-300 dark:text-zinc-700"># coming soon</span>
                </span>
                <span className="text-sm">{category.tagline}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}