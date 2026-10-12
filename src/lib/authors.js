import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { builds, circuits, courses, lessons, puzzles, shaders, user } from "@/lib/db/schema";

const ORIGINAL_OWNER = "system";
const CONTENT_TABLES = { lesson: lessons, puzzle: puzzles, shader: shaders, circuit: circuits, course: courses, project: builds };

async function authorForOwner(ownerId) {
  if (!ownerId || ownerId === ORIGINAL_OWNER) return { name: "original", image: null, scale: 1, positionX: 0, positionY: 0, original: true };

  const rows = await db
    .select({
      name: user.name,
      image: user.image,
      customImage: user.customImage,
      customImageScale: user.customImageScale,
      customImageX: user.customImageX,
      customImageY: user.customImageY,
    })
    .from(user)
    .where(eq(user.id, ownerId))
    .limit(1);
  const author = rows[0];
  return author
    ? {
        name: author.name || "anonymous",
        image: author.customImage || author.image || null,
        scale: author.customImage ? Number(author.customImageScale || 1) : 1,
        positionX: author.customImage ? Number(author.customImageX || 0) : 0,
        positionY: author.customImage ? Number(author.customImageY || 0) : 0,
        original: false,
      }
    : { name: "original", image: null, scale: 1, positionX: 0, positionY: 0, original: true };
}

export async function getContentAuthor(itemType, itemId) {
  const table = CONTENT_TABLES[itemType];
  if (!table || typeof itemId !== "string" || !itemId || itemId.length > 200) {
    return { name: "original", image: null, scale: 1, positionX: 0, positionY: 0, original: true };
  }

  const rows = await db
    .select({ ownerId: table.ownerId })
    .from(table)
    .where(eq(table.slug, itemId))
    .limit(1);
  return authorForOwner(rows[0]?.ownerId);
}
