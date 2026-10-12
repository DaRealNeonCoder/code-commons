import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { db } from "./db";
import { commentReports, commentVotes, comments, user } from "./db/schema";
import { RATING_TYPES } from "./ratings";
import { notifyCommentCreated } from "./notifications";

export const COMMENT_MAX_LENGTH = 5000;

export function isCommentItemType(value) {
  return RATING_TYPES.includes(value);
}

const countWhere = (condition) => sql`count(*) filter (where ${condition})`.mapWith(Number);

function serializeComment(row, vote = { likes: 0, dislikes: 0, userVote: 0 }) {
  return {
    id: row.id,
    itemType: row.itemType,
    itemId: row.itemId,
    parentId: row.parentId,
    body: row.body,
    status: row.status,
    editedAt: row.editedAt instanceof Date ? row.editedAt.toISOString() : row.editedAt,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    author: { id: row.authorId, name: row.authorName || "anonymous", image: row.authorImage || null },
    ...vote,
  };
}

export async function getCommentThread(itemType, itemId, userId = null) {
  const rows = await db
    .select({
      id: comments.id,
      itemType: comments.itemType,
      itemId: comments.itemId,
      parentId: comments.parentId,
      body: comments.body,
      status: comments.status,
      editedAt: comments.editedAt,
      createdAt: comments.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .where(
      and(
        eq(comments.itemType, itemType),
        eq(comments.itemId, itemId),
        or(eq(comments.status, "visible"), eq(comments.status, "deleted"), userId ? eq(comments.userId, userId) : undefined)
      )
    )
    .orderBy(comments.createdAt);

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const [totals, mine] = await Promise.all([
    db
      .select({
        commentId: commentVotes.commentId,
        likes: countWhere(sql`${commentVotes.value} = 1`),
        dislikes: countWhere(sql`${commentVotes.value} = -1`),
      })
      .from(commentVotes)
      .where(inArray(commentVotes.commentId, ids))
      .groupBy(commentVotes.commentId),
    userId
      ? db
          .select({ commentId: commentVotes.commentId, value: commentVotes.value })
          .from(commentVotes)
          .where(and(eq(commentVotes.userId, userId), inArray(commentVotes.commentId, ids)))
      : Promise.resolve([]),
  ]);

  const totalById = new Map(totals.map((row) => [row.commentId, row]));
  const mineById = new Map(mine.map((row) => [row.commentId, row.value]));

  return rows.map((row) => {
    const total = totalById.get(row.id);
    return serializeComment(row, {
      likes: total?.likes ?? 0,
      dislikes: total?.dislikes ?? 0,
      userVote: mineById.get(row.id) ?? 0,
    });
  });
}

export async function getComment(commentId, userId = null) {
  const rows = await db
    .select({
      id: comments.id,
      itemType: comments.itemType,
      itemId: comments.itemId,
      parentId: comments.parentId,
      body: comments.body,
      status: comments.status,
      editedAt: comments.editedAt,
      createdAt: comments.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!rows[0]) return null;

  const [totals, mine] = await Promise.all([
    db
      .select({
        likes: countWhere(sql`${commentVotes.value} = 1`),
        dislikes: countWhere(sql`${commentVotes.value} = -1`),
      })
      .from(commentVotes)
      .where(eq(commentVotes.commentId, commentId)),
    userId
      ? db
          .select({ value: commentVotes.value })
          .from(commentVotes)
          .where(and(eq(commentVotes.commentId, commentId), eq(commentVotes.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
  ]);

  return serializeComment(rows[0], {
    likes: totals[0]?.likes ?? 0,
    dislikes: totals[0]?.dislikes ?? 0,
    userVote: mine[0]?.value ?? 0,
  });
}

export async function createComment({ userId, itemType, itemId, parentId, body, status = "visible", spamScore = 0, moderationReason = null }) {
  const inserted = await db
    .insert(comments)
    .values({ userId, itemType, itemId, parentId: parentId || null, body, status, spamScore, moderationReason })
    .returning({ id: comments.id });
  const comment = await getComment(inserted[0].id, userId);
  if (comment && status === "visible") await notifyCommentCreated(comment);
  return comment;
}

export async function updateComment(commentId, userId, body) {
  const rows = await db
    .update(comments)
    .set({ body, editedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(comments.id, commentId), eq(comments.userId, userId), eq(comments.status, "visible")))
    .returning({ id: comments.id });
  return rows[0] ? getComment(commentId, userId) : null;
}

export async function deleteComment(commentId, userId) {
  const rows = await db
    .update(comments)
    .set({ body: "[deleted]", status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(comments.id, commentId), eq(comments.userId, userId), sql`${comments.status} <> 'deleted'`))
    .returning({ id: comments.id });
  return rows.length > 0;
}

export async function reportComment({ commentId, reporterId, reason, details = "" }) {
  const rows = await db
    .insert(commentReports)
    .values({ commentId, reporterId, reason, details: details.slice(0, 1000) })
    .onConflictDoNothing({ target: [commentReports.reporterId, commentReports.commentId] })
    .returning({ id: commentReports.id });
  return rows.length > 0;
}

// A small database-backed guard that works across serverless instances. It is
// intentionally conservative: suspicious comments enter the queue rather than
// disappearing, while obvious floods are rejected before they create noise.
export async function assessComment({ userId, body }) {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await db
    .select({ id: comments.id, body: comments.body })
    .from(comments)
    .where(and(eq(comments.userId, userId), gte(comments.createdAt, since)))
    .orderBy(desc(comments.createdAt))
    .limit(12);

  if (recent.length >= 10) return { blocked: true, score: 100, reason: "Too many comments in a short period." };
  if (recent.some((comment) => comment.body.trim().toLowerCase() === body.trim().toLowerCase())) {
    return { blocked: true, score: 90, reason: "Duplicate comments are not allowed." };
  }

  let score = 0;
  const reasons = [];
  if ((body.match(/https?:\/\//gi) || []).length > 2) {
    score += 50;
    reasons.push("multiple links");
  }
  if (/(.)\1{8,}/u.test(body)) {
    score += 30;
    reasons.push("repeated characters");
  }
  if (/\b(buy now|free money|casino|viagra|crypto giveaway)\b/i.test(body)) {
    score += 70;
    reasons.push("spam phrase");
  }
  return { blocked: false, score, reason: reasons.join(", ") || null, pending: score >= 50 };
}

export async function getModerationQueue({ itemType = null, itemId = null } = {}) {
  const openReported = await db
    .select({ commentId: commentReports.commentId })
    .from(commentReports)
    .where(eq(commentReports.status, "open"));
  const reportedIds = openReported.map((row) => row.commentId);
  const rows = await db
    .select({
      id: comments.id,
      itemType: comments.itemType,
      itemId: comments.itemId,
      parentId: comments.parentId,
      body: comments.body,
      status: comments.status,
      moderationReason: comments.moderationReason,
      createdAt: comments.createdAt,
      authorId: user.id,
      authorName: user.name,
      authorImage: user.image,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .where(
      and(
        or(
          eq(comments.status, "pending"),
          eq(comments.status, "hidden"),
          reportedIds.length ? inArray(comments.id, reportedIds) : undefined
        ),
        itemType ? eq(comments.itemType, itemType) : undefined,
        itemId ? eq(comments.itemId, itemId) : undefined
      )
    )
    .orderBy(desc(comments.createdAt))
    .limit(200);
  if (!rows.length) return [];

  const reports = await db
    .select({ commentId: commentReports.commentId, count: sql`count(*)`.mapWith(Number) })
    .from(commentReports)
    .where(and(eq(commentReports.status, "open"), inArray(commentReports.commentId, rows.map((row) => row.id))))
    .groupBy(commentReports.commentId);
  const reportCount = new Map(reports.map((row) => [row.commentId, row.count]));
  return rows.map((row) => ({ ...serializeComment(row), reportCount: reportCount.get(row.id) || 0 }));
}

export async function setCommentVote(userId, commentId, value) {
  if (value === 0) {
    await db.delete(commentVotes).where(and(eq(commentVotes.userId, userId), eq(commentVotes.commentId, commentId)));
  } else {
    await db
      .insert(commentVotes)
      .values({ userId, commentId, value })
      .onConflictDoUpdate({
        target: [commentVotes.userId, commentVotes.commentId],
        set: { value, updatedAt: new Date() },
      });
  }

  const comment = await getComment(commentId, userId);
  return comment
    ? { likes: comment.likes, dislikes: comment.dislikes, userVote: comment.userVote }
    : null;
}
