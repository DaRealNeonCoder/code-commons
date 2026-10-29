import { getRequestAccess } from "@/lib/access";
import { getProject } from "@/lib/creatorProjects";
import { findMissingLessonIds } from "@/lib/lessonStore";
import { findMissingCourseIds } from "@/lib/courses";
import { saveCourse } from "@/lib/db/courses";
import { saveErrorResponse } from "@/lib/publish";
import { notifyPublished } from "@/lib/notifications";

// Publishes a course project to the database. A course is only a title, a
// summary and an ordered list of lesson ids; nothing is copied. Re-publishing the
// same project updates the same course. Ownership comes from the project, and the
// update only applies to a row owned by the session user.
export async function POST(request) {
  const access = await getRequestAccess(request);
  const user = access.user;
  if (!user) {
    return Response.json({ error: "Sign in to publish a course." }, { status: 401 });
  }
  if (access.ban) return Response.json({ error: "Your account is restricted from creating content." }, { status: 403 });

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

  // Keep the author's order for nested courses, drop duplicates.
  const courseIds = Array.isArray(body.courseIds)
    ? [...new Set(body.courseIds.filter((id) => typeof id === "string"))]
    : [];

  // A course must have at least one lesson or one nested course.
  if (lessons.length === 0 && courseIds.length === 0) {
    return Response.json({ error: "Add at least one lesson or nested course." }, { status: 400 });
  }
  if (lessons.length > 200) {
    return Response.json({ error: "A course can have at most 200 lessons." }, { status: 400 });
  }
  if (courseIds.length > 50) {
    return Response.json({ error: "A course can have at most 50 nested courses." }, { status: 400 });
  }

  const missingLessons = await findMissingLessonIds(lessons);
  if (missingLessons.length > 0) {
    return Response.json({ error: `No lesson found with ID: ${missingLessons.join(", ")}.` }, { status: 400 });
  }

  const missingCourses = await findMissingCourseIds(courseIds);
  if (missingCourses.length > 0) {
    return Response.json({ error: `No course found with ID: ${missingCourses.join(", ")}.` }, { status: 400 });
  }

  const result = await saveCourse({ ownerId: user.id, projectId: project.id, title, summary, lessons, courses: courseIds });
  if (!result.ok) return saveErrorResponse(result);

  await notifyPublished({ actorId: user.id, itemType: "course", itemId: result.slug, title });

  return Response.json({ id: result.slug });
}
