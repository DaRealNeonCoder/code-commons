import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "./db";
import { getConfiguredRole } from "./moderationConfig";
import {
  builds,
  circuits,
  commentModerationActions,
  commentReports,
  comments,
  contentModerators,
  courses,
  lessons,
  moderationRoles,
  puzzles,
  shaders,
  session,
  user,
  userBans,
} from "./db/schema";

export const CONTENT_TABLES = { lesson: lessons, puzzle: puzzles, shader: shaders, circuit: circuits, project: builds, course: courses };

export function isSupportedContentType(itemType) {
  return typeof itemType === "string" && Object.hasOwn(CONTENT_TABLES, itemType);
}

export async function getModerationRole(userId) {
  if (!userId) return null;
  const rows = await db
    .select({ role: moderationRoles.role })
    .from(moderationRoles)
    .where(eq(moderationRoles.userId, userId));
  if (rows.some((row) => row.role === "admin")) return "admin";
  if (rows.some((row) => row.role === "moderator")) return "moderator";
  return null;
}

export async function getEffectiveRole(user) {
  if (!user?.id) return null;
  return getConfiguredRole(user.email) || (await getModerationRole(user.id));
}

export function isGlobalModeratorRole(role) {
  return role === "owner" || role === "admin" || role === "moderator";
}

export async function getActiveBan(userId) {
  if (!userId) return null;
  const [ban] = await db.select().from(userBans).where(eq(userBans.userId, userId)).limit(1);
  if (!ban || ban.revokedAt) return null;
  if (ban.expiresAt && ban.expiresAt <= new Date()) return null;
  return ban;
}

export async function listModerationUsers(search = "") {
  const term = search.trim();
  const where = term
    ? or(ilike(user.email, `%${term}%`), ilike(user.name, `%${term}%`), ilike(user.id, `%${term}%`))
    : undefined;
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(where)
    .orderBy(asc(user.email))
    .limit(100);
  return Promise.all(rows.map(async (candidate) => ({ ...candidate, role: await getEffectiveRole(candidate), ban: await getActiveBan(candidate.id) })));
}

async function getUserById(userId) {
  const [candidate] = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  return candidate || null;
}

export async function canBanUser(actor, target) {
  if (!actor?.id || !target?.id || actor.id === target.id) return false;
  const actorRole = await getEffectiveRole(actor);
  const targetRole = await getEffectiveRole(target);
  if (actorRole === "owner") return true;
  return isGlobalModeratorRole(actorRole) && !targetRole;
}

export async function banUser({ actor, targetId, reason = "", expiresAt = null }) {
  if (await getActiveBan(actor?.id)) return { ok: false, error: "not_allowed" };
  const target = await getUserById(targetId);
  if (!target || !(await canBanUser(actor, target))) return { ok: false, error: "not_allowed" };
  const expiry = expiresAt ? new Date(expiresAt) : null;
  if (expiry && Number.isNaN(expiry.getTime())) return { ok: false, error: "invalid_expiry" };
  const cleanReason = reason.trim().slice(0, 500);
  await db
    .insert(userBans)
    .values({ userId: target.id, bannedBy: actor.id, reason: cleanReason, expiresAt: expiry })
    .onConflictDoUpdate({
      target: userBans.userId,
      set: { bannedBy: actor.id, reason: cleanReason, expiresAt: expiry, revokedAt: null, revokedBy: null, updatedAt: new Date() },
    });
  // Existing sessions should stop working immediately.
  await db.delete(session).where(eq(session.userId, target.id));
  return { ok: true };
}

export async function unbanUser({ actor, targetId }) {
  if (await getActiveBan(actor?.id)) return { ok: false, error: "not_allowed" };
  const target = await getUserById(targetId);
  if (!target || !(await canBanUser(actor, target))) return { ok: false, error: "not_allowed" };
  await db.update(userBans).set({ revokedAt: new Date(), revokedBy: actor.id, updatedAt: new Date() }).where(eq(userBans.userId, target.id));
  return { ok: true };
}

export async function setContentAvailability({ actor, itemType, itemId, available }) {
  if (await getActiveBan(actor?.id)) return { ok: false, error: "not_allowed" };
  if (!isGlobalModeratorRole(await getEffectiveRole(actor))) return { ok: false, error: "not_allowed" };
  const table = isSupportedContentType(itemType) ? CONTENT_TABLES[itemType] : null;
  if (!table) return { ok: false, error: "invalid_type" };
  const rows = await db
    .update(table)
    .set({ available, updatedAt: new Date() })
    .where(eq(table.slug, itemId))
    .returning({ slug: table.slug });
  return rows.length ? { ok: true } : { ok: false, error: "not_found" };
}

export async function listModerationContent() {
  const entries = await Promise.all(
    Object.entries(CONTENT_TABLES).map(async ([itemType, table]) => {
      const rows = await db
        .select({ id: table.slug, title: table.title, ownerId: table.ownerId, available: table.available, updatedAt: table.updatedAt })
        .from(table)
        .orderBy(asc(table.updatedAt))
        .limit(100);
      return rows.map((row) => ({ ...row, itemType }));
    })
  );
  return entries.flat();
}

async function ownsContent(userId, itemType, itemId) {
  const table = CONTENT_TABLES[itemType];
  if (!table) return false;
  const rows = await db.select({ ownerId: table.ownerId }).from(table).where(eq(table.slug, itemId)).limit(1);
  return rows[0]?.ownerId === userId;
}

export async function canModerateItem(userId, itemType, itemId) {
  if (!userId) return false;
  if (await getActiveBan(userId)) return false;
  const [actor] = await db.select({ id: user.id, email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  if (await getEffectiveRole(actor)) return true;
  if (await ownsContent(userId, itemType, itemId)) return true;
  const rows = await db
    .select({ userId: contentModerators.userId })
    .from(contentModerators)
    .where(
      and(
        eq(contentModerators.userId, userId),
        eq(contentModerators.itemType, itemType),
        eq(contentModerators.itemId, itemId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export async function moderateComment({ commentId, moderatorId, action, note = "" }) {
  if (await getActiveBan(moderatorId)) return { ok: false, error: "banned" };
  const commentRows = await db
    .select({ itemType: comments.itemType, itemId: comments.itemId })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);
  const comment = commentRows[0];
  if (!comment || !(await canModerateItem(moderatorId, comment.itemType, comment.itemId))) return { ok: false, error: "not_allowed" };

  const statusByAction = { approve: "visible", restore: "visible", hide: "hidden", delete: "deleted" };
  if (action === "dismiss" || action === "resolve") {
    await db
      .update(commentReports)
      .set({ status: action === "dismiss" ? "dismissed" : "actioned", resolvedBy: moderatorId, resolvedAt: new Date() })
      .where(and(eq(commentReports.commentId, commentId), eq(commentReports.status, "open")));
  } else if (statusByAction[action]) {
    await db
      .update(comments)
      .set({
        status: statusByAction[action],
        body: action === "delete" ? "[deleted]" : undefined,
        deletedAt: action === "delete" ? new Date() : null,
        moderationReason: note.slice(0, 500) || null,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId));
    await db
      .update(commentReports)
      .set({ status: "actioned", resolvedBy: moderatorId, resolvedAt: new Date() })
      .where(and(eq(commentReports.commentId, commentId), eq(commentReports.status, "open")));
  } else {
    return { ok: false, error: "invalid_action" };
  }

  await db.insert(commentModerationActions).values({ commentId, moderatorId, action, note: note.slice(0, 1000) });
  return { ok: true };
}

export async function grantContentModerator({ actorId, userId, itemType, itemId }) {
  if (await getActiveBan(actorId) || !CONTENT_TABLES[itemType]) return false;
  const [actor] = await db.select({ id: user.id, email: user.email }).from(user).where(eq(user.id, actorId)).limit(1);
  if (!(await getEffectiveRole(actor)) && !(await ownsContent(actorId, itemType, itemId))) return false;
  await db
    .insert(contentModerators)
    .values({ userId, itemType, itemId, grantedBy: actorId })
    .onConflictDoNothing();
  return true;
}

export async function revokeContentModerator({ actorId, userId, itemType, itemId }) {
  if (await getActiveBan(actorId) || !CONTENT_TABLES[itemType]) return false;
  const [actor] = await db.select({ id: user.id, email: user.email }).from(user).where(eq(user.id, actorId)).limit(1);
  if (!(await getEffectiveRole(actor)) && !(await ownsContent(actorId, itemType, itemId))) return false;
  await db
    .delete(contentModerators)
    .where(
      and(
        eq(contentModerators.userId, userId),
        eq(contentModerators.itemType, itemType),
        eq(contentModerators.itemId, itemId)
      )
    );
  return true;
}
