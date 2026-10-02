import fs from "node:fs";
import path from "node:path";

const COURSES_DIR = path.join(process.cwd(), "content/courses");

function readCourseFile(fileName) {
  const id = fileName.replace(/\.json$/, "");
  const raw = fs.readFileSync(path.join(COURSES_DIR, fileName), "utf8");
  const data = JSON.parse(raw);
  return { id, lessons: [], ...data };
}

export function getAllCourses() {
  if (!fs.existsSync(COURSES_DIR)) return [];
  return fs
    .readdirSync(COURSES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map(readCourseFile);
}

export function getCourseById(id) {
  const fullPath = path.join(COURSES_DIR, `${id}.json`);
  if (!fs.existsSync(fullPath)) return null;
  return readCourseFile(`${id}.json`);
}

// Reverse lookup: every course that contains this lesson. Lessons don't declare
// their own course membership (avoids two sources of truth for the same fact),
// and one lesson can be in several courses.
export function getCoursesForLesson(lessonId) {
  return getAllCourses()
    .filter((course) => course.lessons.includes(lessonId))
    .map((course) => ({ id: course.id, title: course.title }));
}

// The first course containing this lesson, or null. This is the default for
// links that don't say which course the reader came from (search results,
// direct URLs). Course-aware links pass ?course= and use getCoursesForLesson.
export function getCourseForLesson(lessonId) {
  return getCoursesForLesson(lessonId)[0] ?? null;
}