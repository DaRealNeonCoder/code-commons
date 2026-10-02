"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteProjectButton({ id, title }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/creator-projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh(); // re-runs the dashboard's server query; the card disappears
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      aria-label={`Delete ${title}`}
      className="rounded px-2 py-1 font-mono text-xs text-red-500 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-50 dark:hover:bg-red-950"
    >
      {busy ? "deleting..." : error ? "retry delete" : "delete"}
    </button>
  );
}
