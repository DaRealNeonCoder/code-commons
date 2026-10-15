"use client";

const fieldClass = "mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950";

function newChoice(index = 0) {
  return { id: String.fromCharCode(97 + index), label: "" };
}

export function newMathQuestion() {
  return {
    id: `q${crypto.randomUUID().slice(0, 8)}`,
    prompt: "",
    type: "choice",
    choices: [newChoice(0), newChoice(1)],
    answer: "",
  };
}

export default function MathQuizEditor({ questions, onChange }) {
  function updateQuestion(id, patch) {
    onChange(questions.map((question) => (question.id === id ? { ...question, ...patch } : question)));
  }

  function removeQuestion(id) {
    onChange(questions.filter((question) => question.id !== id));
  }

  function addQuestion() {
    onChange([...questions, newMathQuestion()]);
  }

  function updateChoice(question, choiceId, label) {
    updateQuestion(question.id, {
      choices: question.choices.map((choice) => (choice.id === choiceId ? { ...choice, label } : choice)),
    });
  }

  function addChoice(question) {
    const used = new Set(question.choices.map((choice) => choice.id));
    let index = question.choices.length;
    let id = String.fromCharCode(97 + index);
    while (used.has(id)) id = `choice${++index}`;
    updateQuestion(question.id, { choices: [...question.choices, newChoice(index)] });
  }

  function removeChoice(question, choiceId) {
    const choices = question.choices.filter((choice) => choice.id !== choiceId);
    updateQuestion(question.id, { choices, answer: question.answer === choiceId ? "" : question.answer });
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-mono text-sm text-zinc-500">math quiz questions</h2>
          <p className="mt-1 text-xs text-zinc-500">Use plain text prompts. Answers stay private and are checked on the server.</p>
        </div>
        <button type="button" onClick={addQuestion} className="rounded border border-teal-500/50 px-3 py-1.5 font-mono text-xs text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30">+ question</button>
      </div>
      <div className="space-y-4">
        {questions.map((question, index) => (
          <div key={question.id} className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-zinc-500">question {index + 1}</span>
              <button type="button" onClick={() => removeQuestion(question.id)} disabled={questions.length === 1} className="text-xs text-red-500 hover:underline disabled:opacity-30">remove</button>
            </div>
            <label className="block text-sm font-medium" htmlFor={`${question.id}-prompt`}>Prompt</label>
            <textarea id={`${question.id}-prompt`} value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} rows={2} placeholder="What is 12 × 8?" className={fieldClass} />

            <label className="mt-3 block text-sm font-medium" htmlFor={`${question.id}-type`}>Answer type</label>
            <select id={`${question.id}-type`} value={question.type} onChange={(event) => updateQuestion(question.id, { type: event.target.value, answer: "" })} className={fieldClass}>
              <option value="choice">Multiple choice</option>
              <option value="numeric">Number or variable</option>
            </select>

            {question.type === "choice" ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500">Choices</p>
                {question.choices.map((choice) => (
                  <div key={choice.id} className="flex gap-2">
                    <input value={choice.id} readOnly aria-label="Choice id" className="w-20 rounded border border-zinc-300 px-2 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950" />
                    <input value={choice.label} onChange={(event) => updateChoice(question, choice.id, event.target.value)} placeholder="96" className={fieldClass} aria-label={`Choice ${choice.id} label`} />
                    <button type="button" onClick={() => removeChoice(question, choice.id)} disabled={question.choices.length <= 2} className="px-2 text-zinc-500 hover:text-red-500 disabled:opacity-30" aria-label={`Remove choice ${choice.id}`}>×</button>
                  </div>
                ))}
                <button type="button" onClick={() => addChoice(question)} disabled={question.choices.length >= 8} className="text-xs text-teal-600 hover:underline disabled:opacity-30 dark:text-teal-400">+ choice</button>
                <label className="block text-sm font-medium" htmlFor={`${question.id}-answer`}>Correct choice</label>
                <select id={`${question.id}-answer`} value={question.answer} onChange={(event) => updateQuestion(question.id, { answer: event.target.value })} className={fieldClass}>
                  <option value="">Choose an answer</option>
                  {question.choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.id}: {choice.label || "(empty)"}</option>)}
                </select>
              </div>
            ) : (
              <>
                <label className="mt-3 block text-sm font-medium" htmlFor={`${question.id}-numeric-answer`}>Correct number or variable</label>
                <input id={`${question.id}-numeric-answer`} value={question.answer} onChange={(event) => updateQuestion(question.id, { answer: event.target.value })} placeholder="96 or x" className={`${fieldClass} font-mono`} />
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
