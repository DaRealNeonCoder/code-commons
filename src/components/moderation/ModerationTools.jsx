"use client";

import { useEffect, useState } from "react";

export default function ModerationTools({ role }) {
  const [users, setUsers] = useState([]);
  const [content, setContent] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  async function load(search = query) {
    const response = await fetch(`/api/moderation?scope=tools&q=${encodeURIComponent(search)}`);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(data?.error || "Could not load moderation tools.");
      return;
    }
    setUsers(data.users || []);
    setContent(data.content || []);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/moderation?scope=tools")
      .then(async (response) => ({ response, data: await response.json().catch(() => null) }))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok) setError(data?.error || "Could not load moderation tools.");
        else {
          setUsers(data.users || []);
          setContent(data.content || []);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load moderation tools.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function act(body, key) {
    setBusy(key);
    const response = await fetch("/api/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) setError(data?.error || "Moderation action failed.");
    else await load();
    setBusy(null);
  }

  function ban(candidate) {
    const reason = window.prompt(`Reason for restricting ${candidate.email}?`, "");
    if (reason === null) return;
    act({ action: "ban", userId: candidate.id, reason }, `ban:${candidate.id}`);
  }

  return (
    <section className="mt-10 border-t border-zinc-800 pt-8">
      <h2 className="font-mono text-lg text-white">Site moderation tools</h2>
      <p className="mt-2 text-sm text-zinc-500">
        {role === "owner" ? "Owner controls include moderator restrictions." : "Moderators can restrict regular users and remove published content."}
      </p>
      {error && <p className="mt-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="font-mono text-sm text-zinc-200">User restrictions</h3>
        <div className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, or user id"
            className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
          />
          <button onClick={() => load()} className="rounded border border-zinc-700 px-3 py-2 font-mono text-xs text-zinc-300 hover:border-zinc-500 hover:text-white">
            search
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {users.map((candidate) => (
            // A moderator can restrict regular users only. The server repeats
            // this check, so protected accounts cannot be changed by a UI bypass.
            <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-800 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-200">{candidate.name || "Unnamed user"}</p>
                <p className="truncate font-mono text-xs text-zinc-500">{candidate.email} · {candidate.role || "user"}</p>
                {candidate.ban && <p className="text-xs text-red-300">restricted: {candidate.ban.reason || "no reason supplied"}</p>}
              </div>
              {candidate.ban ? (
                <button disabled={(candidate.role && role !== "owner") || busy === `unban:${candidate.id}`} onClick={() => act({ action: "unban", userId: candidate.id }, `unban:${candidate.id}`)} className="rounded border border-emerald-700 px-3 py-1.5 font-mono text-xs text-emerald-300 disabled:opacity-50">
                  unrestrict
                </button>
              ) : (
                <button disabled={(candidate.role && role !== "owner") || busy === `ban:${candidate.id}`} onClick={() => ban(candidate)} className="rounded border border-red-700 px-3 py-1.5 font-mono text-xs text-red-300 disabled:opacity-50">
                  restrict
                </button>
              )}
            </div>
          ))}
          {users.length === 0 && <p className="text-xs text-zinc-600">No users found.</p>}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h3 className="font-mono text-sm text-zinc-200">Published content</h3>
        <p className="mt-1 text-xs text-zinc-500">Remove content from public listings without destroying its database record.</p>
        <div className="mt-4 space-y-2">
          {content.map((item) => {
            const key = `${item.itemType}:${item.id}`;
            return (
              <div key={key} className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-800 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">{item.title}</p>
                  <p className="truncate font-mono text-xs text-zinc-500">{item.itemType}/{item.id}</p>
                </div>
                {item.available ? (
                  <button disabled={busy === `remove:${key}`} onClick={() => act({ action: "content-delete", itemType: item.itemType, itemId: item.id }, `remove:${key}`)} className="rounded border border-red-700 px-3 py-1.5 font-mono text-xs text-red-300 disabled:opacity-50">
                    remove
                  </button>
                ) : (
                  <button disabled={busy === `restore:${key}`} onClick={() => act({ action: "content-restore", itemType: item.itemType, itemId: item.id }, `restore:${key}`)} className="rounded border border-emerald-700 px-3 py-1.5 font-mono text-xs text-emerald-300 disabled:opacity-50">
                    restore
                  </button>
                )}
              </div>
            );
          })}
          {content.length === 0 && <p className="text-xs text-zinc-600">No published content found.</p>}
        </div>
      </div>
    </section>
  );
}
