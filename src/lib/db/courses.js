import { arrayContains, asc, eq } from "drizzle-orm";
import { db } from "./index";
import { courses } from "./schema";
import { LIMITS, upsertWithSlug } from "./content";

// Shaped like the old content/courses/*.json objects: { id, title, summary, lessons }.
function toCourse(row) {
  if (!row) return null;
  return {
    id: row.slug,
    title: row.title,
    summary: row.summary,
    lessons: row.lessonIds,
    projectId: row.projectId,
    ownerId: row.ownerId, // server-side only
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getCourseBySlug(slug) {
  const [row] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  return toCourse(row);
}

export async function getCourseByProjectId(projectId) {
  const [row] = await db.select().from(courses).where(eq(courses.projectId, projectId)).limit(1);
  return toCourse(row);
}

// Oldest first, so "the first course containing a lesson" is stable.
export async function listCourses() {
  const rows = await db.select().from(courses).orderBy(asc(courses.createdAt));
  return rows.map(toCourse);
}

export async function listCoursesWithLesson(lessonId) {
  const rows = await db
    .select()
    .from(courses)
    .where(arrayContains(courses.lessonIds, [lessonId]))
    .orderBy(asc(courses.createdAt));
  return rows.map(toCourse);
}

export async function saveCourse({ ownerId, projectId = null, slug = null, title, summary = "", lessons }) {
  const values = {
    title: title.slice(0, LIMITS.title),
    summary: summary.slice(0, LIMITS.summary),
    lessonIds: lessons,
  };
  return upsertWithSlug(courses, { values, ownerId, projectId, pinnedSlug: slug, title, fallback: "course" });
}
