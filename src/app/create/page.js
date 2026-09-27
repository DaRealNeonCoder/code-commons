import Link from "next/link";

const TYPES = [
  {
    id: "lesson",
    label: "Lesson",
    path: "01_lesson/",
    description: "A Python lesson with an editor and starter code.",
    accent: "text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-400",
  },
  {
    id: "puzzle",
    label: "Puzzle",
    path: "02_puzzle/",
    description: "A coding puzzle inside a category.",
    accent: "text-teal-600 dark:text-teal-400",
    hoverBorder: "hover:border-teal-400",
  },
  {
    id: "shader",
    label: "Shader",
    path: "03_shader/",
    description: "A shader lesson with a live GLSL editor.",
    accent: "text-fuchsia-600 dark:text-fuchsia-400",
    hoverBorder: "hover:border-fuchsia-400",
  },
  {
    id: "circuit",
    label: "Circuit",
    path: "04_circuit/",
    description: "A logic-circuit lesson built in the simulator.",
    accent: "text-blue-600 dark:text-blue-400",
    hoverBorder: "hover:border-blue-400",
  },
];

export default function CreatePage() {
  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-sm text-violet-600 dark:text-violet-400">/create</p>
        <h1 className="mt-1 text-2xl font-semibold">What are you creating?</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">Pick a type to get started.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TYPES.map((type) => (
            <Link
              key={type.id}
              href={`/create/${type.id}`}
              className={`rounded-md border border-zinc-200 p-5 transition-colors dark:border-zinc-800 ${type.hoverBorder}`}
            >
              <span className={`font-mono text-sm ${type.accent}`}>{type.path}</span>
              <h2 className="mt-1 text-lg font-semibold">{type.label}</h2>
              <p className="mt-1 text-sm text-zinc-500">{type.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}