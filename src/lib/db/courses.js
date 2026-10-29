import { and, arrayContains, asc, eq } from "drizzle-orm";
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
    available: row.available,
    lessons: row.lessonIds,
    courses: row.courseIds,
    projectId: row.projectId,
    ownerId: row.ownerId, // server-side only
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getCourseBySlug(slug) {
  const [row] = await db.select().from(courses).where(and(eq(courses.slug, slug), eq(courses.available, true))).limit(1);
  return toCourse(row);
}

export async function getCourseByProjectId(projectId) {
  const [row] = await db.select().from(courses).where(eq(courses.projectId, projectId)).limit(1);
  return toCourse(row);
}

// Oldest first, so "the first course containing a lesson" is stable.
export async function listCourses() {
  const rows = await db.select().from(courses).where(eq(courses.available, true)).orderBy(asc(courses.createdAt));
  return rows.map(toCourse);
}

export async function listCoursesWithLesson(lessonId) {
  const rows = await db
    .select()
    .from(courses)
    .where(and(arrayContains(courses.lessonIds, [lessonId]), eq(courses.available, true)))
    .orderBy(asc(courses.createdAt));
  return rows.map(toCourse);
}

export async function saveCourse({ ownerId, projectId = null, slug = null, title, summary = "", lessons, courses: courseIds = [], available = true }) {
  const values = {
    title: title.slice(0, LIMITS.title),
    summary: summary.slice(0, LIMITS.summary),
    available,
    lessonIds: lessons,
    courseIds,
  };
  return upsertWithSlug(courses, { values, ownerId, projectId, pinnedSlug: slug, title, fallback: "course" });
}
