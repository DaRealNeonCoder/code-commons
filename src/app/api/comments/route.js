import { auth } from "@/lib/auth";
import {
  COMMENT_MAX_LENGTH,
  createComment,
  assessComment,
  deleteComment,
  getComment,
  getCommentThread,
  isCommentItemType,
  reportComment,
  setCommentVote,
  updateComment,
} from "@/lib/comments";

async function getUserId(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id ?? null;
}

const validKey = (value) => typeof value === "string" && value.length > 0 && value.length <= 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request) {
  const userId = await getUserId(request);
  const { searchParams } = new URL(request.url);
  const itemType = searchParams.get("itemType");
  const itemId = searchParams.get("itemId");

  if (!isCommentItemType(itemType) || !validKey(itemId)) {
    return Response.json({ error: "A valid itemType and itemId are required." }, { status: 400 });
  }

  return Response.json({ comments: await getCommentThread(itemType, itemId, userId) });
}

export async function POST(request) {
  const userId = await getUserId(request);
  if (!userId) return Response.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);

  if (body?.action === "vote") {
    if (!UUID.test(body.commentId) || ![1, -1, 0].includes(body.value)) {
      return Response.json({ error: "A valid commentId and vote value are required." }, { status: 400 });
    }

    const comment = await getComment(body.commentId, userId);
    if (!comment) return Response.json({ error: "Comment not found." }, { status: 404 });
    return Response.json(await setCommentVote(userId, body.commentId, body.value));
  }

  if (body?.action === "report") {
    if (!UUID.test(body.commentId) || typeof body.reason !== "string" || !body.reason.trim()) {
      return Response.json({ error: "A comment and report reason are required." }, { status: 400 });
    }
    const comment = await getComment(body.commentId, userId);
    if (!comment || comment.status === "deleted") return Response.json({ error: "Comment not found." }, { status: 404 });
    const created = await reportComment({
      commentId: body.commentId,
      reporterId: userId,
      reason: body.reason.trim().slice(0, 100),
      details: typeof body.details === "string" ? body.details.trim() : "",
    });
    return Response.json({ reported: true, duplicate: !created });
  }

  if (body?.action === "edit") {
    if (!UUID.test(body.commentId) || typeof body.body !== "string") {
      return Response.json({ error: "A valid commentId and body are required." }, { status: 400 });
    }
    const text = body.body.trim();
    if (!text || text.length > COMMENT_MAX_LENGTH) {
      return Response.json({ error: `Comments must be between 1 and ${COMMENT_MAX_LENGTH} characters.` }, { status: 400 });
    }
    const comment = await updateComment(body.commentId, userId, text);
    return comment ? Response.json({ comment }) : Response.json({ error: "You can only edit your own visible comments." }, { status: 403 });
  }

  if (body?.action === "delete") {
    if (!UUID.test(body.commentId)) return Response.json({ error: "A valid commentId is required." }, { status: 400 });
    const deleted = await deleteComment(body.commentId, userId);
    return deleted ? Response.json({ deleted: true }) : Response.json({ error: "You can only delete your own comment." }, { status: 403 });
  }

  const itemType = body?.itemType;
  const itemId = body?.itemId;
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const parentId = body?.parentId || null;

  if (!isCommentItemType(itemType) || !validKey(itemId)) {
    return Response.json({ error: "A valid itemType and itemId are required." }, { status: 400 });
  }
  if (!text || text.length > COMMENT_MAX_LENGTH) {
    return Response.json({ error: `Comments must be between 1 and ${COMMENT_MAX_LENGTH} characters.` }, { status: 400 });
  }
  const parent = parentId && UUID.test(parentId) ? await getComment(parentId) : null;
  if (parentId !== null && (!UUID.test(parentId) || !parent)) {
    return Response.json({ error: "The reply target was not found." }, { status: 400 });
  }

  if (parentId) {
    if (parent.status !== "visible" || parent.itemType !== itemType || parent.itemId !== itemId) {
      return Response.json({ error: "Replies must belong to the same item." }, { status: 400 });
    }
  }

  const spam = await assessComment({ userId, body: text });
  if (spam.blocked) return Response.json({ error: spam.reason }, { status: 429 });

  return Response.json(
    {
      comment: await createComment({
        userId,
        itemType,
        itemId,
        parentId,
        body: text,
        status: spam.pending ? "pending" : "visible",
        spamScore: spam.score,
        moderationReason: spam.reason,
      }),
      moderation: spam.pending ? "pending" : undefined,
    },
    { status: 201 }
  );
}
