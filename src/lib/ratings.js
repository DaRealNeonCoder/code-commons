import { and, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { ratings } from "./db/schema";

// Everything that can be rated. Courses and lessons are separate namespaces,
// so a course's rating never leaks into the lessons inside it.
export const RATING_TYPES = ["course", "lesson", "puzzle", "shader", "circuit", "project"];

export function isRatingType(value) {
  return RATING_TYPES.includes(value);
}

const keyOf = (type, id) => `${type}:${id}`;

// count(*) comes back from Postgres as a bigint (a string over the wire), so
// map it to a number.
const countWhere = (condition) => sql`count(*) filter (where ${condition})`.mapWith(Number);
const likesCount = () => countWhere(sql`${ratings.value} = 1`);
const dislikesCount = () => countWhere(sql`${ratings.value} = -1`);

// { likes, dislikes, userVote } for one item. userVote is 1, -1, or 0 (no vote / signed out).
export async function getRatingSummary(itemType, itemId, userId = null) {
  const forItem = and(eq(ratings.itemType, itemType), eq(ratings.itemId, itemId));

  const [totals, mine] = await Promise.all([
    db.select({ likes: likesCount(), dislikes: dislikesCount() }).from(ratings).where(forItem),
    userId
      ? db
          .select({ value: ratings.value })
          .from(ratings)
          .where(and(forItem, eq(ratings.userId, userId)))
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    likes: totals[0]?.likes ?? 0,
    dislikes: totals[0]?.dislikes ?? 0,
    userVote: mine[0]?.value ?? 0,
  };
}

// value: 1 = like, -1 = dislike, 0 = remove my vote. Returns the fresh summary.
export async function setVote(userId, itemType, itemId, value) {
  if (value === 0) {
    await db
      .delete(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.itemType, itemType), eq(ratings.itemId, itemId)));
  } else {
    await db
      .insert(ratings)
      .values({ userId, itemType, itemId, value })
      .onConflictDoUpdate({
        target: [ratings.userId, ratings.itemType, ratings.itemId],
        set: { value, updatedAt: new Date() },
      });
  }
  return getRatingSummary(itemType, itemId, userId);
}

// Map of "type:id" -> { likes, dislikes } for every rated item. One query, used by search.
export async function getRatingTotals() {
  const rows = await db
    .select({
      itemType: ratings.itemType,
      itemId: ratings.itemId,
      likes: likesCount(),
      dislikes: dislikesCount(),
    })
    .from(ratings)
    .groupBy(ratings.itemType, ratings.itemId);

  return new Map(rows.map((r) => [keyOf(r.itemType, r.itemId), { likes: r.likes, dislikes: r.dislikes }]));
}

// Map of "type:id" -> 1 | -1 for everything this user has voted on.
export async function getUserVotes(userId) {
  if (!userId) return new Map();
  const rows = await db
    .select({ itemType: ratings.itemType, itemId: ratings.itemId, value: ratings.value })
    .from(ratings)
    .where(eq(ratings.userId, userId));
  return new Map(rows.map((r) => [keyOf(r.itemType, r.itemId), r.value]));
}

// Lower bound of the 95% Wilson confidence interval for the like ratio.
// Ranks 90 likes / 10 dislikes above 1 like / 0 dislikes, which a plain
// percentage would get backwards. Range 0..1; unrated items score 0.
export function wilsonScore(likes, dislikes) {
  const n = likes + dislikes;
  if (n === 0) return 0;
  const z = 1.96;
  const p = likes / n;
  return (
    (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n)
  );
}
