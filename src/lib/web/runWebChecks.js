// Browser-only: runs a web puzzle's checks in a hidden sandboxed iframe.
//
// sandbox="allow-scripts" without allow-same-origin gives the page an opaque
// origin, so learner code cannot read this page, its cookies, or its storage.
// Results come back by postMessage, and only from this iframe's window is
// accepted.
import { buildCheckDocument, WEB_CHECK_SOURCE } from "./webPuzzle";

const TIMEOUT_MS = 4000;

export function runWebChecks({ files, checks }) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.setAttribute("aria-hidden", "true");
    // Give the page a real layout (so computed sizes are right) but keep it out of sight.
    frame.style.cssText = "position:absolute;width:800px;height:600px;left:-10000px;top:0;border:0;visibility:hidden;";

    let timer = null;
    function finish() {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
      frame.remove();
    }

    function onMessage(event) {
      if (event.source !== frame.contentWindow) return;
      if (!event.data || event.data.source !== WEB_CHECK_SOURCE) return;
      finish();
      resolve({ results: event.data.results, uncaught: event.data.uncaught });
    }

    window.addEventListener("message", onMessage);
    timer = setTimeout(() => {
      finish();
      reject(new Error("Your page took too long to load. Check for an infinite loop."));
    }, TIMEOUT_MS);

    frame.srcdoc = buildCheckDocument({ files, checks });
    document.body.appendChild(frame);
  });
}
