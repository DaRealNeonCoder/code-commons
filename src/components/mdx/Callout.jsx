const STYLES = {
  note: "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
  tip: "border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200",
  important:
    "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200",
  warning:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  caution: "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200",
};

const LABELS = {
  note: "Note",
  tip: "Tip",
  important: "Important",
  warning: "Warning",
  caution: "Caution",
};

export default function Callout({ type = "note", children }) {
  const style = STYLES[type] || STYLES.note;
  const label = LABELS[type] || LABELS.note;

  return (
    <div className={`my-4 rounded-md border-l-4 px-4 py-3 text-sm ${style}`}>
      <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}
