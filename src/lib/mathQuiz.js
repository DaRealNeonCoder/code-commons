const ID = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;
const NUMBER_OR_VARIABLE = /^(?:-?(?:\d+(?:\.\d+)?|\.\d+)|[a-zA-Z][a-zA-Z0-9_]{0,31})$/;

export const MAX_MATH_QUESTIONS = 50;
export const MAX_MATH_CHOICES = 8;
export const MAX_MATH_PROMPT_LENGTH = 2_000;
export const MAX_MATH_LABEL_LENGTH = 500;

function cleanText(value, max) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= max ? text : null;
}

function cleanAnswer(value) {
  const answer = cleanText(value, 200);
  return answer && NUMBER_OR_VARIABLE.test(answer) ? answer : null;
}

// Math quizzes deliberately use plain text prompts and answers. This keeps the
// format portable and avoids treating user-authored math as MDX or executable
// code. The answer key stays in the database and is never sent to the client.
export function normalizeMathQuiz(value) {
  if (!value || typeof value !== "object" || value.version !== 1 || !Array.isArray(value.questions)) return null;
  if (value.questions.length === 0 || value.questions.length > MAX_MATH_QUESTIONS) return null;

  const ids = new Set();
  const questions = [];
  for (const question of value.questions) {
    if (!question || typeof question !== "object" || typeof question.id !== "string" || !ID.test(question.id)) return null;
    if (ids.has(question.id)) return null;
    ids.add(question.id);

    const prompt = cleanText(question.prompt, MAX_MATH_PROMPT_LENGTH);
    if (!prompt || (question.type !== "choice" && question.type !== "numeric")) return null;

    if (question.type === "numeric") {
      const answer = cleanAnswer(question.answer);
      if (!answer) return null;
      questions.push({ id: question.id, prompt, type: "numeric", answer });
      continue;
    }

    if (!Array.isArray(question.choices) || question.choices.length < 2 || question.choices.length > MAX_MATH_CHOICES) return null;
    const choiceIds = new Set();
    const choices = [];
    for (const choice of question.choices) {
      if (!choice || typeof choice.id !== "string" || !ID.test(choice.id) || choiceIds.has(choice.id)) return null;
      const label = cleanText(choice.label, MAX_MATH_LABEL_LENGTH);
      if (!label) return null;
      choiceIds.add(choice.id);
      choices.push({ id: choice.id, label });
    }
    if (typeof question.answer !== "string" || !choiceIds.has(question.answer)) return null;
    questions.push({ id: question.id, prompt, type: "choice", choices, answer: question.answer });
  }

  return { version: 1, questions };
}

export function getClientMathQuizInfo(value) {
  const quiz = normalizeMathQuiz(value);
  if (!quiz) return null;
  return {
    version: quiz.version,
    questions: quiz.questions.map(({ id, prompt, type, choices }) => ({
      id,
      prompt,
      type,
      ...(type === "choice" ? { choices } : {}),
    })),
  };
}

function answersMatch(type, expected, actual) {
  if (typeof actual !== "string") return false;
  const given = actual.trim();
  if (!given) return false;
  if (type === "choice") return given === expected;

  const expectedNumber = Number(expected);
  const givenNumber = Number(given);
  if (Number.isFinite(expectedNumber) && Number.isFinite(givenNumber)) return expectedNumber === givenNumber;
  return given === expected;
}

export function checkMathQuiz(value, answers) {
  const quiz = normalizeMathQuiz(value);
  if (!quiz || !answers || typeof answers !== "object" || Array.isArray(answers)) return null;
  const answerIds = new Set(quiz.questions.map((question) => question.id));
  const givenIds = Object.keys(answers);
  if (givenIds.length !== answerIds.size || givenIds.some((id) => !answerIds.has(id))) return null;

  const results = quiz.questions.map((question) => ({
    questionId: question.id,
    status: answersMatch(question.type, question.answer, answers[question.id]) ? "pass" : "fail",
  }));
  return { passed: results.filter((result) => result.status === "pass").length, total: results.length, results };
}
