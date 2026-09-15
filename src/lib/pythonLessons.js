// lib/pythonLessons.js
//
// Central list of Python lessons. Only "hello-world" is fully built out —
// the rest are placeholders so you can see how the lesson list looks once
// there's more than one entry. Flip `available: true` and add
// `starterCode` / `description` once a lesson is ready.

export const pythonLessons = [
  {
    id: "hello-world",
    order: 1,
    title: "Hello, World!",
    summary: "Print your very first line of Python.",
    available: true,
    starterCode: `print("Hello, World!")`,
    description: [
      "Python is a simple, readable language. To print text to the screen, use the built-in print() function.",
    ],
  },
  {
    id: "variables-and-types",
    order: 2,
    title: "Variables & Types",
    summary: "Store data in variables and meet the core types.",
    available: false,
  },
  {
    id: "conditionals",
    order: 3,
    title: "Conditionals",
    summary: "Make decisions in your code with if / elif / else.",
    available: false,
  },
  {
    id: "loops",
    order: 4,
    title: "Loops",
    summary: "Repeat work with for and while loops.",
    available: false,
  },
];

export function getLessonById(id) {
  return pythonLessons.find((lesson) => lesson.id === id) || null;
}