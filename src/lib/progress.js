import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { progress } from "./db/schema";

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
    await db.insert(progress).values({ userId, itemType, itemId }).onConflictDoNothing();
  } else {
    await db
      .delete(progress)
      .where(and(eq(progress.userId, userId), eq(progress.itemType, itemType), eq(progress.itemId, itemId)));
  }
}

export async function getCompletedIds(userId, itemType) {
  const rows = await db
    .select({ itemId: progress.itemId })
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.itemType, itemType)));
  return rows.map((row) => row.itemId);
}
