// React demos are data handed to a separately deployed runner. This module is
// intentionally free of React and esbuild so it can be used by both the API
// and browser components without pulling a compiler into the main bundle.

export const MAX_REACT_DEMOS = 20;
export const MAX_REACT_DEMO_CODE = 20_000;
export const MAX_REACT_DEMO_TITLE = 120;
export const MAX_REACT_DEMO_COMPILED = 120_000;
export const MAX_REACT_DEMO_LESSON_PAYLOAD = 200_000;
export const MAX_ACTIVE_REACT_DEMOS = 6;
export const REACT_DEMO_RENDER_TIMEOUT_MS = 2_500;
export const REACT_DEMO_IFRAME_SANDBOX = "allow-scripts";
// The main app is cross-origin isolated for Pyodide's SharedArrayBuffer use.
// A credentialless iframe is allowed through that COEP boundary without
// granting the untrusted demo access to cookies or other ambient credentials.
export const REACT_DEMO_IFRAME_CREDENTIALLESS = true;
export const REACT_DEMO_RUNNER_ORIGIN = "https://code-commons-ccreact.vercel.app";
export const REACT_DEMO_MAIN_APP_ORIGIN = "https://code-commons.vercel.app";
export const REACT_DEMO_PUBLISH_ERROR = "One or more React demos could not be validated for publication.";

export function hasReactDemoCode(value) {
  return Array.isArray(value) && value.some((demo) => demo && typeof demo === "object" && typeof demo.code === "string" && demo.code.trim() !== "");
}

export function normalizeReactDemos(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_REACT_DEMOS).map((demo) => ({
    title: typeof demo?.title === "string" ? demo.title.slice(0, MAX_REACT_DEMO_TITLE) : "",
    code: typeof demo?.code === "string" ? demo.code.slice(0, MAX_REACT_DEMO_CODE) : "",
  }));
}

// Drafts may be saved before compilation, but their shape and resource limits
// are still enforced by the API rather than by the editor's maxLength fields.
export function validateReactDemoDrafts(value) {
  if (value == null) return null;
  if (!Array.isArray(value) || value.length > MAX_REACT_DEMOS) return "Too many React demos.";
  let total = 0;
  for (const demo of value) {
    if (!demo || typeof demo !== "object") return "A React demo is invalid.";
    if (typeof demo.title !== "string" || demo.title.length > MAX_REACT_DEMO_TITLE) return "A React demo title is invalid.";
    if (typeof demo.code !== "string" || demo.code.length > MAX_REACT_DEMO_CODE) return "React demo source is too large.";
    total += demo.title.length + demo.code.length;
  }
  return total > MAX_REACT_DEMO_LESSON_PAYLOAD ? "The React demo draft payload is too large." : null;
}

export function createReactDemoNonce() {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64ToBytes(value) {
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// Published MDX contains only this URL-safe, base64-encoded JSON data value;
// the source/compiled strings never become MDX syntax or main-app JavaScript.
export function serializeReactDemoArtifacts(artifacts) {
  if (!Array.isArray(artifacts)) return "";
  const clean = artifacts.map((demo) => ({
    title: typeof demo?.title === "string" ? demo.title.slice(0, MAX_REACT_DEMO_TITLE) : "",
    compiled: typeof demo?.compiled === "string" ? demo.compiled : "",
  }));
  return bytesToBase64(new TextEncoder().encode(JSON.stringify(clean)));
}

export function deserializeReactDemoArtifacts(value) {
  if (typeof value !== "string" || value.length > MAX_REACT_DEMO_LESSON_PAYLOAD) return [];
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64ToBytes(value)));
    if (!Array.isArray(parsed) || parsed.length > MAX_REACT_DEMOS) return [];
    return parsed.filter((demo) => (
      demo && typeof demo === "object" && typeof demo.title === "string" && demo.title.length <= MAX_REACT_DEMO_TITLE &&
      typeof demo.compiled === "string" && demo.compiled.length > 0 && demo.compiled.length <= MAX_REACT_DEMO_COMPILED
    ));
  } catch {
    return [];
  }
}

export function buildReactDemoDataMarkup(artifacts) {
  const data = serializeReactDemoArtifacts(artifacts);
  return data ? `\n\n<ReactDemo data="${data}" />` : "";
}

export function isValidRunnerMessage(event, frameWindow, nonce) {
  const data = event?.data;
  // sandbox="allow-scripts" intentionally creates an opaque origin, reported
  // as "null". The iframe URL is pinned to REACT_DEMO_RUNNER_ORIGIN and the
  // source-window check prevents another null-origin frame from talking here.
  const originOk = event?.origin === "null" || event?.origin === REACT_DEMO_RUNNER_ORIGIN;
  return event?.source === frameWindow && originOk && data && typeof data === "object" && !Array.isArray(data)
    && typeof data.type === "string" && typeof data.nonce === "string" && data.nonce === nonce
    && ["react-demo:ready", "react-demo:error", "react-demo:rendered"].includes(data.type);
}
