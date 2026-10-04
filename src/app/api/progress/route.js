import { auth } from "@/lib/auth";
import { isCompleted, setCompleted } from "@/lib/progress";

async function getUserId(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id ?? null;
}

const validKey = (v) => typeof v === "string" && v.length > 0 && v.length <= 200;

export async function GET(request) {
  const userId = await getUserId(request);
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
  const userId = await getUserId(request);
  if (!userId) return Response.json({ error: "Not signed in." }, { status: 401 });

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
