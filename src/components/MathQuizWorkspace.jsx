"use client";

import { useState } from "react";
import Link from "next/link";
import CompletionToggle from "@/components/CompletionToggle";
import AITutor from "@/components/AITutor";

function ResultSummary({ result }) {
  if (!result) return null;
  const complete = result.passed === result.total;
  return (
    <div className={`mt-5 rounded-md border p-4 text-sm ${complete ? "border-green-800 bg-green-950/30 text-green-300" : "border-amber-800 bg-amber-950/30 text-amber-300"}`}>
      <p>{complete ? `All ${result.total} questions correct!` : `${result.passed}/${result.total} questions correct. Try again.`}</p>
      {!complete && (
        <ul className="mt-2 space-y-1 text-xs text-zinc-400">
          {result.results.map((item, index) => (
            <li key={item.questionId}>{item.status === "pass" ? "✓" : "○"} Question {index + 1}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MathQuizWorkspace({
  questions,
  description,
  backHref = "/browse",
  backLabel = "browse",
  itemId,
  aiContext = "",
  aiContextTitle = "",
}) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const allAnswered = questions.every((question) => typeof answers[question.id] === "string" && answers[question.id].trim());

  function setAnswer(id, value) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setResult(null);
    setError("");
  }

  async function submit() {
    if (!allAnswered) {
      setError("Answer every question before checking.");
      return;
    }
    setChecking(true);
    setError("");
    try {
      const response = await fetch(`/api/math-quizzes/${encodeURIComponent(itemId)}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not check the quiz.");
      setResult(data);
      if (data.passed === data.total) {
        const progress = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType: "puzzle", itemId, completed: true }),
        });
        if (progress.ok) {
          window.dispatchEvent(new CustomEvent("progress-updated", { detail: { itemType: "puzzle", itemId, completed: true } }));
        }
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950 lg:flex-row">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-2xl">
          <Link href={backHref} className="font-mono text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">← {backLabel}</Link>
          <div className="mt-5">{description}</div>
        </div>
      </div>

      <div className="min-h-0 w-full overflow-y-auto border-t border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-zinc-900 lg:w-[min(46vw,38rem)] lg:border-l lg:border-t-0">
        <div className="mx-auto max-w-xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-teal-600 dark:text-teal-400">math quiz</span>
            <CompletionToggle itemType="puzzle" itemId={itemId} />
          </div>
          <div className="space-y-6">
            {questions.map((question, index) => (
              <fieldset key={question.id} className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
                <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-white">{index + 1}. {question.prompt}</legend>
                {question.type === "choice" ? (
                  <div className="mt-4 space-y-2">
                    {question.choices.map((choice) => (
                      <label key={choice.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 text-sm hover:border-teal-400 dark:border-zinc-700">
                        <input
                          type="radio"
                          name={question.id}
                          value={choice.id}
                          checked={answers[question.id] === choice.id}
                          onChange={(event) => setAnswer(question.id, event.target.value)}
                          className="accent-teal-600"
                        />
                        <span>{choice.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={answers[question.id] ?? ""}
                    onChange={(event) => setAnswer(question.id, event.target.value)}
                    placeholder="Enter a number or variable"
                    className="mt-4 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                )}
              </fieldset>
            ))}
          </div>
          <button type="button" onClick={submit} disabled={checking} className="mt-6 rounded-md bg-teal-600 px-5 py-2.5 font-mono text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            {checking ? "checking..." : "check answers"}
          </button>
          {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <ResultSummary result={result} />
          <AITutor lessonContent={aiContext} contextType="puzzle" contextTitle={aiContextTitle} />
        </div>
      </div>
    </div>
  );
}
