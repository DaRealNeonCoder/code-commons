import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const here = (name) => fileURLToPath(new URL(name, import.meta.url));

await rm(here("./dist/"), { recursive: true, force: true });
await mkdir(here("./dist/"), { recursive: true });
await cp(here("./index.html"), here("./dist/index.html"));
await cp(here("./styles.css"), here("./dist/styles.css"));

await build({
  entryPoints: [here("./src/runner.jsx")],
  outfile: here("./dist/runner.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  sourcemap: false,
  legalComments: "none",
});
