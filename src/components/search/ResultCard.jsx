import Link from "next/link";
import { labelFor } from "@/lib/taxonomy";

const TYPE_LABEL = { lesson: "Lesson", puzzle: "Puzzle", shader: "Shader", circuit: "Circuit" };
const TYPE_ACCENT = {
  lesson: "text-amber-600 dark:text-amber-400",
  puzzle: "text-teal-600 dark:text-teal-400",
  shader: "text-fuchsia-600 dark:text-fuchsia-400",
  circuit: "text-violet-600 dark:text-violet-400",
};

export default function ResultCard({ item, taxonomy }) {
  const areaLabels = item.areas.map((id) => labelFor(taxonomy.areas, id));
  const tagLabels = item.tags.map((id) => labelFor(taxonomy.tags, id));
  const difficultyLabel = labelFor(taxonomy.difficulties, item.difficulty);

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs">
      <span className={TYPE_ACCENT[item.type]}>{TYPE_LABEL[item.type]}</span>
      {difficultyLabel && <span className="text-zinc-400">· {difficultyLabel}</span>}
      {item.course && (
        <span className="text-zinc-400">
          · part of <span className="underline">{item.course.title}</span>
        </span>
      )}
    </div>
  );

  const chips = (areaLabels.length > 0 || tagLabels.length > 0) && (
    <div className="mt-1 flex flex-wrap gap-1">
      {[...areaLabels, ...tagLabels].map((label) => (
        <span
          key={label}
          className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        >
          {label}
        </span>
      ))}
    </div>
  );

  if (!item.available) {
    return (
      <div className="flex cursor-not-allowed flex-col gap-1 rounded-md border border-zinc-200 px-4 py-3.5 text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
        {meta}
        <p className="font-medium">
          {item.title} <span className="font-mono text-xs">· coming soon</span>
        </p>
        {item.summary && <p className="text-sm">{item.summary}</p>}
        {chips}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="flex flex-col gap-1 rounded-md border border-zinc-200 px-4 py-3.5 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      {meta}
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.title}</p>
      {item.summary && <p className="text-sm text-zinc-600 dark:text-zinc-400">{item.summary}</p>}
      {chips}
    </Link>
  );
}