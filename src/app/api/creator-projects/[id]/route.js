import { getRequestAccess } from "@/lib/access";
import { updateProject, deleteProject } from "@/lib/creatorProjects";
import { validateReactDemoDrafts } from "@/lib/reactDemo";

const MAX_DATA_CHARS = 2_000_000;

async function getUser(request) {
  return getRequestAccess(request);
}

export async function PUT(request, { params }) {
  const access = await getUser(request);
  const user = access.user;
  if (!user) {
    return Response.json({ error: "Sign in to save projects." }, { status: 401 });
  }
  if (access.ban) return Response.json({ error: "Your account is restricted from creating content." }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const dataIsObject = body?.data && typeof body.data === "object" && !Array.isArray(body.data);
  if (!body || typeof body.title !== "string" || !dataIsObject) {
    return Response.json({ error: "Invalid project data." }, { status: 400 });
  }

  if (JSON.stringify(body.data).length > MAX_DATA_CHARS) {
    return Response.json({ error: "Project is too large to save." }, { status: 413 });
  }
  const demoError = validateReactDemoDrafts(body.data.reactDemos);
  if (demoError) return Response.json({ error: demoError }, { status: 400 });

  try {
    // The WHERE clause includes user_id, so you can only ever write to your own projects.
    const ok = await updateProject(id, user.id, { title: body.title, data: body.data });
    if (!ok) {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    // e.g. Postgres rejects a NUL character inside jsonb text.
    console.error("PUT /api/creator-projects failed:", err);
    return Response.json({ error: "Couldn't save the project." }, { status: 500 });
  }
}

// DELETE /api/creator-projects/:id
export async function DELETE(request, { params }) {
  const access = await getUser(request);
  const user = access.user;
  if (!user) {
    return Response.json({ error: "Sign in to delete projects." }, { status: 401 });
  }
  if (access.ban) return Response.json({ error: "Your account is restricted from creating content." }, { status: 403 });

  const { id } = await params;
  if (!(await deleteProject(id, user.id))) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }
  return Response.json({ ok: true });
}
