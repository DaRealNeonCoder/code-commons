// Shared by server and client code, so no "use client" here.
// Tailwind class strings are written out in full so the scanner can see them.
export const PROJECT_TYPES = [
  {
    id: "lesson",
    label: "Lesson",
    path: "01_lesson/",
    description: "A markdown-based explanation with text, images, labels, diagrams, and examples.",
    accent: "text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-400",
    badge: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    id: "puzzle",
    label: "Puzzle",
    path: "02_puzzle/",
    description: "A coding puzzle with starter code, tests, and explanations.",
    accent: "text-teal-600 dark:text-teal-400",
    hoverBorder: "hover:border-teal-400",
    badge: "border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  {
    // This is a puzzle project with a math-quiz editor preset. Keeping the
    // stored project type as "puzzle" means it uses the same editor and
    // publishing flow as other puzzles.
    id: "math-puzzle",
    projectType: "puzzle",
    initialData: { kind: "math-quiz" },
    label: "Math puzzle",
    path: "02_puzzle/math/",
    description: "A plain-text math quiz with multiple-choice or numeric answers.",
    accent: "text-cyan-600 dark:text-cyan-400",
    hoverBorder: "hover:border-cyan-400",
    badge: "border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "shader",
    label: "Shader",
    path: "03_shader/",
    description: "A shader lesson or visual puzzle with a live GLSL editor.",
    accent: "text-fuchsia-600 dark:text-fuchsia-400",
    hoverBorder: "hover:border-fuchsia-400",
    badge: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  },
  {
    id: "circuit",
    label: "Circuit",
    path: "04_circuit/",
    description: "A logic-circuit sandbox, with markdown.",
    accent: "text-blue-600 dark:text-blue-400",
    hoverBorder: "hover:border-blue-400",
    badge: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    id: "project",
    label: "Coding project",
    path: "05_project/",
    description: "Build something to showcase, learn from, or just have fun with.",
    accent: "text-violet-600 dark:text-violet-400",
    hoverBorder: "hover:border-violet-400",
    badge: "border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400",
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
  {
    id: "web",
    label: "Web project",
    path: "07_web/",
    description: "Build web pages with HTML, CSS, and JavaScript with live preview.",
    accent: "text-orange-600 dark:text-orange-400",
    hoverBorder: "hover:border-orange-400",
    badge: "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
];

// `projectType` allows menu presets (such as Math puzzle) to reuse the
// persisted project type and its editor without adding a second backend type.
export const TYPE_IDS = [...new Set(PROJECT_TYPES.map((t) => t.projectType ?? t.id))];

export function getType(id) {
  return PROJECT_TYPES.find((t) => t.id === id || (t.projectType ?? t.id) === id) ?? null;
}
