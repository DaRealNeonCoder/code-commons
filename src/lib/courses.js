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

// Reverse lookup: does this lesson belong to a course? Used to show a
// "part of <course>" backlink without lessons needing to declare their own
// course membership (avoids two sources of truth for the same fact).
export function getCourseForLesson(lessonId) {
  for (const course of getAllCourses()) {
    if (course.lessons.includes(lessonId)) {
      return { id: course.id, title: course.title };
    }
  }
  return null;
}
