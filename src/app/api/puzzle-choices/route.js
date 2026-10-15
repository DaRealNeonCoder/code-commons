import { getRequestAccess } from "@/lib/access";
import { getPuzzleChoices } from "@/lib/puzzleChoices";

const MAX_QUERY_LENGTH = 100;

export async function GET(request) {
  const access = await getRequestAccess(request);
  if (!access.user) return Response.json({ error: "Sign in to search puzzles." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").slice(0, MAX_QUERY_LENGTH);
  const selected = searchParams
    .getAll("selected")
    .flatMap((value) => value.split(","))
    .slice(0, 100);

  return Response.json({ puzzles: await getPuzzleChoices({ query, selectedRefs: selected, limit: 10 }) });
}
