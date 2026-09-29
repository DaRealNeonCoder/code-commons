"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

const ACCENT_CLASSES = {
  amber: "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  teal: "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
};

export default function CompletionToggle({ itemType, itemId, accent = "amber" }) {
  const { data: session, isPending } = useSession();
  // Depend on the stable user id string, not the session object itself —
  // if the auth client returns a new object reference on every render,
  // depending on `session` directly here would re-run this effect forever.
  const userId = session?.user?.id ?? null;

  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/progress?itemType=${itemType}&itemId=${encodeURIComponent(itemId)}`)
      .then((res) => (res.ok ? res.json() : { completed: false }))
      .then((data) => {
        if (!cancelled) setCompleted(Boolean(data.completed));
      })
      .catch((err) => {
        console.error("Could not load completion status:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, isPending, itemType, itemId]);

  // Other components (e.g. CodeWorkspace auto-marking a passed puzzle) announce
  // progress changes here so the button stays in sync without a reload.
  useEffect(() => {
    function handleChange(event) {
      const d = event.detail;
      if (d?.itemType === itemType && d?.itemId === itemId) {
        setCompleted(Boolean(d.completed));
      }
    }
    window.addEventListener("progress-changed", handleChange);
    return () => window.removeEventListener("progress-changed", handleChange);
  }, [itemType, itemId]);

  async function toggle() {
    if (!userId || saving) return;
    const next = !completed;
    setSaving(true);
    setCompleted(next); // optimistic
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId, completed: next }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch (err) {
      console.error("Could not save completion status:", err);
      setCompleted(!next); // revert on failure
    } finally {
      setSaving(false);
    }
  }

  if (isPending || loading) return null;

  if (!userId) {
    return <p className="mt-6 text-xs text-zinc-400">Sign in (top right) to track your progress.</p>;
  }

  const accentClass = ACCENT_CLASSES[accent] || ACCENT_CLASSES.amber;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      className={`mt-6 flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
        completed ? accentClass : "border-zinc-300 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
      }`}
    >
      <span>{completed ? "✓" : "○"}</span>
      {completed ? "Completed" : "Mark as complete"}
    </button>
  );
}