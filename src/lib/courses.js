import { cache } from "react";
import { getCourseBySlug, listCourses, listCoursesWithLesson } from "./db/courses";

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

// ownerId never leaves the lib layer.
const publicCourse = ({ ownerId, ...course }) => course;

export async function getAllCourses() {
  return (await listCourses()).map(publicCourse);
}

export const getCourseById = cache(async (id) => {
  if (typeof id !== "string" || !SLUG.test(id)) return null;
  const course = await getCourseBySlug(id);
  return course ? publicCourse(course) : null;
});

// Reverse lookup: every course that contains this lesson. Lessons don't declare
// their own course membership, and one lesson can be in several courses.
export async function getCoursesForLesson(lessonId) {
  if (typeof lessonId !== "string" || !SLUG.test(lessonId)) return [];
  const rows = await listCoursesWithLesson(lessonId);
  return rows.map((course) => ({ id: course.id, title: course.title }));
}

// The first course containing this lesson, or null.
export async function getCourseForLesson(lessonId) {
  return (await getCoursesForLesson(lessonId))[0] ?? null;
}
