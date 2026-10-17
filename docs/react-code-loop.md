# React code loop

CodeCommons now has a reusable authoring component for the common React demo
cycle:

1. edit JSX/React source;
2. compile through an injected adapter;
3. keep the last successful compiled artifact;
4. render it in the restricted React demo runner; and
5. reset or run the source again on demand.

The current entry point is:

```jsx
import ReactCodeLoop from "@/components/codeLoop/ReactCodeLoop";

<ReactCodeLoop
  code={source}
  onCodeChange={setSource}
  title="A stateful counter"
/>
```

`ReactCodeLoop` uses `/api/react-demos/validate` by default. A different
compiler can be supplied when the caller needs another API or a test double:

```jsx
<ReactCodeLoop
  defaultCode={'function Demo() { return <button>Ready</button>; }'}
  compile={async (source, { signal }) => {
    const response = await compileSomewhereElse(source, { signal });
    return response.compiled;
  }}
/>
```

The compiler may return either a compiled string or `{ compiled }`. The loop
rejects empty artifacts and artifacts larger than the existing React demo
limit. Compilation is debounced by default, can be disabled with
`autoCompile={false}`, and can always be triggered with the **run demo**
button.

The lower-level lifecycle hook is
`@/components/codeLoop/useReactCodeLoop`. Its statuses are `idle`, `compiling`,
`ready`, and `error`. The hook owns aborting stale compiles; it does not own a
compiler or execute source directly in the browser.

## Current boundary

This is a compile-and-render loop, not a debugger. The existing runner still
does not expose stepping, pause/resume, iteration traces, props, console
events, or arbitrary user code execution. Those require a deliberate protocol
extension rather than exposing more iframe internals.

The library is currently an internal CodeCommons module, not a published npm
package. It intentionally reuses the existing sandboxed runner and compiled
artifact format.
