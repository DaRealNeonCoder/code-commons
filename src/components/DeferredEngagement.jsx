"use client";

import { useEffect, useState } from "react";
import RatingButtons from "@/components/rating/RatingButtons";
import CommentThread from "@/components/comments/CommentThread";
import { useSession } from "@/lib/auth-client";

const EMPTY_RATING = { likes: 0, dislikes: 0, userVote: 0 };

// Engagement is personalized and should not prevent the lesson/course shell
// from being statically generated. Load it after the useful content is visible.
export default function DeferredEngagement({ itemType, itemId, showRating = true, showComments = true }) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(EMPTY_RATING);
  const [comments, setComments] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const requests = [];
    if (showRating) requests.push(fetch(`/api/ratings?itemType=${encodeURIComponent(itemType)}&itemId=${encodeURIComponent(itemId)}`).then((res) => res.json()));
    if (showComments) requests.push(fetch(`/api/comments?itemType=${encodeURIComponent(itemType)}&itemId=${encodeURIComponent(itemId)}`).then((res) => res.json()));
    Promise.all(requests)
      .then(([ratingData, commentData]) => {
        if (cancelled) return;
        if (showRating && typeof ratingData?.likes === "number") setRating(ratingData);
        if (showComments) {
          const data = showRating ? commentData : ratingData;
          setComments(Array.isArray(data?.comments) ? data.comments : []);
        }
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId, itemType, showComments, showRating]);

  return (
    <>
      {showRating && <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
        <span className="font-mono text-xs text-zinc-500">rate this {itemType}</span>
        <RatingButtons itemType={itemType} itemId={itemId} initial={rating} signedIn={Boolean(session?.user)} showSummary />
      </div>}
      {showComments && comments !== null && (
        <CommentThread
          itemType={itemType}
          itemId={itemId}
          initialComments={comments}
          signedIn={Boolean(session?.user)}
          currentUserId={session?.user?.id ?? null}
        />
      )}
    </>
  );
}
