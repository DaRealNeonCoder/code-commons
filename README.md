# CodeCommons

A free and open-source platform for learning, experimenting with code, and creating educational content.

## Features

* **Courses** — Organized learning paths made up of lessons.
* **Lessons** — Text-based explanations and interactive learning materials.
* **Puzzles** — Algorithmic coding challenges with test cases.
* **Shaders** — Write and experiment with GLSL fragment shaders.
* **Logic Simulations** — Build and experiment with digital logic circuits.
* **Content Creation** — Create, publish, and share your own lessons, puzzles, shaders, and circuits.
* **Code Execution** — Run Python code directly in the browser.
* **Profiles** — User profiles and basic progress tracking.

## Tech Stack

* Next.js
* React
* JavaScript
* PostgreSQL
* Drizzle ORM

## Circuit puzzles

Admin-defined circuit puzzles use the existing `circuits` table and content
importer. Apply the schema with `npm run db:push`, then import official content
with `npx tsx --env-file=.env.local importContent.js` (this upserts all official
content). The starter puzzle is at `/circuits/xor-from-nand` and appears in Browse
under Circuits as a **Circuit Puzzle**.

See `content/circuits/xor-from-nand.mdx` for the definition format:

* `starterCircuit` contains the initial editor components, wires, and chips.
* `puzzlePorts: { inputs: [...], outputs: [...] }` lists the IDs of required
  `INPUT` and `LED` components in that circuit. These terminals cannot be
  deleted; moving them does not change their logical order. Puzzle pages do not
  add extra switches or LEDs to the palette.
* `testCases` contains `{ input: [...], expected: [...] }` bit arrays in that
  port order. Boolean values and numeric `0`/`1` are accepted, with one value
  per declared port. All cases are private, regardless of any `hidden` field.

The checker uses the existing simulator on the server and returns only
`{ solved: boolean }`. Search/list queries exclude test cases. Invalid port
definitions, malformed circuits, and cycles are rejected. Circuit size and
evaluation-work limits apply; inputs and outputs are arrays rather than
fixed-width bit masks. Ordinary circuit lessons have `puzzlePorts: null`.

Run checker regression tests with `node --test src/lib/circuits/puzzle.test.mjs`.

## Status

CodeCommons is actively under development. Features, content, and tools are continuously being improved.

Contributions, feedback, feature suggestions, and educational content are welcome!
