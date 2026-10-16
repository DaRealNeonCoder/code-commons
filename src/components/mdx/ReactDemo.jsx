"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildReactDemoDocument, MAX_REACT_DEMO_CODE, REACT_DEMO_IFRAME_SANDBOX } from "@/lib/reactDemo";

export default function ReactDemo({ code = "", title = "Interactive React demo" }) {
  const frameRef = useRef(null);
  const [error, setError] = useState({ source: "", message: "" });
  const source = typeof code === "string" ? code.slice(0, MAX_REACT_DEMO_CODE) : "";
  const documentSource = useMemo(() => buildReactDemoDocument(source), [source]);

  useEffect(() => {
    function handleMessage(event) {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === "react-demo-error") {
        setError({
          source,
          message: String(event.data.message || "The demo could not be rendered."),
        });
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [source]);

  if (!source.trim()) {
    return (
      <div className="my-6 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        This React demo has no code yet.
      </div>
    );
  }

  return (
    <figure className="my-6 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <figcaption className="border-b border-zinc-200 px-4 py-2 font-mono text-xs text-zinc-500 dark:border-zinc-800">
        {title || "Interactive React demo"}
      </figcaption>
      <iframe
        ref={frameRef}
        title={title || "Interactive React demo"}
        srcDoc={documentSource}
        sandbox={REACT_DEMO_IFRAME_SANDBOX}
        referrerPolicy="no-referrer"
        className="block h-56 w-full border-0 bg-white dark:bg-zinc-900"
      />
      {error.source === source && error.message && (
        <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
          Demo error: {error.message}
        </p>
      )}
    </figure>
  );
}
