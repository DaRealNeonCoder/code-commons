import { getModerationQueue } from "@/lib/comments";
import { getRequestAccess } from "@/lib/access";
import {
  banUser,
  canModerateItem,
  isGlobalModeratorRole,
  listModerationContent,
  listModerationUsers,
  isSupportedContentType,
  grantContentModerator,
  moderateComment,
  revokeContentModerator,
  setContentAvailability,
  unbanUser,
} from "@/lib/moderation";

export async function GET(request) {
  const access = await getRequestAccess(request);
  if (!access.user) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (access.ban) return Response.json({ error: "Your account is restricted from moderation." }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  if (scope === "tools") {
    if (!isGlobalModeratorRole(access.role)) return Response.json({ error: "Global moderation access is required." }, { status: 403 });
    return Response.json({ users: await listModerationUsers(searchParams.get("q") || ""), content: await listModerationContent(), role: access.role });
  }
  const itemType = searchParams.get("itemType") || null;
  const itemId = searchParams.get("itemId") || null;
  if ((itemType && !itemId) || (!itemType && itemId)) return Response.json({ error: "itemType and itemId must be supplied together." }, { status: 400 });
  if (itemType && !isSupportedContentType(itemType)) return Response.json({ error: "Unknown content type." }, { status: 400 });
  if (!itemType && !isGlobalModeratorRole(access.role)) {
    return Response.json({ error: "Moderation access is required." }, { status: 403 });
  }
  if (itemType && itemId && !(await canModerateItem(access.user.id, itemType, itemId))) {
    return Response.json({ error: "You cannot moderate this item." }, { status: 403 });
  }
  return Response.json({ queue: await getModerationQueue({ itemType, itemId }), role: access.role });
}

export async function POST(request) {
  const access = await getRequestAccess(request);
  if (!access.user) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (access.ban) return Response.json({ error: "Your account is restricted from moderation." }, { status: 403 });
  const user = access.user;
  const body = await request.json().catch(() => null);

  if (["ban", "unban", "content-delete", "content-restore"].includes(body?.action)) {
    if (!isGlobalModeratorRole(access.role)) return Response.json({ error: "Global moderation access is required." }, { status: 403 });
    if (body.action === "ban" || body.action === "unban") {
      if (typeof body.userId !== "string") return Response.json({ error: "A userId is required." }, { status: 400 });
      const result = body.action === "ban"
        ? await banUser({ actor: user, targetId: body.userId, reason: typeof body.reason === "string" ? body.reason : "", expiresAt: body.expiresAt || null })
        : await unbanUser({ actor: user, targetId: body.userId });
      if (!result.ok) return Response.json({ error: result.error === "invalid_expiry" ? "The ban expiry is invalid." : "You cannot change this user's restriction." }, { status: 403 });
      return Response.json({ ok: true });
    }
    if (typeof body.itemType !== "string" || typeof body.itemId !== "string") return Response.json({ error: "itemType and itemId are required." }, { status: 400 });
    const result = await setContentAvailability({ actor: user, itemType: body.itemType, itemId: body.itemId, available: body.action === "content-restore" });
    if (!result.ok) return Response.json({ error: result.error === "not_found" ? "Content not found." : "You cannot change this content." }, { status: result.error === "not_found" ? 404 : 403 });
    return Response.json({ ok: true });
  }

  if (["approve", "restore", "hide", "delete", "dismiss", "resolve"].includes(body?.action)) {
    if (typeof body.commentId !== "string") return Response.json({ error: "A commentId is required." }, { status: 400 });
    const result = await moderateComment({ commentId: body.commentId, moderatorId: user.id, action: body.action, note: typeof body.note === "string" ? body.note : "" });
    if (!result.ok) return Response.json({ error: result.error === "banned" ? "Your account is restricted from moderation." : result.error === "not_allowed" ? "You cannot moderate this comment." : "Invalid moderation action." }, { status: 403 });
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
