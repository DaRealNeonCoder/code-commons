import { auth } from "./auth";
import { getActiveBan, getEffectiveRole } from "./moderation";

// Use this for authenticated mutation routes. Ban state is read from the
// database so an old session cannot bypass a newly applied restriction.
export async function getRequestAccess(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user ?? null;
  if (!user) return { user: null, role: null, ban: null };
  return { user, role: await getEffectiveRole(user), ban: await getActiveBan(user.id) };
}

export function accessError(access, action = "perform this action") {
  if (!access.user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (access.ban) return Response.json({ error: `Your account is restricted from ${action}.` }, { status: 403 });
  return null;
}
