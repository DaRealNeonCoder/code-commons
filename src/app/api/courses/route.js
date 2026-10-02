import fs from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getProject } from "@/lib/creatorProjects";
import { getAllCourses } from "@/lib/courses";
import { getLessonById } from "@/lib/lessons";
import { LESSON_ID_PATTERN } from "@/lib/lessonPuzzles";

const COURSES_DIR = path.join(process.cwd(), "content/courses");

function slugify(input) {
  const base = (input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `course-${Date.now()}`;
}

function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (fs.existsSync(path.join(COURSES_DIR, `${slug}.json`))) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

// Publishes a course project as content/courses/<id>.json. A course is only a
// title, a summary and an ordered list of lesson IDs; nothing is copied.
//
// The file records which project it came from (`projectId`), so publishing the
// same project again updates the same course instead of creating a duplicate.
// Ownership comes from the project, which is only ever looked up for the
// signed-in user, so nobody can overwrite another person's course.
export async function POST(request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) {
    return Response.json({ error: "Sign in to publish a course." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const project = typeof body?.projectId === "string" ? getProject(body.projectId) : null;
  if (!project || project.type !== "course" || project.userId !== user.id) {
    return Response.json({ error: "That course project isn't yours." }, { status: 403 });
  }

  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) {
    return Response.json({ error: "A course title is required." }, { status: 400 });
  }
  const summary = typeof body.summary === "string" ? body.summary.trim().slice(0, 500) : "";

  // Keep the author's order, drop duplicates.
  const lessons = Array.isArray(body.lessons)
    ? [...new Set(body.lessons.filter((id) => typeof id === "string"))]
    : [];
  if (lessons.length === 0) {
    return Response.json({ error: "Add at least one lesson." }, { status: 400 });
  }
  const missing = lessons.filter((id) => !LESSON_ID_PATTERN.test(id) || !getLessonById(id));
  if (missing.length > 0) {
    return Response.json({ error: `No lesson found with ID: ${missing.join(", ")}.` }, { status: 400 });
  }

  fs.mkdirSync(COURSES_DIR, { recursive: true });

  const existing = getAllCourses().find((c) => c.projectId === project.id);
  const id = existing ? existing.id : uniqueSlug(slugify(title));
  const fullPath = path.join(COURSES_DIR, `${id}.json`);

  // Defense in depth: never write outside the courses directory.
  if (!fullPath.startsWith(COURSES_DIR + path.sep)) {
    return Response.json({ error: "Invalid course name." }, { status: 400 });
  }

  // No `id` in the file: courses.js takes the ID from the filename.
  const course = { title, summary, lessons, projectId: project.id };
  fs.writeFileSync(fullPath, JSON.stringify(course, null, 2) + "\n", "utf8");

  return Response.json({ id });
}