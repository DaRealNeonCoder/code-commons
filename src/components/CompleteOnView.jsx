"use client";

import { useEffect } from "react";

export default function CompleteOnView({ lessonId }) {
  useEffect(() => {
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType: "lesson", itemId: lessonId, completed: true }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        window.dispatchEvent(
          new CustomEvent("progress-changed", {
            detail: { itemType: "lesson", itemId: lessonId, completed: true },
          })
        );
      })
      .catch((err) => console.error("Could not record lesson completion:", err));
  }, [lessonId]);

  return null;
}