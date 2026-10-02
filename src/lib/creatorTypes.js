// Shared by server and client code, so no "use client" here.
// Tailwind class strings are written out in full so the scanner can see them.
export const PROJECT_TYPES = [
  {
    id: "lesson",
    label: "Lesson",
    path: "01_lesson/",
    description: "A Python lesson with an editor and starter code.",
    accent: "text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-400",
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    id: "puzzle",
    label: "Puzzle",
    path: "02_puzzle/",
    description: "A coding puzzle inside a category.",
    accent: "text-teal-600 dark:text-teal-400",
    hoverBorder: "hover:border-teal-400",
    badge: "border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  {
    id: "shader",
    label: "Shader",
    path: "03_shader/",
    description: "A shader lesson with a live GLSL editor.",
    accent: "text-fuchsia-600 dark:text-fuchsia-400",
    hoverBorder: "hover:border-fuchsia-400",
    badge: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    id: "circuit",
    label: "Circuit",
    path: "04_circuit/",
    description: "A logic-circuit lesson built in the simulator.",
    accent: "text-blue-600 dark:text-blue-400",
    hoverBorder: "hover:border-blue-400",
    badge: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    id: "project",
    label: "Coding project",
    path: "05_project/",
    description: "Build something to showcase, learn from, or just have fun with.",
    accent: "text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-400",
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "course",
    label: "Course",
    path: "06_course/",
    description: "Link lessons together, in order, into a course.",
    accent: "text-rose-600 dark:text-rose-400",
    hoverBorder: "hover:border-rose-400",
    badge: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
];

export const TYPE_IDS = PROJECT_TYPES.map((t) => t.id);

export function getType(id) {
  return PROJECT_TYPES.find((t) => t.id === id) ?? null;
}