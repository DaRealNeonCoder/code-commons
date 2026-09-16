"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function Mermaid({ chart }) {
  const rawId = useId();
  const id = `mermaid-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [svg, setSvg] = useState(null);
  const [error, setError] = useState(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setSvg(null);
    setError(null);

    import("mermaid").then(async (mod) => {
      const mermaid = mod.default;
      mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });
      try {
        const result = await mermaid.render(id, chart);
        if (!cancelledRef.current) setSvg(result.svg);
      } catch (err) {
        if (!cancelledRef.current) setError(err.message || "Could not render diagram");
      }
    });

    return () => {
      cancelledRef.current = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <pre className="my-4 whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
        Diagram error: {error}
      </pre>
    );
  }

  if (!svg) {
    return <div className="my-4 h-24 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-900" />;
  }

  // eslint-disable-next-line react/no-danger
  return <div className="my-4 flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}
