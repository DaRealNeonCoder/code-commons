"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createReactDemoNonce,
  deserializeReactDemoArtifacts,
  isValidRunnerMessage,
  MAX_ACTIVE_REACT_DEMOS,
  MAX_REACT_DEMO_CODE,
  MAX_REACT_DEMO_COMPILED,
  REACT_DEMO_IFRAME_SANDBOX,
  REACT_DEMO_RENDER_TIMEOUT_MS,
  REACT_DEMO_RUNNER_ORIGIN,
} from "@/lib/reactDemo";

let activeDemoCount = 0;

export default function ReactDemo({ code = "", data = "", title = "Interactive React demo", allowValidation = false }) {
  const frameRef = useRef(null);
  const mountRef = useRef(null);
  const [compiled, setCompiled] = useState(() => deserializeReactDemoArtifacts(data)[0]?.compiled || "");
  const [validationError, setValidationError] = useState("");
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const nonce = useMemo(() => `${createReactDemoNonce()}-${String(frameKey)}`, [frameKey]);
  const [hasSlot, setHasSlot] = useState(false);
  const source = typeof code === "string" ? code.slice(0, MAX_REACT_DEMO_CODE) : "";
  const artifact = useMemo(() => deserializeReactDemoArtifacts(data)[0], [data]);
  const sourceNeedsValidation = allowValidation && source.trim() && !artifact;

  useEffect(() => {
    if (!sourceNeedsValidation) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setValidationError("");
      try {
        const response = await fetch("/api/react-demos/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: source }),
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.compiled !== "string") throw new Error(result.error || "Demo validation failed.");
        setCompiled(result.compiled.slice(0, MAX_REACT_DEMO_COMPILED));
      } catch (value) {
        if (value.name !== "AbortError") setValidationError(value.message || "Demo validation failed.");
      }
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [source, sourceNeedsValidation]);

  useEffect(() => {
    if (!compiled || compiled.length > MAX_REACT_DEMO_COMPILED || !visible || activeDemoCount >= MAX_ACTIVE_REACT_DEMOS) return undefined;
    let cancelled = false;
    activeDemoCount += 1;
    const timer = setTimeout(() => {
      if (!cancelled) setHasSlot(true);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      activeDemoCount = Math.max(0, activeDemoCount - 1);
      setHasSlot(false);
    };
  }, [compiled, frameKey, visible]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || !compiled || !visible || !hasSlot) return undefined;
    let timer;
    const send = () => {
      // Opaque sandbox origins cannot be addressed with a target origin other
      // than '*'. The runner validates the parent's production origin.
      clearTimeout(timer);
      node.contentWindow?.postMessage({ type: "react-demo:init", nonce, demo: { compiled } }, "*");
      timer = setTimeout(() => {
        setError("The demo timed out and was reset.");
        setFrameKey((key) => key + 1);
      }, REACT_DEMO_RENDER_TIMEOUT_MS);
    };
    function onMessage(event) {
      if (!isValidRunnerMessage(event, node.contentWindow, nonce)) return;
      if (event.data.type === "react-demo:error") {
        clearTimeout(timer);
        setError(String(event.data.message || "The demo could not be rendered.").slice(0, 500));
      } else if (event.data.type === "react-demo:rendered") {
        clearTimeout(timer);
        setError("");
      } else if (event.data.type === "react-demo:ready") {
        send();
      }
    }
    window.addEventListener("message", onMessage);
    node.addEventListener("load", send);
    // A cached iframe can finish loading before this effect subscribes. Send
    // once immediately as well; the runner's ready message makes this safe to
    // repeat and prevents a false timeout on fast navigations.
    send();
    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      node.removeEventListener("load", send);
    };
  }, [compiled, nonce, visible, hasSlot, frameKey]);

  useEffect(() => {
    const node = mountRef.current;
    if (!node || !compiled) return undefined;
    if (!("IntersectionObserver" in window)) {
      const timer = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [compiled, frameKey]);

  if (!source.trim() && !artifact) {
    return <div className="my-6 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">This React demo has no code yet.</div>;
  }
  if (sourceNeedsValidation && !compiled) {
    return <div className="my-6 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">{validationError || "Validating interactive demo…"}</div>;
  }
  if (!compiled) {
    return <div className="my-6 rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">This demo is not available in this lesson.</div>;
  }
  const runnerUrl = `${REACT_DEMO_RUNNER_ORIGIN}/?nonce=${encodeURIComponent(nonce)}`;
  return (
    <figure ref={mountRef} className="my-6 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <figcaption className="border-b border-zinc-200 px-4 py-2 font-mono text-xs text-zinc-500 dark:border-zinc-800">{title || artifact?.title || "Interactive React demo"}</figcaption>
      {hasSlot ? (
        <iframe
          key={frameKey}
          ref={frameRef}
          title={title || artifact?.title || "Interactive React demo"}
          src={runnerUrl}
          sandbox={REACT_DEMO_IFRAME_SANDBOX}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="block h-56 w-full border-0 bg-white dark:bg-zinc-900"
        />
      ) : (
        <div className="flex h-56 items-center justify-center p-4 text-sm text-zinc-500" aria-busy="true">Scroll to load this interactive demo.</div>
      )}
      {error && <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">Demo error: {error}</p>}
    </figure>
  );
}
