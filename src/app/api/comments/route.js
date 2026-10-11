import { auth } from "@/lib/auth";
import {
  COMMENT_MAX_LENGTH,
  createComment,
  getComment,
  getCommentThread,
  isCommentItemType,
  setCommentVote,
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
    if (parent.itemType !== itemType || parent.itemId !== itemId) {
      return Response.json({ error: "Replies must belong to the same item." }, { status: 400 });
    }
  }

  return Response.json(
    { comment: await createComment({ userId, itemType, itemId, parentId, body: text }) },
    { status: 201 }
  );
}
