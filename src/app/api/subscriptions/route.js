import { auth } from "@/lib/auth";
import { isCommentItemType } from "@/lib/comments";
import { isSubscribed, setSubscription } from "@/lib/notifications";

async function userId(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id || null;
}

export async function GET(request) {
  const id = await userId(request);
  if (!id) return Response.json({ error: "Not signed in." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const itemType = searchParams.get("itemType");
  const itemId = searchParams.get("itemId");
  if (!isCommentItemType(itemType) || !itemId) return Response.json({ error: "A valid item is required." }, { status: 400 });
  return Response.json({ subscribed: await isSubscribed({ userId: id, itemType, itemId }) });
}

export async function POST(request) {
  const id = await userId(request);
  if (!id) return Response.json({ error: "Not signed in." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!isCommentItemType(body?.itemType) || typeof body?.itemId !== "string" || typeof body?.subscribed !== "boolean") {
    return Response.json({ error: "itemType, itemId and subscribed are required." }, { status: 400 });
  }
  await setSubscription({ userId: id, itemType: body.itemType, itemId: body.itemId, subscribed: body.subscribed, events: Array.isArray(body.events) ? body.events : undefined });
  return Response.json({ subscribed: body.subscribed });
}
