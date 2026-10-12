"use client";

import { useEffect, useState } from "react";

export default function ModerationQueue({ query = "" }) {
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    fetch(`/api/moderation${query}`)
      .then(async (response) => ({ response, data: await response.json().catch(() => null) }))
      .then(({ response, data }) => {
        if (!response.ok) setError(data?.error || "Could not load the queue.");
        else setQueue(data.queue || []);
      })
      .catch(() => setError("Could not load the queue."));
  }, [query]);

  async function act(commentId, action) {
    setBusy(commentId);
    const response = await fetch("/api/moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commentId, action }) });
    if (response.ok) setQueue((items) => items.filter((item) => item.id !== commentId));
    else setError((await response.json().catch(() => null))?.error || "Could not update the comment.");
    setBusy(null);
  }

  return (
    <div className="mt-8 space-y-3">
      {error && <p className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
      {queue.length === 0 ? <p className="font-mono text-sm text-zinc-500">The moderation queue is clear.</p> : queue.map((comment) => (
        <article key={comment.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-zinc-500">
            <span>{comment.author.name} · {comment.itemType}/{comment.itemId}</span>
            <span>{comment.reportCount ? `${comment.reportCount} report${comment.reportCount === 1 ? "" : "s"}` : "spam filter"}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{comment.body}</p>
          {comment.moderationReason && <p className="mt-2 text-xs text-amber-300">reason: {comment.moderationReason}</p>}
          <div className="mt-4 flex flex-wrap gap-3 font-mono text-xs">
            <button disabled={busy === comment.id} onClick={() => act(comment.id, "approve")} className="rounded border border-teal-500/40 px-3 py-1.5 text-teal-300 disabled:opacity-40">approve</button>
            <button disabled={busy === comment.id} onClick={() => act(comment.id, "hide")} className="rounded border border-amber-500/40 px-3 py-1.5 text-amber-300 disabled:opacity-40">hide</button>
            <button disabled={busy === comment.id} onClick={() => act(comment.id, "delete")} className="rounded border border-red-500/40 px-3 py-1.5 text-red-300 disabled:opacity-40">delete</button>
            <button disabled={busy === comment.id} onClick={() => act(comment.id, "dismiss")} className="rounded px-3 py-1.5 text-zinc-400 hover:text-white disabled:opacity-40">dismiss reports</button>
          </div>
        </article>
      ))}
    </div>
  );
}
