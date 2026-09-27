"use client";

import { useState } from "react";
import Image from "next/image";

export default function AITutor({ lessonContent, code, language }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]); // { mode, question, answer }[]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function ask(mode) {
    if (loading) return;
    setLoading(true);
    setError(null);
    const askedQuestion = question.trim();

    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          lessonContent,
          code,
          language,
          question: askedQuestion || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages((prev) => [...prev, { mode, question: askedQuestion, answer: data.answer }]);
      setQuestion("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ask the AI tutor"
        className="fixed bottom-6 right-6 z-40 h-24 w-24 overflow-hidden rounded-lg shadow-lg transition hover:scale-105 hover:shadow-xl"
      >
        <Image
          src="/character.webp"
          alt=""
          fill
          sizes="96px"
          style={{ imageRendering: "pixelated" }}
          className="object-cover"
          priority
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/20 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[28rem] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <span className="font-mono text-sm font-medium">AI Tutor</span>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
              {messages.length === 0 && !loading && (
                <p className="text-zinc-400">
                  Stuck, or want something explained? Ask below, or tap a quick action.
                </p>
              )}
              {messages.map((m, i) => (
                <div key={i} className="space-y-1">
                  {m.question ? (
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">You: {m.question}</p>
                  ) : (
                    <p className="text-xs uppercase tracking-wide text-zinc-400">
                      {m.mode === "clarify" ? "Clarification" : "Hint"}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{m.answer}</p>
                </div>
              ))}
              {loading && <p className="text-zinc-400">Thinking…</p>}
              {error && <p className="text-red-500">{error}</p>}
            </div>

            <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
              <div className="mb-2 flex gap-2">
                <button
                  onClick={() => ask("hint")}
                  disabled={loading}
                  className="flex-1 rounded bg-zinc-100 px-2 py-1.5 text-xs font-medium hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  Give me a hint
                </button>
                <button
                  onClick={() => ask("clarify")}
                  disabled={loading}
                  className="flex-1 rounded bg-zinc-100 px-2 py-1.5 text-xs font-medium hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  Clarify this lesson
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask("question")}
                  placeholder="Or ask something specific…"
                  className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
                <button
                  onClick={() => ask("question")}
                  disabled={loading || !question.trim()}
                  className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}