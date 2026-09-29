import Link from "next/link";

// Full class strings so Tailwind can see them at build time.
const ACCENTS = {
  amber: "bg-amber-500 hover:bg-amber-400 focus-visible:outline-amber-500",
  teal: "bg-teal-500 hover:bg-teal-400 focus-visible:outline-teal-500",
};

// One "next step" block, shared by the lesson page (-> first puzzle) and the
// puzzle page (-> next puzzle in the lesson's chain). Renders nothing when
// there is no next puzzle, so the end of a chain shows no button at all.
export default function NextPuzzleLinks({
  puzzle,
  lessonId,
  heading = "Up next",
  buttonLabel = "$ next puzzle",
  accent = "teal",
}) {
  if (!puzzle) return null;

  // The lesson ID rides along in the URL so the next puzzle page can find its
  // place in the chain. The lesson's `puzzles` array is the only source of truth.
  const href = `/puzzles/${puzzle.id}${lessonId ? `?lesson=${encodeURIComponent(lessonId)}` : ""}`;

  return (
    <section className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800" aria-label={heading}>
      <h2 className="text-xl font-semibold">{heading}</h2>
      <p className="mt-3 font-medium">{puzzle.title}</p>
      {puzzle.summary && <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">{puzzle.summary}</p>}
      <Link
        href={href}
        className={`mt-4 inline-block rounded-md px-5 py-2.5 font-mono text-sm font-medium text-zinc-950 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${ACCENTS[accent] ?? ACCENTS.teal}`}
      >
        {buttonLabel}
      </Link>
    </section>
  );
}