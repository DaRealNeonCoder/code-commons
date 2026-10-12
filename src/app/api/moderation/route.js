import { auth } from "@/lib/auth";
import { getModerationQueue } from "@/lib/comments";
import {
  canModerateItem,
  getModerationRole,
  grantContentModerator,
  moderateComment,
  revokeContentModerator,
} from "@/lib/moderation";

async function currentUser(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user || null;
}

export async function GET(request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const itemType = searchParams.get("itemType") || null;
  const itemId = searchParams.get("itemId") || null;
  if (!itemType && !(await getModerationRole(user.id))) {
    return Response.json({ error: "Moderation access is required." }, { status: 403 });
  }
  if (itemType && itemId && !(await canModerateItem(user.id, itemType, itemId))) {
    return Response.json({ error: "You cannot moderate this item." }, { status: 403 });
  }
  return Response.json({ queue: await getModerationQueue({ itemType, itemId }), role: await getModerationRole(user.id) });
}

export async function POST(request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const body = await request.json().catch(() => null);

  if (["approve", "restore", "hide", "delete", "dismiss", "resolve"].includes(body?.action)) {
    if (typeof body.commentId !== "string") return Response.json({ error: "A commentId is required." }, { status: 400 });
    const result = await moderateComment({ commentId: body.commentId, moderatorId: user.id, action: body.action, note: typeof body.note === "string" ? body.note : "" });
    if (!result.ok) return Response.json({ error: result.error === "not_allowed" ? "You cannot moderate this comment." : "Invalid moderation action." }, { status: 403 });
    return Response.json({ ok: true });
  }

  if (body?.action === "grant" || body?.action === "revoke") {
    if (typeof body.userId !== "string" || typeof body.itemType !== "string" || typeof body.itemId !== "string") {
      return Response.json({ error: "userId, itemType and itemId are required." }, { status: 400 });
    }
    const allowed = body.action === "grant"
      ? await grantContentModerator({ actorId: user.id, userId: body.userId, itemType: body.itemType, itemId: body.itemId })
      : await revokeContentModerator({ actorId: user.id, userId: body.userId, itemType: body.itemType, itemId: body.itemId });
    if (!allowed) return Response.json({ error: "Only the content owner or a moderator can manage contributors." }, { status: 403 });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Unknown moderation action." }, { status: 400 });
}
