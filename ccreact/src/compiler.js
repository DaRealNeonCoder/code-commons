import { build } from "esbuild";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const polynomialGraphPath = [
  path.resolve(process.cwd(), "ccreact/src/visualizations/polynomialGraph.js"),
  path.resolve(process.cwd(), "src/visualizations/polynomialGraph.js"),
].find((candidate) => existsSync(candidate));
const polynomialGraphModule = polynomialGraphPath ? readFileSync(polynomialGraphPath, "utf8") : "";

// This is deliberately small. A demo is not an application and cannot install
// packages. The virtual modules point at the runner's own pinned React build;
// no user import is ever resolved by the host filesystem or the network.
export const REACT_DEMO_IMPORT_ALLOWLIST = Object.freeze([
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "@code-commons/react-demo/polynomial-graph",
]);

const ALLOWED = new Set(REACT_DEMO_IMPORT_ALLOWLIST);

const runtimeModules = {
  react: `
    const React = globalThis.__CCREACT_RUNTIME__.React;
    export default React;
    export const Children = React.Children;
    export const Fragment = React.Fragment;
    export const StrictMode = React.StrictMode;
    export const Profiler = React.Profiler;
    export const Suspense = React.Suspense;
    export const createElement = React.createElement;
    export const cloneElement = React.cloneElement;
    export const isValidElement = React.isValidElement;
    export const useState = React.useState;
    export const useEffect = React.useEffect;
    export const useLayoutEffect = React.useLayoutEffect;
    export const useMemo = React.useMemo;
    export const useCallback = React.useCallback;
    export const useRef = React.useRef;
    export const useReducer = React.useReducer;
    export const useContext = React.useContext;
    export const useId = React.useId;
    export const useImperativeHandle = React.useImperativeHandle;
    export const useSyncExternalStore = React.useSyncExternalStore;
  `,
  "react-dom": `
    const ReactDOM = globalThis.__CCREACT_RUNTIME__.ReactDOM;
    export default ReactDOM;
    export const createRoot = ReactDOM.createRoot;
    export const hydrateRoot = ReactDOM.hydrateRoot;
    export const flushSync = ReactDOM.flushSync;
  `,
  "react/jsx-runtime": `
    const runtime = globalThis.__CCREACT_RUNTIME__.jsxRuntime;
    export const Fragment = runtime.Fragment;
    export const jsx = runtime.jsx;
    export const jsxs = runtime.jsxs;
  `,
  "react/jsx-dev-runtime": `
    const runtime = globalThis.__CCREACT_RUNTIME__.jsxDevRuntime;
    export const Fragment = runtime.Fragment;
    export const jsxDEV = runtime.jsxDEV;
  `,
  "@code-commons/react-demo/polynomial-graph": polynomialGraphModule,
};

export function createRestrictedImportPlugin() {
  return {
    name: "ccreact-restricted-imports",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /.*/ }, (args) => {
        if (!ALLOWED.has(args.path)) {
          throw new Error(`Import is not allowed in a React demo: ${args.path}`);
        }
        return { path: args.path, namespace: "ccreact-runtime" };
      });
      pluginBuild.onLoad({ filter: /.*/, namespace: "ccreact-runtime" }, (args) => ({
        contents: runtimeModules[args.path],
        loader: "js",
      }));
    },
  };
}

function makeEntry(source) {
  return `
    ${source}
    const __ccreactComponent = typeof Demo === "function" ? Demo : typeof App === "function" ? App : null;
    if (typeof __ccreactComponent !== "function") {
      throw new Error("Define a component named Demo (or App) in your code.");
    }
    globalThis.__CCREACT_DEMO__ = __ccreactComponent;
  `;
}

export async function compileReactDemo(source, { maxSourceChars, maxCompiledChars } = {}) {
  if (typeof source !== "string" || !source.trim()) throw new Error("React demo code is required.");
  if (maxSourceChars != null && source.length > maxSourceChars) {
    throw new Error("React demo source is too large.");
  }
  if (/\b(?:import\s*\(|require\s*\()/.test(source)) {
    throw new Error("Dynamic imports and require are not allowed in a React demo.");
  }
  if (!/\b(?:function|class|const|let|var)\s+(?:Demo|App)\b/.test(source)) {
    throw new Error("Define a component named Demo (or App) in your code.");
  }

  let result;
  try {
    result = await build({
      stdin: { contents: makeEntry(source), sourcefile: "react-demo.jsx", loader: "jsx" },
      bundle: true,
      write: false,
      format: "iife",
      platform: "browser",
      target: ["es2022"],
      plugins: [createRestrictedImportPlugin()],
      // Dynamic imports and unresolved requires must not turn into runtime
      // network/module loads. The static bundle is the complete artifact.
      splitting: false,
      absWorkingDir: process.cwd(),
      logLevel: "silent",
    });
  } catch (error) {
    const message = error?.errors?.[0]?.text || error?.message || "React demo did not compile.";
    throw new Error(String(message).slice(0, 500));
  }

  const compiled = result.outputFiles?.[0]?.text || "";
  if (!compiled) throw new Error("React demo produced no compiled output.");
  if (maxCompiledChars != null && compiled.length > maxCompiledChars) {
    throw new Error("Compiled React demo is too large.");
  }
  return compiled;
}
