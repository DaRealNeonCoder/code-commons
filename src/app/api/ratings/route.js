import { auth } from "@/lib/auth";
import { getRatingSummary, isRatingType, setVote } from "@/lib/ratings";

async function getUserId(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user?.id ?? null;
}

const validKey = (v) => typeof v === "string" && v.length > 0 && v.length <= 200;

// Public: anyone can read counts. userVote is only filled in when signed in.
export async function GET(request) {
  const userId = await getUserId(request);

  const { searchParams } = new URL(request.url);
  const itemType = searchParams.get("itemType");
  const itemId = searchParams.get("itemId");
  if (!isRatingType(itemType) || !validKey(itemId)) {
    return Response.json({ error: "A valid itemType and itemId are required." }, { status: 400 });
  }

  return Response.json(getRatingSummary(itemType, itemId, userId));
}

// value: 1 = like, -1 = dislike, 0 = remove vote.
export async function POST(request) {
  const userId = await getUserId(request);
  if (!userId) return Response.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!isRatingType(body?.itemType) || !validKey(body?.itemId) || ![1, -1, 0].includes(body?.value)) {
    return Response.json(
      { error: "itemType, itemId and a value of 1, -1 or 0 are required." },
      { status: 400 }
    );
  }

  return Response.json(setVote(userId, body.itemType, body.itemId, body.value));
}