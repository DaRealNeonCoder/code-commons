import { and, eq } from "drizzle-orm";
import { db } from "./db";
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
} from "./db/schema";

const CONTENT_TABLES = { lesson: lessons, puzzle: puzzles, shader: shaders, circuit: circuits, project: builds, course: courses };

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

async function ownsContent(userId, itemType, itemId) {
  const table = CONTENT_TABLES[itemType];
  if (!table) return false;
  const rows = await db.select({ ownerId: table.ownerId }).from(table).where(eq(table.slug, itemId)).limit(1);
  return rows[0]?.ownerId === userId;
}

export async function canModerateItem(userId, itemType, itemId) {
  if (!userId) return false;
  if (await getModerationRole(userId)) return true;
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
  const role = await getModerationRole(actorId);
  if (!role && !(await ownsContent(actorId, itemType, itemId))) return false;
  await db
    .insert(contentModerators)
    .values({ userId, itemType, itemId, grantedBy: actorId })
    .onConflictDoNothing();
  return true;
}

export async function revokeContentModerator({ actorId, userId, itemType, itemId }) {
  const role = await getModerationRole(actorId);
  if (!role && !(await ownsContent(actorId, itemType, itemId))) return false;
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
