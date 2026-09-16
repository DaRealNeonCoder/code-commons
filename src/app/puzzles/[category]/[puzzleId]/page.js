import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getCategoryById, getPuzzle } from "@/lib/puzzles";
import { mdxComponents, mdxOptions } from "@/lib/mdx-components";
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
    <article>
      <p className="font-mono text-sm text-teal-600 dark:text-teal-400"># {puzzle.difficulty.toLowerCase()}</p>
      <h1 className="mt-1 text-2xl font-semibold mb-4">{puzzle.title}</h1>
      <MDXRemote source={puzzle.content} components={mdxComponents} options={{ mdxOptions }} />
    </article>
  );

  return (
    <CodeWorkspace
      // Resets the editor's internal state when navigating between puzzles
      // that share this same route template.
      key={puzzle.id}
      accent="teal"
      fileBaseName={puzzle.id.replace(/-/g, "_")}
      starterCode={puzzle.starterCode}
      // No lockedLanguage here on purpose — puzzles are language-agnostic
      // by default. Set `lockedLanguage` in a puzzle's frontmatter if a
      // specific puzzle should ever pin one language instead.
      lockedLanguage={puzzle.lockedLanguage}
      description={description}
      backHref={`/puzzles/${categoryId}`}
      backLabel={category.title.toLowerCase()}
    />
  );
}