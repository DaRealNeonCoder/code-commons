import assert from "node:assert/strict";
import test from "node:test";
import { serialize } from "next-mdx-remote/serialize";

test("ReactDemo source expressions survive MDXRemote compilation", async () => {
  const source = '<ReactDemo title="Demo" code={`function Demo() { return null; }`} />';
  const { compiledSource } = await serialize(source, { blockJS: false });

  assert.match(compiledSource, /function Demo\(\) \{ return null; \}/);
});
