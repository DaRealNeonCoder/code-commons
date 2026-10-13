import { getRequestAccess } from "@/lib/access";
import { listNotifications, markNotificationsRead, unreadNotificationCount } from "@/lib/notifications";

async function userId(request) {
  return getRequestAccess(request);
}

export async function GET(request) {
  const access = await userId(request);
  const id = access.user?.id || null;
  if (!id) return Response.json({ error: "Not signed in." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  return Response.json({ notifications: await listNotifications(id, { unreadOnly }), unread: await unreadNotificationCount(id) });
}

export async function POST(request) {
  const access = await userId(request);
  const id = access.user?.id || null;
  if (!id) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (access.ban) return Response.json({ error: "Your account is restricted from interacting." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((value) => typeof value === "string") : [];
  await markNotificationsRead(id, ids);
  return Response.json({ ok: true });
}
