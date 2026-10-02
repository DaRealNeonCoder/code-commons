"use client";

import { useEffect, useState } from "react";

// Feather "thumbs-up" / "thumbs-down" paths, inlined so there's no icon dependency.
const THUMB_UP =
  "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3";
const THUMB_DOWN =
  "M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17";

function Thumb({ path, filled }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const IDLE = {
  auto: "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-100",
  dark: "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100",
};
const ACTIVE = {
  like: {
    auto: "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400",
    dark: "border-green-500 bg-green-500/10 text-green-400",
  },
  dislike: {
    auto: "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400",
    dark: "border-red-500 bg-red-500/10 text-red-400",
  },
};
const SIZE = { sm: "px-2 py-0.5", md: "px-2.5 py-1" };

// Apply a vote change locally so the UI responds before the server does.
function applyVote(state, next) {
  let { likes, dislikes } = state;
  if (state.userVote === 1) likes -= 1;
  if (state.userVote === -1) dislikes -= 1;
  if (next === 1) likes += 1;
  if (next === -1) dislikes += 1;
  return { likes, dislikes, userVote: next };
}

/**
 * @param {string} itemType - course | lesson | puzzle | shader | circuit | project
 * @param {string} itemId
 * @param {{likes: number, dislikes: number, userVote: 1|-1|0}} initial - server-rendered state
 * @param {boolean} signedIn - signed-out users can see counts but not vote
 * @param {"sm"|"md"} [size]
 * @param {"auto"|"dark"} [tone] - "dark" for the always-dark workspace chrome
 * @param {boolean} [showSummary] - adds "86% liked · 12 votes" next to the buttons
 */
export default function RatingButtons({
  itemType,
  itemId,
  initial,
  signedIn,
  size = "md",
  tone = "auto",
  showSummary = false,
}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  // Search cards stay mounted when filters change, so follow fresh server data.
  useEffect(() => {
    setState(initial);
  }, [initial.likes, initial.dislikes, initial.userVote]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  async function vote(value) {
    if (!signedIn) {
      setNotice("Sign in to rate this");
      return;
    }
    if (busy) return;

    const previous = state;
    const next = state.userVote === value ? 0 : value; // clicking your own vote removes it
    setState(applyVote(state, next));
    setBusy(true);
    setNotice(null);

    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId, value: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error || `HTTP ${res.status}`);
      setState(data); // the server's totals are the source of truth
    } catch {
      setState(previous);
      setNotice("Couldn't save your rating");
    } finally {
      setBusy(false);
    }
  }

  const total = state.likes + state.dislikes;
  const percent = total > 0 ? Math.round((state.likes / total) * 100) : null;
  const base = `inline-flex items-center gap-1.5 rounded border font-mono text-xs transition-colors ${SIZE[size]}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => vote(1)}
        aria-pressed={state.userVote === 1}
        aria-label={`Like (${state.likes})`}
        title={signedIn ? "Like" : "Sign in to rate this"}
        className={`${base} ${state.userVote === 1 ? ACTIVE.like[tone] : IDLE[tone]}`}
      >
        <Thumb path={THUMB_UP} filled={state.userVote === 1} />
        {state.likes}
      </button>

      <button
        type="button"
        onClick={() => vote(-1)}
        aria-pressed={state.userVote === -1}
        aria-label={`Dislike (${state.dislikes})`}
        title={signedIn ? "Dislike" : "Sign in to rate this"}
        className={`${base} ${state.userVote === -1 ? ACTIVE.dislike[tone] : IDLE[tone]}`}
      >
        <Thumb path={THUMB_DOWN} filled={state.userVote === -1} />
        {state.dislikes}
      </button>

      {showSummary && (
        <span className="font-mono text-xs text-zinc-500">
          {percent === null ? "no ratings yet" : `${percent}% liked · ${total} vote${total === 1 ? "" : "s"}`}
        </span>
      )}

      {notice && (
        <span role="status" className="font-mono text-xs text-amber-600 dark:text-amber-400">
          {notice}
        </span>
      )}
    </div>
  );
}