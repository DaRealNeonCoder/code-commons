# CodeCommons React runner

This directory is deployed independently at `https://code-commons-ccreact.vercel.app`.
Run `npm install && npm run build` from this directory; Vercel serves the generated
`dist/` directory.

The parent application supplies a server-compiled artifact over `postMessage`.
The frame is always `sandbox="allow-scripts"` without `allow-same-origin`, and
the nonce, source window, and production parent origin are checked on both sides.
The runner has no application cookies or storage access. Its CSP blocks network
connections, workers, objects, child frames, forms, navigation, and all external
scripts. React, ReactDOM, and esbuild are pinned and bundled from npm packages;
there are no CDN runtime dependencies.
