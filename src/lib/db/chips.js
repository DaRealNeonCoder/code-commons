import { and, asc, eq, or } from "drizzle-orm";
import { db } from "./index";
import { chips } from "./schema";

// What the browser gets: never the owner id, plus a per-viewer "mine" flag.
function toClientChip(row, userId) {
  return {
    ...row.data,
    id: row.id,
    name: row.name,
    visibility: row.visibility === "private" ? "private" : "public",
    mine: Boolean(userId) && row.ownerId === userId,
  };
}

// Public chips from everyone, plus the signed-in user's own private chips.
export async function listVisibleChips(userId = null) {
  const visible = userId
    ? or(eq(chips.visibility, "public"), eq(chips.ownerId, userId))
    : eq(chips.visibility, "public");
  const rows = await db.select().from(chips).where(visible).orderBy(asc(chips.name));
  return rows.map((row) => toClientChip(row, userId));
}

// Insert, or update when the chip already belongs to ownerId.
// Returns false when the id is taken by someone else.
export async function saveChip({ id, ownerId, ownerName = "", visibility, name, data }) {
  const rows = await db
    .insert(chips)
    .values({ id, ownerId, ownerName, visibility, name, data })
    .onConflictDoUpdate({
      target: chips.id,
      set: { ownerName, visibility, name, data, updatedAt: new Date() },
      setWhere: eq(chips.ownerId, ownerId),
    })
    .returning({ id: chips.id });
  return rows.length > 0;
}

// "ok" | "not_found" | "forbidden"
export async function setChipVisibility({ id, ownerId, visibility }) {
  const rows = await db
    .update(chips)
    .set({ visibility, updatedAt: new Date() })
    .where(and(eq(chips.id, id), eq(chips.ownerId, ownerId)))
    .returning({ id: chips.id });
  if (rows.length > 0) return "ok";
  const [exists] = await db.select({ id: chips.id }).from(chips).where(eq(chips.id, id)).limit(1);
  return exists ? "forbidden" : "not_found";
}
