import { auth } from "@/lib/auth";
import { createProject } from "@/lib/creatorProjects";
import { TYPE_IDS } from "@/lib/creatorTypes";

export async function POST(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  if (!user) {
    return Response.json({ error: "Sign in to create a project." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !TYPE_IDS.includes(body.type)) {
    return Response.json({ error: "Unknown project type." }, { status: 400 });
  }

  const id = await createProject(user.id, body.type);
  return Response.json({ id });
}
