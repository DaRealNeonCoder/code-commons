import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { setCompleted, isCompleted } from "@/lib/progress";
const VALID_TYPES = ["lesson", "puzzle"];

async function getCurrentSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (err) {
    // If this throws (e.g. the auth database hasn't been migrated yet),
    // treat it as "not signed in" instead of crashing the route — a
    // response that fails to be valid JSON is what turns into a client
    // crash, not a normal error response.
    console.error("auth.api.getSession failed:", err);
    return null;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get("itemType");
    const itemId = searchParams.get("itemId");

    if (!VALID_TYPES.includes(itemType) || !itemId) {
      return Response.json({ error: "Invalid itemType or itemId." }, { status: 400 });
    }

    const session = await getCurrentSession();
    if (!session) {
      return Response.json({ completed: false });
    }

    return Response.json({ completed: await isCompleted(session.user.id, itemType, itemId) });
  } catch (err) {
    console.error("GET /api/progress failed:", err);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return Response.json({ error: "Sign in to track progress." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const itemType = body?.itemType;
    const itemId = body?.itemId;
    const completed = body?.completed ?? true;

    if (!VALID_TYPES.includes(itemType) || typeof itemId !== "string" || !itemId) {
      return Response.json({ error: "Invalid itemType or itemId." }, { status: 400 });
    }

    await setCompleted(session.user.id, itemType, itemId, Boolean(completed));

    return Response.json({ completed: Boolean(completed) });
  } catch (err) {
    console.error("POST /api/progress failed:", err);
    return Response.json({ error: "Something went wrong." }, { status: 500 });
  }
}
