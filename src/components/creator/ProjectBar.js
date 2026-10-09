import PublishBadge from "@/components/creator/PublishBadge";

const STATUS_TEXT = {
  saved: "draft saved",
  dirty: "unsaved changes",
  saving: "saving...",
  error: "couldn't save",
};

export default function ProjectBar({ label, accentClass, saveState, canEdit, publishState }) {
  const isError = saveState === "error";

  return (
    <>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className={`font-mono text-sm ${accentClass}`}>{label}</p>
        <div className="flex items-center gap-3">
          {publishState && <PublishBadge state={publishState} />}
          {canEdit && (
            <span
              role="status"
              aria-live="polite"
              className={`font-mono text-xs ${isError ? "text-red-600 dark:text-red-400" : "text-zinc-500"}`}
            >
              {STATUS_TEXT[saveState]}
            </span>
          )}
        </div>
      </div>
      {!canEdit && (
        <p className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          You&apos;re viewing someone else&apos;s project. It&apos;s read-only, and nothing you do here is saved.
        </p>
      )}
    </>
  );
}
