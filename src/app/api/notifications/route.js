import { auth } from "@/lib/auth";
import { listNotifications, markNotificationsRead, unreadNotificationCount } from "@/lib/notifications";

async function userId(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id || null;
}

export async function GET(request) {
  const id = await userId(request);
  if (!id) return Response.json({ error: "Not signed in." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  return Response.json({ notifications: await listNotifications(id, { unreadOnly }), unread: await unreadNotificationCount(id) });
}

export async function POST(request) {
  const id = await userId(request);
  if (!id) return Response.json({ error: "Not signed in." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((value) => typeof value === "string") : [];
  await markNotificationsRead(id, ids);
  return Response.json({ ok: true });
}
