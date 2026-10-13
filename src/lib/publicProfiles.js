import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { builds, circuits, courses, lessons, puzzles, shaders, user } from "@/lib/db/schema";
import { getAllContent } from "@/lib/content";
import { getAllPuzzles } from "@/lib/puzzles";
import { getLessons } from "@/lib/lessonStore";
import { getCompletedIds, getProgressEntries } from "@/lib/progress";
import { getRatingTotals, wilsonScore } from "@/lib/ratings";
import { getUserAvatar } from "@/lib/profile";
import { getPublishedForProjects } from "@/lib/publishedStatus";
import { listProjects } from "@/lib/creatorProjects";

const CONTENT_TABLES = [
  ["lesson", lessons, (id) => `/lessons/${id}`],
  ["puzzle", puzzles, (id) => `/puzzles/${id}`],
  ["shader", shaders, (id) => `/shaders/${id}`],
  ["circuit", circuits, (id) => `/circuits/${id}`],
  ["project", builds, (id) => `/projects/${id}`],
  ["course", courses, (id) => `/courses/${id}`],
];

function iso(value) {
  return value instanceof Date ? value.toISOString() : value ? String(value) : null;
}

function ratingFor(totals, type, id) {
  const rating = totals.get(`${type}:${id}`) || { likes: 0, dislikes: 0 };
  const total = rating.likes + rating.dislikes;
  return {
    likes: rating.likes,
    dislikes: rating.dislikes,
    total,
    likeRate: total ? Math.round((rating.likes / total) * 100) : null,
    score: wilsonScore(rating.likes, rating.dislikes),
  };
}

async function getPublishedContent(userId, includeUnavailable = false) {
  const rowsByType = await Promise.all(
    CONTENT_TABLES.map(async ([type, table, href]) => {
      const rows = await db
        .select({
          id: table.slug,
          title: table.title,
          summary: table.summary,
          available: table.available,
          projectId: table.projectId,
          createdAt: table.createdAt,
          updatedAt: table.updatedAt,
        })
        .from(table)
        .where(and(eq(table.ownerId, userId), includeUnavailable ? undefined : eq(table.available, true)))
        .orderBy(asc(table.updatedAt));
      return rows.map((row) => ({ ...row, type, href: href(row.id), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) }));
    })
  );
  return rowsByType.flat();
}

export async function getOwnedProjectSummaries(userId) {
  const [projects, published, totals] = await Promise.all([
    listProjects(userId),
    getPublishedContent(userId, true),
    getRatingTotals(),
  ]);
  const publishedByProject = new Map(published.filter((item) => item.projectId).map((item) => [item.projectId, item]));
  const publishedStatus = await getPublishedForProjects(projects);

  return projects.map((project) => {
    const publishedItem = publishedByProject.get(project.id);
    const publication = publishedStatus[project.id] || null;
    const rating = publishedItem ? ratingFor(totals, publishedItem.type, publishedItem.id) : null;
    return {
      ...project,
      title: project.title.trim() || "Untitled project",
      publication: publication ? { ...publication, href: publishedItem?.href || null } : null,
      rating,
    };
  });
}

export async function getPublicProfile(userId) {
  if (typeof userId !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(userId)) return null;
  const [profileRows, authored, totals, progressEntries, allContent, completedPuzzleIds, completedLessonIds, puzzlesList, lessonsList] = await Promise.all([
    db.select({ id: user.id, name: user.name, createdAt: user.createdAt }).from(user).where(eq(user.id, userId)).limit(1),
    getPublishedContent(userId),
    getRatingTotals(),
    getProgressEntries(userId),
    getAllContent(),
    getCompletedIds(userId, "puzzle"),
    getCompletedIds(userId, "lesson"),
    getAllPuzzles(),
    getLessons(),
  ]);
  const profile = profileRows[0];
  if (!profile) return null;

  const avatar = await getUserAvatar(userId);
  const content = authored.map((item) => ({ ...item, rating: ratingFor(totals, item.type, item.id) }));
  const byType = Object.fromEntries(CONTENT_TABLES.map(([type]) => [type, content.filter((item) => item.type === type).length]));
  const likes = content.reduce((sum, item) => sum + item.rating.likes, 0);
  const dislikes = content.reduce((sum, item) => sum + item.rating.dislikes, 0);
  const availableByKey = new Map(allContent.filter((item) => item.available !== false).map((item) => [`${item.type}:${item.id}`, item]));
  const completed = progressEntries
    .map((entry) => availableByKey.get(`${entry.itemType}:${entry.itemId}`))
    .filter(Boolean);
  const completedPuzzles = puzzlesList
    .filter((item) => item.available && completedPuzzleIds.includes(item.id))
    .map((item) => ({ id: item.id, title: item.title, href: `/puzzles/${item.id}`, type: "puzzle" }));
  const completedLessons = lessonsList
    .filter((item) => item.available && completedLessonIds.includes(item.id))
    .map((item) => ({ id: item.id, title: item.title, href: `/lessons/${item.id}`, type: "lesson" }));

  return {
    profile: {
      id: profile.id,
      name: profile.name || "anonymous",
      joinedAt: iso(profile.createdAt),
      image: avatar?.image || null,
      defaultImage: avatar?.defaultImage || null,
      scale: avatar?.scale || 1,
      positionX: avatar?.positionX || 0,
      positionY: avatar?.positionY || 0,
    },
    summary: {
      publishedCount: content.length,
      byType,
      likes,
      dislikes,
      totalVotes: likes + dislikes,
      likeRate: likes + dislikes ? Math.round((likes / (likes + dislikes)) * 100) : null,
      completedCount: completed.length,
      completedPuzzles,
      completedLessons,
    },
    content,
  };
}
