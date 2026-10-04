import { auth } from "@/lib/auth";
import { getProject } from "@/lib/creatorProjects";
import { findMissingLessonIds } from "@/lib/lessonStore";
import { saveCourse } from "@/lib/db/courses";
import { saveErrorResponse } from "@/lib/publish";

// Publishes a course project to the database. A course is only a title, a
// summary and an ordered list of lesson ids; nothing is copied. Re-publishing the
// same project updates the same course. Ownership comes from the project, and the
// update only applies to a row owned by the session user.
export async function POST(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  if (!user) {
    return Response.json({ error: "Sign in to publish a course." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const project = typeof body?.projectId === "string" ? await getProject(body.projectId) : null;
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
  if (lessons.length > 200) {
    return Response.json({ error: "A course can have at most 200 lessons." }, { status: 400 });
  }

  const missing = await findMissingLessonIds(lessons);
  if (missing.length > 0) {
    return Response.json({ error: `No lesson found with ID: ${missing.join(", ")}.` }, { status: 400 });
  }

  const result = await saveCourse({ ownerId: user.id, projectId: project.id, title, summary, lessons });
  if (!result.ok) return saveErrorResponse(result);

  return Response.json({ id: result.slug });
}
