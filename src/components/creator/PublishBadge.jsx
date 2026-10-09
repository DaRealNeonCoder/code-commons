const STYLES = {
  draft: { text: "draft", cls: "text-zinc-500" },
  published: { text: "published", cls: "text-teal-600 dark:text-teal-400" },
  edited: { text: "published · unpublished edits", cls: "text-amber-600 dark:text-amber-400" },
};

export default function PublishBadge({ state = "draft" }) {
  const { text, cls } = STYLES[state] ?? STYLES.draft;
  return <span className={`font-mono text-xs ${cls}`}>{text}</span>;
}