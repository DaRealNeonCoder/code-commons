"use client";

import { useEffect, useMemo, useState } from "react";

export function useLiveProgress(initial) {
  const [changes, setChanges] = useState({}); // "puzzle:id" -> completed?

  useEffect(() => {
    function onChange(e) {
      const d = e.detail;
      if (d?.itemType !== "puzzle" && d?.itemType !== "lesson") return;
      setChanges((prev) => ({ ...prev, [`${d.itemType}:${d.itemId}`]: Boolean(d.completed) }));
    }
    window.addEventListener("progress-changed", onChange);
    return () => window.removeEventListener("progress-changed", onChange);
  }, []);

  return useMemo(() => {
    const puzzles = new Set(initial?.puzzles);
    const lessons = new Set(initial?.lessons);
    for (const [key, on] of Object.entries(changes)) {
      const i = key.indexOf(":");
      const set = key.slice(0, i) === "puzzle" ? puzzles : lessons;
      const id = key.slice(i + 1);
      if (on) set.add(id);
      else set.delete(id);
    }
    return { puzzles, lessons };
  }, [initial, changes]);
}