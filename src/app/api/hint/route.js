import { NextResponse } from "next/server";

// Swap for "gemini-flash-latest" if you'd rather always ride the newest
// flash model instead of pinning a version.
const MODEL = "gemini-3.8-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_INSTRUCTIONS = `
You are a friendly, patient coding tutor embedded in a "learn to code" website,
attached to one specific lesson page. A student can ask you for a hint, a
clarification, or a free-form question while they work through that lesson.

You will be given:
- The lesson's raw markdown content (may include callouts, tables, math,
  Mermaid diagram source, and references to demo videos/images you can't see
  — treat the surrounding prose as the explanation of those).
- The student's current code in the editor (their live, possibly unfinished
  or broken attempt).
- A mode ("hint", "clarify", or "question") and optionally the student's own
  question.

Rules:
- NEVER give the full solution or rewrite their code for them. If they ask
  for the answer, give the biggest hint you can without just
  handing over working code.
- For "hint": give the smallest nudge that would unblock them — point at the
  concept, function, or line that's likely the issue, without fixing it.
- For "clarify": explain the underlying concept from the lesson in different,
  simpler words than the lesson uses. Assume they've read the lesson but a
  specific part isn't clicking.
- For "question": just answer what they asked, using the lesson + their code
  as context.
- Reference their actual code (variable/function names, line content) when it
  helps, but keep it conversational, not a code review.
- Keep it short: 2-5 sentences, plain text, no markdown headers or code
  fences unless a tiny inline snippet genuinely clarifies something.
- If the code looks correct and close to done, say so encouragingly.
`.trim();

export async function POST(req) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI hints aren't configured yet (missing GEMINI_API_KEY)." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { mode, lessonContent, code, language, question } = body || {};

  if (!lessonContent || typeof code !== "string") {
    return NextResponse.json({ error: "Missing lesson context." }, { status: 400 });
  }

  // Keep prompts small & predictable — both comfortably fit gemini-2.5-flash's
  // context window, but capping avoids surprise cost/latency if a lesson or
  // a student's code ever balloons.
  const trimmedLesson = String(lessonContent).slice(0, 8000);
  const trimmedCode = String(code).slice(0, 4000);
  const trimmedQuestion = typeof question === "string" ? question.slice(0, 500).trim() : "";

  const modeLabel = mode === "clarify" ? "clarify" : mode === "question" ? "question" : "hint";

  const userPrompt = `
LESSON CONTENT (markdown):
"""
${trimmedLesson}
"""

STUDENT'S CURRENT CODE (${language || "unknown language"}):
"""
${trimmedCode}
"""

MODE: ${modeLabel}
${
  trimmedQuestion
    ? `STUDENT'S QUESTION: ${trimmedQuestion}`
    : "(no specific question — give a general hint/clarification based on the lesson and their code above)"
}
`.trim();

  try {
    const geminiRes = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTIONS }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
      }),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("Gemini API error:", data);
      return NextResponse.json(
        { error: data?.error?.message || "The AI request failed." },
        { status: 502 }
      );
    }

    const answer =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim() ||
      "Sorry, I couldn't come up with anything there — try rephrasing your question.";

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Gemini fetch failed:", err);
    return NextResponse.json({ error: "Network error reaching the AI." }, { status: 502 });
  }
}