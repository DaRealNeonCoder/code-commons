<!--

# CodeCommons Contributor Roadmap

All items below are pending work. The existing README TODO items retain their
original wording and unchecked status. Project-review follow-ups are included
as additional pending items.

## Miscellaneous fixes


## AI assistance

- [ ] Integrate the AI tutor into lessons, puzzles, circuits, shaders, and coding projects with context-aware prompts.
- [ ] Add progressive hints that use a learner's failed attempts and test output without revealing the answer.
- [ ] Let lesson authors configure AI objectives, allowed tools, tone, and rubric-specific guidance.
- [ ] Add AI-generated explanations for compiler errors, circuit traces, shader compile errors, and test failures.
- [ ] Add conversation persistence, usage limits, model selection, and clear privacy controls.
- [ ] Provide an author review flow for AI-generated hints and explanations before publishing them.

## Learning experience

- [ ] Add richer progress analytics, streaks, skill maps, and per-topic recommendations.
- [ ] Support saved attempts, replayable solution history, and compare-before/after views for projects.
- [ ] Add learner-controlled accessibility settings, keyboard shortcuts, reduced motion, and better screen-reader coverage.
- [ ] Add content versioning so published lessons can evolve without invalidating existing progress.
- [ ] Add prerequisite validation and adaptive course paths based on demonstrated skills.

## Course UI follow-ups

- [ ] Add a compact course preview on the course landing page showing the first lesson and expected time commitment.
- [ ] Remember the learner's last open lesson and return them to it from the course CTA.
- [ ] Add lightweight lesson completion feedback after a puzzle is solved, with a clear next-step transition.
- [ ] Add a mobile-friendly course outline drawer instead of relying on the narrow sidebar state.
- [ ] Add estimated reading and practice times to lessons and puzzles once the content metadata supports them.
- [ ] Review the first Hello, World! lesson content so the first screen teaches only the core idea before introducing optional details.

## Community and content

- [ ] Add comment editing, deletion, reporting, moderation queues, spam protection, and contributor moderation tools.
- [ ] Add notifications for replies, mentions, published updates, and course activity.
- [ ] Add creator profiles, follows, bookmarks, collections, and content revision history.
- [ ] Add a richer content review workflow with drafts, previews, approvals, and rollback.
- [ ] Add import/export tools for lessons, courses, puzzles, circuits, shaders, and coding projects.

## Engineering and operations

- [ ] Add meaningful unit, integration, API, database, and end-to-end tests for the major learning flows.
- [ ] Add database migrations and a documented production deployment/rollback procedure.
- [ ] Add request validation, rate limiting, abuse monitoring, audit logs, and stronger authorization tests.
- [ ] Add observability for code execution, AI requests, publishing, comments, and failed background work.
- [ ] Improve search with indexing, typo tolerance, related-content ranking, and semantic discovery.
- [ ] Add caching and pagination for large comment threads, browse results, courses, and creator dashboards.
- [ ] Add CI checks for linting, builds, migrations, accessibility, dependency vulnerabilities, and content validation.

## Repository hygiene and security

- [ ] Rotate credentials currently stored in `.env.local`.
- [ ] Add `.env.example`.
- [ ] Remove tracked SQLite databases, WAL files, and SHM files.
- [ ] Remove unused SQLite dependencies.
- [ ] Decide whether to ignore, vendor, or isolate the Piston checkout.
- [ ] Add license and content attribution files.
- [ ] Clean duplicate `.gitignore` entries.

## Current project drift

- [ ] Add or replace the missing `/lessons` and `/puzzles` destinations.
- [ ] Fix or remove the `/api/projects` circuit Export/Import flow.
- [ ] Update stale references to old seed and database scripts.
- [ ] Update stale comments referring to file-based puzzle storage.
- [ ] Add an `npm test` script for the existing tests.
- [ ] Add consistent formatting/Prettier configuration.

## Documentation and contributor workflow

- [ ] Add setup and prerequisite documentation.
- [ ] Document environment variables.
- [ ] Document available npm scripts.
- [ ] Document the project architecture.
- [ ] Document how to add lessons, puzzles, shaders, circuits, and courses.
- [ ] Document local Piston setup.
- [ ] Document testing and deployment.
- [ ] Document security and AI privacy behavior.
- [ ] Add contributor guidance.
- [ ] Add screenshots/demo links.
- [ ] Document license and attribution.

## Engineering follow-up

- [ ] Add content validation.
- [ ] Add CI checks.
- [ ] Add loading, error, and not-found pages.
- [ ] Add Open Graph metadata.
- [ ] Add API rate limiting.
- [ ] Add shared request validation.
- [ ] Add AI usage and cost controls.
- [ ] Add database migrations and rollback documentation.
- [ ] Add authorization tests.
- [ ] Add end-to-end tests for major flows.
- [ ] Review React strict mode.
- [ ] Review the global COOP/COEP headers.

-->
