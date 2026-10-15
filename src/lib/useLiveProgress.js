"use client";

import { useEffect, useMemo, useState } from "react";

export function useLiveProgress(initial) {
  const [changes, setChanges] = useState({}); // "puzzle:id" / "shader:id" -> completed?

  useEffect(() => {
    function onChange(e) {
      const d = e.detail;
      if (!["puzzle", "shader", "circuit", "lesson"].includes(d?.itemType)) return;
      setChanges((prev) => ({ ...prev, [`${d.itemType}:${d.itemId}`]: Boolean(d.completed) }));
    }
    window.addEventListener("progress-changed", onChange);
    return () => window.removeEventListener("progress-changed", onChange);
  }, []);

  return useMemo(() => {
    const puzzles = new Set();
    const initialPuzzles = initial?.puzzles;
    if (initialPuzzles instanceof Set) {
      for (const ref of initialPuzzles) puzzles.add(ref);
    } else if (Array.isArray(initialPuzzles)) {
      for (const ref of initialPuzzles) puzzles.add(ref);
    } else {
      for (const [type, ids] of Object.entries(initialPuzzles ?? {})) {
        for (const id of ids ?? []) puzzles.add(`${type}:${id}`);
      }
    }
    const lessons = new Set(initial?.lessons);
    for (const [key, on] of Object.entries(changes)) {
      const i = key.indexOf(":");
      const type = key.slice(0, i);
      const set = type === "lesson" ? lessons : puzzles;
      const id = key.slice(i + 1);
      const value = type === "lesson" ? id : `${type}:${id}`;
      if (on) set.add(value);
      else set.delete(value);
    }
    return { puzzles, lessons };
  }, [initial, changes]);
}
