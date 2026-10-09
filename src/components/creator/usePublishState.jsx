"use client";

import { useRef, useState } from "react";

// `initial` comes from the server ("draft" | "published" | "edited").
// `snapshot` is JSON.stringify({ title, data }), the same shape autosave saves.
// Call the returned markPublished(snapshotAtClick) after a successful publish.
export default function usePublishState({ initial = "draft", snapshot }) {
  const first = useRef(snapshot);
  const [baseline, setBaseline] = useState(null); // snapshot at the last publish this session

  let state;
  if (baseline !== null) state = snapshot === baseline ? "published" : "edited";
  else if (initial === "draft") state = "draft";
  else state = snapshot === first.current ? initial : "edited";

  return [state, setBaseline];
}