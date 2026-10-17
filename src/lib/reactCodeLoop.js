// Browser-safe contract helpers for the reusable React code-loop components.
// The actual compiler is injected by the caller so this module never bundles
// esbuild or assumes a particular API endpoint.

import { MAX_REACT_DEMO_COMPILED } from "./reactDemo.js";

export const REACT_CODE_LOOP_STATUS = Object.freeze({
  idle: "idle",
  compiling: "compiling",
  ready: "ready",
  error: "error",
});

export function normalizeReactCodeLoopResult(result) {
  const compiled = typeof result === "string" ? result : result?.compiled;
  if (typeof compiled !== "string" || !compiled.trim()) {
    throw new Error("The compiler returned no runnable React demo.");
  }
  if (compiled.length > MAX_REACT_DEMO_COMPILED) {
    throw new Error("The compiled React demo is too large.");
  }
  return compiled;
}
