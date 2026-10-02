"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectCard({ type }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/creator-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't create the project.");
      router.push(`/create/${type.id}/${data.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCreate}
        disabled={busy}
        className={`w-full rounded-md border border-zinc-200 p-5 text-left transition-colors disabled:opacity-60 dark:border-zinc-800 ${type.hoverBorder}`}
      >
        <span className={`font-mono text-sm ${type.accent}`}>{type.path}</span>
        <h2 className="mt-1 text-lg font-semibold">{type.label}</h2>
        <p className="mt-1 text-sm text-zinc-500">{busy ? "Creating..." : type.description}</p>
      </button>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
