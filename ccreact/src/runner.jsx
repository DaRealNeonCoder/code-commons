import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as ReactDOM from "react-dom";
import * as jsxRuntime from "react/jsx-runtime";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import {
  isValidInitMessage,
  MAX_COMPILED_DEMO_CHARS,
  MAX_DEMO_HEIGHT,
  MIN_DEMO_HEIGHT,
} from "./protocol.js";

const RENDER_TIMEOUT_MS = 1_500;

function message(type, nonce, extra = {}) {
  // The parent may be localhost during development. The parent validates the
  // source window, opaque runner origin, message shape, and nonce, so a
  // wildcard target does not weaken the protocol.
  window.parent.postMessage({ type, nonce, ...extra }, "*");
}

function demoHeight() {
  const bodyHeight = document.body?.scrollHeight || 0;
  const documentHeight = document.documentElement?.scrollHeight || 0;
  return Math.min(
    MAX_DEMO_HEIGHT,
    Math.max(MIN_DEMO_HEIGHT, Math.ceil(Math.max(bodyHeight, documentHeight)))
  );
}

function Runner() {
  const nonce = useMemo(() => new URLSearchParams(window.location.search).get("nonce") || "", []);
  const [status, setStatus] = useState(nonce ? "waiting" : "error");
  const [error, setError] = useState(nonce ? "" : "The runner frame is missing its nonce.");
  const rootRef = useRef(null);
  const scriptRef = useRef(null);

  useEffect(() => {
    if (!nonce) {
      return undefined;
    }

    let cancelled = false;
    let resizeFrame;
    const reportSize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        if (!cancelled) message("react-demo:resize", nonce, { height: demoHeight() });
      });
    };
    const resizeObserver = new ResizeObserver(reportSize);
    resizeObserver.observe(document.documentElement);
    if (document.body) resizeObserver.observe(document.body);

    function report(value) {
      const text = String(value?.message || value || "The demo could not be rendered.").slice(0, 500);
      setStatus("error");
      setError(text);
      message("react-demo:error", nonce, { message: text });
    }

    function onError(event) {
      event.preventDefault();
      report(event.error || event.message);
    }

    function onMessage(event) {
      if (!isValidInitMessage(event, window.parent, nonce)) return;
      const compiled = event.data.demo.compiled;
      if (compiled.length > MAX_COMPILED_DEMO_CHARS) return;

      setStatus("rendering");
      setError("");
      if (scriptRef.current) scriptRef.current.remove();
      if (rootRef.current) rootRef.current.unmount?.();

      const timeout = window.setTimeout(() => report("The demo took too long to render."), RENDER_TIMEOUT_MS);
      try {
        globalThis.__CCREACT_RUNTIME__ = { React, ReactDOM, jsxRuntime, jsxDevRuntime };
        globalThis.React = React;
        globalThis.ReactDOM = ReactDOM;
        const url = URL.createObjectURL(new Blob([compiled], { type: "text/javascript" }));
        const script = document.createElement("script");
        scriptRef.current = script;
        script.src = url;
        script.onload = () => {
          URL.revokeObjectURL(url);
          window.clearTimeout(timeout);
          const Component = globalThis.__CCREACT_DEMO__;
          if (typeof Component !== "function") throw new Error("The compiled demo has no component.");
          const root = createRoot(document.getElementById("demo-root"));
          rootRef.current = root;
          root.render(React.createElement(Component));
          setStatus("rendered");
          message("react-demo:rendered", nonce);
          reportSize();
        };
        script.onerror = () => {
          window.clearTimeout(timeout);
          report("The compiled demo could not be loaded.");
        };
        document.head.appendChild(script);
      } catch (value) {
        window.clearTimeout(timeout);
        report(value);
      }
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onError);
    window.addEventListener("message", onMessage);
    message("react-demo:ready", nonce);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onError);
      window.removeEventListener("message", onMessage);
      cancelled = true;
      resizeObserver.disconnect();
      cancelAnimationFrame(resizeFrame);
      if (scriptRef.current) scriptRef.current.remove();
      rootRef.current?.unmount?.();
    };
  }, [nonce]);

  return (
    <>
      <div id="demo-root" />
      {status !== "rendered" && <div className={`runner-status ${error ? "runner-error" : ""}`} role={error ? "alert" : undefined}>{error || "Loading interactive demo…"}</div>}
    </>
  );
}

createRoot(document.getElementById("root")).render(<Runner />);
