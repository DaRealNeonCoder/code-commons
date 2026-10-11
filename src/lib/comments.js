import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { commentVotes, comments, user } from "./db/schema";
import { RATING_TYPES } from "./ratings";

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
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    author: { id: row.authorId, name: row.authorName || "anonymous" },
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
      createdAt: comments.createdAt,
      authorId: user.id,
      authorName: user.name,
    })
    .from(comments)
    .innerJoin(user, eq(comments.userId, user.id))
    .where(and(eq(comments.itemType, itemType), eq(comments.itemId, itemId)))
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
      createdAt: comments.createdAt,
      authorId: user.id,
      authorName: user.name,
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

export async function createComment({ userId, itemType, itemId, parentId, body }) {
  const inserted = await db
    .insert(comments)
    .values({ userId, itemType, itemId, parentId: parentId || null, body })
    .returning({ id: comments.id });
  return getComment(inserted[0].id, userId);
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
