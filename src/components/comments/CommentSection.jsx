import { getCommentThread } from "@/lib/comments";
import { getCurrentUserId } from "@/lib/session";
import { canModerateItem } from "@/lib/moderation";
import CommentThread from "./CommentThread";

// Server wrapper: the first render contains the current thread and vote state,
// while CommentThread handles new replies and votes without a page reload.
export default async function CommentSection({ itemType, itemId, tone = "auto" }) {
  const userId = await getCurrentUserId();
  const comments = await getCommentThread(itemType, itemId, userId);
  const canModerate = userId ? await canModerateItem(userId, itemType, itemId) : false;

  return (
    <CommentThread
      key={`${itemType}:${itemId}`}
      itemType={itemType}
      itemId={itemId}
      initialComments={comments}
      signedIn={Boolean(userId)}
      currentUserId={userId}
      canModerate={canModerate}
      tone={tone}
    />
  );
}
