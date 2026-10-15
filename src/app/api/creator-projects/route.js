import { getRequestAccess } from "@/lib/access";
import { createProject } from "@/lib/creatorProjects";
import { TYPE_IDS } from "@/lib/creatorTypes";

export async function POST(request) {
  const access = await getRequestAccess(request);
  const user = access.user;
  if (!user) {
    return Response.json({ error: "Sign in to create a project." }, { status: 401 });
  }
  if (access.ban) return Response.json({ error: "Your account is restricted from creating content." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || !TYPE_IDS.includes(body.type)) {
    return Response.json({ error: "Unknown project type." }, { status: 400 });
  }

  // Menu presets may seed a new project, but the server owns the allowed
  // values so a client cannot store arbitrary draft data in this endpoint.
  const initialData =
    body.type === "puzzle" && body.initialData?.kind === "math-quiz"
      ? { kind: "math-quiz" }
      : {};

  const id = await createProject(user.id, body.type, initialData);
  return Response.json({ id });
}
