// React demos are intentionally kept outside the lesson MDX that creators can
// publish. They are previewed in a sandboxed iframe instead. Keep this module
// free of React imports so the validation rules can also be used by API code.

export const MAX_REACT_DEMOS = 20;
export const MAX_REACT_DEMO_CODE = 20_000;
export const MAX_REACT_DEMO_TITLE = 120;
export const REACT_DEMO_IFRAME_SANDBOX = "allow-scripts";

export const REACT_DEMO_PUBLISH_ERROR =
  "React demos are not yet supported in published lessons pending security validation. Remove the React demo code to publish this lesson.";

export function hasReactDemoCode(value) {
  return (
    Array.isArray(value) &&
    value.some((demo) => demo && typeof demo === "object" && typeof demo.code === "string" && demo.code.trim() !== "")
  );
}

export function normalizeReactDemos(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, MAX_REACT_DEMOS).map((demo) => ({
    title: typeof demo?.title === "string" ? demo.title.slice(0, MAX_REACT_DEMO_TITLE) : "",
    code: typeof demo?.code === "string" ? demo.code.slice(0, MAX_REACT_DEMO_CODE) : "",
  }));
}

function serializeForScript(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

// The document deliberately has a narrow CSP and is loaded into an iframe with
// sandbox="allow-scripts" and no allow-same-origin. This is a preview boundary,
// not a claim that arbitrary React is safe to execute in the application
// process. A future production implementation should move this runtime to a
// separately hosted, independently hardened origin.
export function buildReactDemoDocument(code) {
  const safeCode = typeof code === "string" ? code.slice(0, MAX_REACT_DEMO_CODE) : "";
  const serializedCode = serializeForScript(safeCode);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';">
    <style>
      :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
      body { margin: 0; padding: 16px; color: #27272a; background: #fff; }
      @media (prefers-color-scheme: dark) { body { color: #e4e4e7; background: #18181b; } }
      button, input, select, textarea { font: inherit; }
      button { cursor: pointer; }
      #error { color: #b91c1c; white-space: pre-wrap; font: 13px ui-monospace, SFMono-Regular, Menlo, monospace; }
      @media (prefers-color-scheme: dark) { #error { color: #fca5a5; } }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <div id="error" role="alert"></div>
    <script src="https://unpkg.com/react@19.2.8/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@19.2.8/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone@7.26.9/babel.min.js"></script>
    <script>
      (() => {
        const userCode = ${serializedCode};
        const errorBox = document.getElementById("error");

        function report(error) {
          const message = String(error?.message || error || "The demo could not be rendered.").slice(0, 500);
          errorBox.textContent = message;
          window.parent.postMessage({ type: "react-demo-error", message }, "*");
        }

        window.addEventListener("error", (event) => report(event.error || event.message));
        window.addEventListener("unhandledrejection", (event) => report(event.reason));

        try {
          if (!userCode.trim()) throw new Error("Add a React component to preview it.");
          const transformed = Babel.transform(userCode, { presets: ["react"] }).code;
          const getComponent = new Function("React", transformed + "\\n; return typeof Demo === \\"function\\" ? Demo : typeof App === \\"function\\" ? App : null;");
          const Component = getComponent(window.React);
          if (typeof Component !== "function") {
            throw new Error("Define a component named Demo (or App) in your code.");
          }
          window.ReactDOM.createRoot(document.getElementById("root")).render(window.React.createElement(Component));
        } catch (error) {
          report(error);
        }
      })();
    </script>
  </body>
</html>`;
}
