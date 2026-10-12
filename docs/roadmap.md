<!--

# CodeCommons Contributor Roadmap

All items below are pending work. The existing README TODO items retain their
original wording and unchecked status. Project-review follow-ups are included
as additional pending items.

## Miscellaneous fixes


## AI assistance

- [ ] Add progressive hints that use a learner's failed attempts and test output without revealing the answer.
- [ ] Let lesson authors configure AI objectives, allowed tools, tone, and rubric-specific guidance.
- [ ] Add AI-generated explanations for compiler errors, circuit traces, shader compile errors, and test failures.
- [ ] Add conversation persistence, usage limits, model selection, and clear privacy controls.
- [ ] Provide an author review flow for AI-generated hints and explanations before publishing them.

## Learning experience


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

- [ ] Add creator profiles, follows, bookmarks, collections, and content revision history.
- [ ] Add a richer content review workflow with drafts, previews, approvals, and rollback.
- [ ] Add import/export tools for lessons, courses, puzzles, circuits, shaders, and coding projects.

## Engineering and operations

- [ ] Add meaningful unit, integration, API, database, and end-to-end tests for the major learning flows.
- [ ] Add database migrations and a documented production deployment/rollback procedure.
- [ ] Add request validation, rate limiting, abuse monitoring, audit logs, and stronger authorization tests.
- [ ] Add observability for code execution, AI requests, publishing, comments, and failed background work.
- [ ] Add caching and pagination for large comment threads, browse results, courses, and creator dashboards.
- [ ] Add CI checks for linting, builds, migrations, accessibility, dependency vulnerabilities, and content validation.

## Repository hygiene and security

- [ ] Rotate credentials currently stored in `.env.local`.
- [ ] Add `.env.example`.

- [ ] Decide whether to ignore, vendor, or isolate the Piston checkout.

## Current project drift

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
- [ ] Add Open Graph metadata.
- [ ] Add API rate limiting.
- [ ] Add shared request validation.
- [ ] Add AI usage and cost controls.
- [ ] Add database migrations and rollback documentation.
- [ ] Add authorization tests.
- [ ] Add end-to-end tests for major flows.
- [ ] Review React strict mode.
- [ ] Review the global COOP/COEP headers.

## new stuff

We are gonna do a lot of seo optimization stuff.
the following text is stuff I took from a conversation, follow it as best as you can.
One page per concept, targeting one specific query. “Binary search explained” beats a generic “Algorithms” page. Use the exact phrasing people search for in the title, H1, and URL. (create a new binary search lesson, inside a searching algorithms course (add in red black tree + MCTS + b-trees etc, (you can leave em as stubs for now, but make sure the binary search lesson is fully working, im 90% sure you can also just link an existing binary search tree lesson we have, otherwise make a binary search tree lesson and link it)), and use the SEO optimization we talk about on it)

Next.js specifics: use the App Router’s generateMetadata for unique titles/descriptions per page, add a sitemap.ts and robots.ts and fill them up properly, and make sure lessons are statically generated (SSG/ISR) so they load fast and are fully crawlable.  Add Course, Article, or LearningResource JSON-LD schema where you see fit.

Core Web Vitals matter. Vercel Analytics/Speed Insights will show where you’re slow. Lazy-load heavy things like code editors and circuit simulators. (I do believe we already do this, double check tho) 

Internal linking: link every lesson to prerequisites and next steps. It helps both crawling and retention. (we already kinda do this, if you can think of some 
"non invasive" way to improve this go for it.)

make sure the first intro python course, and this new searching algorithms course does all the SEO stuff we mentioned. 

-->
