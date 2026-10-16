import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as ReactDOM from "react-dom";
import * as jsxRuntime from "react/jsx-runtime";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import { isValidInitMessage, MAIN_APP_ORIGIN, MAX_COMPILED_DEMO_CHARS } from "./protocol.js";

const RENDER_TIMEOUT_MS = 1_500;

function message(type, nonce, extra = {}) {
  window.parent.postMessage({ type, nonce, ...extra }, MAIN_APP_ORIGIN);
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
