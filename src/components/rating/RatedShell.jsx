import RatingButtons from "@/components/rating/RatingButtons";
import { getRatingSummary } from "@/lib/ratings";
import { getCurrentUserId } from "@/lib/session";

/**
 * Puts the unified rating bar at the top of a page and renders the page
 * content below it. Every rateable page wraps its main content in this, so
 * the bar looks and behaves the same for courses, lessons, puzzles,
 * shaders, circuits and projects.
 *
 * @param {"auto"|"dark"} [variant] - "dark" for pages whose chrome is always dark (shaders, circuits).
 */
export default async function RatedShell({ itemType, itemId, variant = "auto", children }) {
  const userId = await getCurrentUserId();
  const initial = getRatingSummary(itemType, itemId, userId);

  const barClasses =
    variant === "dark"
      ? "border-zinc-800 bg-zinc-950"
      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950";

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
      <div className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-1.5 ${barClasses}`}>
        <span className="font-mono text-xs text-zinc-500">rate this {itemType}</span>
        <RatingButtons
          itemType={itemType}
          itemId={itemId}
          initial={initial}
          signedIn={Boolean(userId)}
          tone={variant}
          showSummary
        />
      </div>
      {children}
    </div>
  );
}