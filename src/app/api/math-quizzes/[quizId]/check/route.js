import { getPuzzleById } from "@/lib/puzzles";
import { checkMathQuiz } from "@/lib/mathQuiz";

export async function POST(request, { params }) {
  const { quizId } = await params;
  const puzzle = await getPuzzleById(quizId);
  if (!puzzle || puzzle.kind !== "math-quiz") {
    return Response.json({ error: "Math quiz not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const body = await request.json().catch(() => null);
  const result = checkMathQuiz(puzzle.quizConfig, body?.answers);
  if (!result) {
    return Response.json({ error: "Submit one answer for each quiz question." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
