import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./db";
import { dailyActivity, progress } from "./db/schema";
import { notifyCourseActivity } from "./notifications";

function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(later, earlier) {
  const laterMs = Date.parse(`${later}T00:00:00.000Z`);
  const earlierMs = Date.parse(`${earlier}T00:00:00.000Z`);
  return Math.round((laterMs - earlierMs) / 86_400_000);
}

// Solving a puzzle is qualifying activity. This is deliberately separate from
// authentication/session reads, so logging in never starts or extends a streak.
export async function recordPuzzleActivity(userId) {
  await db
    .insert(dailyActivity)
    .values({ userId, activityDate: utcDateString() })
    .onConflictDoNothing();
}

export async function getCurrentStreak(userId) {
  const rows = await db
    .select({ activityDate: dailyActivity.activityDate })
    .from(dailyActivity)
    .where(eq(dailyActivity.userId, userId))
    .orderBy(desc(dailyActivity.activityDate));

  if (rows.length === 0) return 0;

  const today = utcDateString();
  const latest = rows[0].activityDate;
  const latestToToday = daysBetween(today, latest);

  // A streak is still current through the day after the last activity. Once a
  // full day has been missed, the next qualifying activity starts at one.
  if (latestToToday > 1 || latestToToday < 0) return 0;

  let streak = 1;
  for (let i = 1; i < rows.length; i += 1) {
    if (daysBetween(rows[i - 1].activityDate, rows[i].activityDate) !== 1) break;
    streak += 1;
  }
  return streak;
}

export async function isCompleted(userId, itemType, itemId) {
  const rows = await db
    .select({ itemId: progress.itemId })
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.itemType, itemType), eq(progress.itemId, itemId)))
    .limit(1);
  return rows.length > 0;
}

export async function setCompleted(userId, itemType, itemId, completed) {
  if (completed) {
    // Idempotent: re-completing keeps the original completed_at.
    const inserted = await db.insert(progress).values({ userId, itemType, itemId }).onConflictDoNothing().returning({ itemId: progress.itemId });
    if (itemType === "puzzle") await recordPuzzleActivity(userId);
    if (inserted.length) await notifyCourseActivity({ actorId: userId, itemType, itemId });
    return inserted.length > 0;
  } else {
    await db
      .delete(progress)
      .where(and(eq(progress.userId, userId), eq(progress.itemType, itemType), eq(progress.itemId, itemId)));
    return false;
  }
}

export async function getCompletedIds(userId, itemType) {
  const rows = await db
    .select({ itemId: progress.itemId })
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.itemType, itemType)));
  return rows.map((row) => row.itemId);
}

// The profile analytics view needs dates as well as IDs. Keep this separate
// from getCompletedIds so existing progress consumers stay lightweight.
export async function getProgressEntries(userId) {
  return db
    .select({ itemType: progress.itemType, itemId: progress.itemId, completedAt: progress.completedAt })
    .from(progress)
    .where(eq(progress.userId, userId))
    .orderBy(desc(progress.completedAt));
}

export async function getActivityDates(userId) {
  const rows = await db
    .select({ activityDate: dailyActivity.activityDate })
    .from(dailyActivity)
    .where(eq(dailyActivity.userId, userId))
    .orderBy(asc(dailyActivity.activityDate));
  return rows.map((row) => row.activityDate);
}

export function calculateLongestStreak(dates) {
  if (!dates?.length) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < dates.length; i += 1) {
    if (daysBetween(dates[i], dates[i - 1]) === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (dates[i] !== dates[i - 1]) {
      current = 1;
    }
  }
  return longest;
}
