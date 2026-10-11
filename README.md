 CodeCommons

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

## Status

CodeCommons is actively under development. Features, content, and tools are continuously being improved.

Contributions, feedback, feature suggestions, and educational content are welcome!

# Contributors can find the current private roadmap in the commented TODO block at
# the bottom of this README when viewing the source.
<!--
## Contributor TODO

This roadmap is intentionally commented out so it is available to contributors
in the source without appearing on the public README page.

### Misc
- [ ] Lots of users stop after the first lesson. make it seem more appealing.
- [ ] Configure input properly for client side python, like this:
           Monaco Editor: Where the student writes Python.
           Output panel: Displays print() output.
           Input prompt: Appears when Python calls input().
           Pyodide: Pauses execution until the student supplies input, then continues. {Use pyodide.setStdin() to connect Python's input() to a custom input component. The official Pyodide stdin documentation describes how to customize this. GitHub +1
There is one important catch: the stdin callback is synchronous. You can't simply await a React input component inside it. A proper interactive terminal needs to run Python in a Web Worker and coordinate input requests and responses, or use another architecture that can suspend execution safely.
} I believe I already use a web worker to avoid inf loops, not 100% sure.




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

### Course UI follow-ups

- [ ] Add a compact course preview on the course landing page showing the first lesson and expected time commitment.
- [ ] Remember the learner's last open lesson and return them to it from the course CTA.
- [ ] Add lightweight lesson completion feedback after a puzzle is solved, with a clear next-step transition.
- [ ] Add a mobile-friendly course outline drawer instead of relying on the narrow sidebar state.
- [ ] Add estimated reading and practice times to lessons and puzzles once the content metadata supports them.
- [ ] Review the first Hello, World! lesson content so the first screen teaches only the core idea before introducing optional details.

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
