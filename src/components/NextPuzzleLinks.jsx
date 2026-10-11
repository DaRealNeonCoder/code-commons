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
    <section className="mt-10 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900 dark:bg-amber-950/30 sm:p-6" aria-label={heading}>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">{heading}</p>
      <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">{puzzle.title}</h2>
      {puzzle.summary && <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{puzzle.summary}</p>}
      <Link
        href={href}
        className={`mt-5 inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${ACCENTS[accent] ?? ACCENTS.teal}`}
      >
        {buttonLabel}
      </Link>
    </section>
  );
}
