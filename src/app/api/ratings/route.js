import { getRequestAccess } from "@/lib/access";
import { getRatingSummary, isRatingType, setVote } from "@/lib/ratings";

async function getUserId(request) {
  return getRequestAccess(request);
}

const validKey = (v) => typeof v === "string" && v.length > 0 && v.length <= 200;

// Public: anyone can read counts. userVote is only filled in when signed in.
export async function GET(request) {
  const access = await getUserId(request);
  const userId = access.user?.id ?? null;

  const { searchParams } = new URL(request.url);
  const itemType = searchParams.get("itemType");
  const itemId = searchParams.get("itemId");
  if (!isRatingType(itemType) || !validKey(itemId)) {
    return Response.json({ error: "A valid itemType and itemId are required." }, { status: 400 });
  }

  return Response.json(await getRatingSummary(itemType, itemId, userId));
}

// value: 1 = like, -1 = dislike, 0 = remove vote.
export async function POST(request) {
  const access = await getUserId(request);
  const userId = access.user?.id ?? null;
  if (!userId) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (access.ban) return Response.json({ error: "Your account is restricted from interacting." }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!isRatingType(body?.itemType) || !validKey(body?.itemId) || ![1, -1, 0].includes(body?.value)) {
    return Response.json(
      { error: "itemType, itemId and a value of 1, -1 or 0 are required." },
      { status: 400 }
    );
  }

  return Response.json(await setVote(userId, body.itemType, body.itemId, body.value));
}
