export default function Loading() {
  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="w-full max-w-md" role="status" aria-label="Loading">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3 font-mono text-xs text-zinc-500">
            <span className="flex gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-teal-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
            </span>
            loading...
          </div>

          <div className="mt-6 space-y-3" aria-hidden="true">
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/70" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/70" />
          </div>
        </div>
      </div>
    </div>
  );
}
