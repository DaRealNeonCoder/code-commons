export const RUNNER_ORIGIN = "https://code-commons-ccreact.vercel.app";
export const MAIN_APP_ORIGIN = "https://code-commons.vercel.app";
// These are explicit local development origins, not wildcard origins. The
// deployed runner still has a fixed frame-ancestors list below.
export const MAIN_APP_ORIGINS = Object.freeze([
  MAIN_APP_ORIGIN,
  "http://localhost:*",
  "http://127.0.0.1:*",
]);

export function isAllowedParentOrigin(origin) {
  if (origin === MAIN_APP_ORIGIN) return true;
  return /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin || "");
}
export const MAX_COMPILED_DEMO_CHARS = 120_000;
export const MIN_DEMO_HEIGHT = 80;
export const MAX_DEMO_HEIGHT = 2_000;

export function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isValidInitMessage(event, parentWindow, expectedNonce) {
  const data = event?.data;
  return (
    event?.source === parentWindow &&
    isAllowedParentOrigin(event?.origin) &&
    isObject(data) &&
    data.type === "react-demo:init" &&
    typeof data.nonce === "string" &&
    data.nonce.length >= 16 &&
    data.nonce === expectedNonce &&
    isObject(data.demo) &&
    typeof data.demo.compiled === "string" &&
    data.demo.compiled.length > 0 &&
    data.demo.compiled.length <= MAX_COMPILED_DEMO_CHARS
  );
}

export function isValidRunnerMessage(event, frameWindow, nonce) {
  const data = event?.data;
  // A sandbox without allow-same-origin intentionally reports the opaque
  // origin "null". RUNNER_ORIGIN is still checked on the iframe URL by the
  // parent; accepting only this frame's source prevents another null-origin
  // document from injecting messages.
  const originOk = event?.origin === "null" || event?.origin === RUNNER_ORIGIN;
  const validType = data?.type === "react-demo:ready"
    || data?.type === "react-demo:error"
    || data?.type === "react-demo:rendered"
    || (data?.type === "react-demo:resize" && Number.isInteger(data.height)
      && data.height >= MIN_DEMO_HEIGHT && data.height <= MAX_DEMO_HEIGHT);
  return (
    event?.source === frameWindow &&
    originOk &&
    isObject(data) &&
    typeof data.type === "string" &&
    typeof data.nonce === "string" &&
    data.nonce === nonce &&
    validType
  );
}
