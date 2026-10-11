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

Signed-in users can create these from `/create`: open a circuit project, build
the starter circuit in the workspace, then switch to `markdown`, enable
`publish as circuit puzzle`, select all of the circuit's input and LED
components, and add hidden truth-table cases. Puzzle inputs and outputs are
protected in the workspace once the mode is enabled. Draft puzzle data is
redacted from non-owners, while the published page exposes only its public
terminal IDs.

Run checker regression tests with `node --test src/lib/circuits/puzzle.test.mjs`.

## Status

CodeCommons is actively under development. Features, content, and tools are continuously being improved.

Contributions, feedback, feature suggestions, and educational content are welcome!

Contributors can find the current private roadmap in the commented TODO block at
the bottom of this README when viewing the source.

<!--
## Contributor TODO

This roadmap is intentionally commented out so it is available to contributors
in the source without appearing on the public README page.

### AI assistance

- [ ] Integrate the AI tutor into lessons, puzzles, circuits, shaders, and coding projects with context-aware prompts.
- [ ] Add progressive hints that use a learner's failed attempts and test output without revealing the answer.
- [ ] Let lesson authors configure AI objectives, allowed tools, tone, and rubric-specific guidance.
- [ ] Add AI-generated explanations for compiler errors, circuit traces, shader compile errors, and test failures.
- [ ] Add conversation persistence, usage limits, model selection, and clear privacy controls.
- [ ] Provide an author review flow for AI-generated hints and explanations before publishing them.

### Learning experience

- [ ] Add richer progress analytics, streaks, skill maps, and per-topic recommendations.
- [ ] Support saved attempts, replayable solution history, and compare-before/after views for projects.
- [ ] Add learner-controlled accessibility settings, keyboard shortcuts, reduced motion, and better screen-reader coverage.
- [ ] Add content versioning so published lessons can evolve without invalidating existing progress.
- [ ] Add prerequisite validation and adaptive course paths based on demonstrated skills.

### Community and content

- [ ] Add comment editing, deletion, reporting, moderation queues, spam protection, and contributor moderation tools.
- [ ] Add notifications for replies, mentions, published updates, and course activity.
- [ ] Add creator profiles, follows, bookmarks, collections, and content revision history.
- [ ] Add a richer content review workflow with drafts, previews, approvals, and rollback.
- [ ] Add import/export tools for lessons, courses, puzzles, circuits, shaders, and coding projects.

### Engineering and operations

- [ ] Add meaningful unit, integration, API, database, and end-to-end tests for the major learning flows.
- [ ] Add database migrations and a documented production deployment/rollback procedure.
- [ ] Add request validation, rate limiting, abuse monitoring, audit logs, and stronger authorization tests.
- [ ] Add observability for code execution, AI requests, publishing, comments, and failed background work.
- [ ] Improve search with indexing, typo tolerance, related-content ranking, and semantic discovery.
- [ ] Add caching and pagination for large comment threads, browse results, courses, and creator dashboards.
- [ ] Add CI checks for linting, builds, migrations, accessibility, dependency vulnerabilities, and content validation.
-->
