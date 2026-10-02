"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 800;
const RETRY_MS = 5000;

// Saves { title, data } to /api/creator-projects/:id shortly after the editor
// state stops changing. Returns "saved" | "dirty" | "saving" | "error".
//
// It compares a serialized snapshot against the last one that was saved, so a
// child component firing onChange on mount with identical content never
// triggers a save (and never bumps "last edited").
export default function useProjectAutosave({ projectId, enabled = true, title, data }) {
  const active = Boolean(projectId) && enabled;
  const snapshot = JSON.stringify({ title, data });
  const url = `/api/creator-projects/${projectId}`;

  const [state, setState] = useState("saved");
  const [retry, setRetry] = useState(0);
  const lastSaved = useRef(snapshot); // baseline = whatever was loaded
  const latest = useRef(snapshot);
  const retryTimer = useRef(null);
  latest.current = snapshot;

  useEffect(() => {
    if (!active) return;
    if (snapshot === lastSaved.current) {
      setState("saved");
      return;
    }
    setState((s) => (s === "saving" ? s : "dirty"));

    const timer = setTimeout(async () => {
      setState("saving");
      try {
        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: snapshot,
        });
        if (!res.ok) {
          setState("error");
          // 4xx (signed out, not yours, too large) won't fix itself; 5xx might.
          if (res.status >= 500) retryTimer.current = setTimeout(() => setRetry((r) => r + 1), RETRY_MS);
          return;
        }
        lastSaved.current = snapshot;
        setState(latest.current === snapshot ? "saved" : "dirty");
      } catch {
        setState("error");
        retryTimer.current = setTimeout(() => setRetry((r) => r + 1), RETRY_MS);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [snapshot, active, url, retry]);

  // Best-effort save when leaving the page or navigating within the app, so an
  // edit made in the last moments isn't lost to the debounce. (Browsers cap
  // keepalive request bodies at 64KB, so a very large project may skip this.)
  const flush = useCallback(() => {
    if (!active || latest.current === lastSaved.current) return;
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: latest.current,
      keepalive: true,
    }).catch(() => {});
  }, [active, url]);

  useEffect(() => {
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      clearTimeout(retryTimer.current);
      flush();
    };
  }, [flush]);

  return state;
}
