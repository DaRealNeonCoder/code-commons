import { getRequestAccess } from "@/lib/access";
import { isCompleted, setCompleted } from "@/lib/progress";

async function getUserId(request) {
  return getRequestAccess(request);
}

const validKey = (v) => typeof v === "string" && v.length > 0 && v.length <= 200;

export async function GET(request) {
  const access = await getUserId(request);
  const userId = access.user?.id ?? null;
  if (!userId) return Response.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemType = searchParams.get("itemType");
  const itemId = searchParams.get("itemId");
  if (!validKey(itemType) || !validKey(itemId)) {
    return Response.json({ error: "itemType and itemId are required." }, { status: 400 });
  }

  return Response.json({ completed: await isCompleted(userId, itemType, itemId) });
}

export async function POST(request) {
  const access = await getUserId(request);
  const userId = access.user?.id ?? null;
  if (!userId) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (access.ban) return Response.json({ error: "Your account is restricted from interacting." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!validKey(body?.itemType) || !validKey(body?.itemId) || typeof body?.completed !== "boolean") {
    return Response.json(
      { error: "itemType, itemId and a boolean completed are required." },
      { status: 400 }
    );
  }

  await setCompleted(userId, body.itemType, body.itemId, body.completed);
  return Response.json({ completed: body.completed });
}
