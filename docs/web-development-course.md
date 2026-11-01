# Intro to Web Development: course design

Course slug: `intro-to-web-development`
Audience: complete beginners. No assumed knowledge of HTML, CSS, JavaScript, or programming.
Goal: by the end, a learner can build a small interactive page from scratch (structure in HTML, look in CSS, behaviour in JavaScript) and can read and debug simple pages.

## Shape

35 lessons in three parts. Each lesson has exactly one puzzle, so every lesson ends with something the learner builds and gets checked. The last lesson is a capstone that uses all three languages.

| # | Part | Lesson | Puzzle |
|---|------|--------|--------|
| 1 | HTML | How the web is built | Your first page |
| 2 | HTML | The structure of an HTML document | Document structure |
| 3 | HTML | Tags, elements, and attributes | Tags and attributes |
| 4 | HTML | Headings and paragraphs | Headings and paragraphs |
| 5 | HTML | Lists | A list of languages |
| 6 | HTML | Links and images | Links and images |
| 7 | HTML | Semantic page layout | Semantic layout |
| 8 | HTML | Divs, spans, classes, and ids | A card with a highlight |
| 9 | HTML | Tables | A score table |
| 10 | HTML | Forms | A sign-up form |
| 11 | CSS | How styles attach to a page | Make the heading red |
| 12 | CSS | Selectors | Selectors |
| 13 | CSS | Colors and backgrounds | Colors |
| 14 | CSS | Text and fonts | Text and fonts |
| 15 | CSS | The box model | Padding, margin, and border |
| 16 | CSS | Sizing and display | Width and display |
| 17 | CSS | Flexbox | A flexible menu |
| 18 | CSS | Grid | A grid gallery |
| 19 | CSS | Responsive design | Responsive container |
| 20 | CSS | States and transitions | Button hover |
| 21 | CSS | Specificity and the cascade | Which rule wins |
| 22 | JavaScript | Running JavaScript | Your first script |
| 23 | JavaScript | Variables | Variables |
| 24 | JavaScript | Numbers, strings, and booleans | Types |
| 25 | JavaScript | Operators and comparisons | Operators |
| 26 | JavaScript | Conditionals | Making decisions |
| 27 | JavaScript | Functions | Functions |
| 28 | JavaScript | Arrays | Arrays |
| 29 | JavaScript | Loops | Loops |
| 30 | JavaScript | Array methods | map, filter, reduce |
| 31 | JavaScript | Objects | Objects |
| 32 | JavaScript | Finding and changing elements | Change the page |
| 33 | JavaScript | Events | Click to like |
| 34 | JavaScript | Changing classes and styles | Highlight on click |
| 35 | JavaScript | Capstone: an interactive page | Click counter |

## How the puzzles are checked

The question was how to test whether HTML, CSS and JavaScript are correct. Comparing source text is fragile: `red` and `#ff0000` mean the same thing, and whitespace or attribute order should not matter. Running the code and asking the resulting page questions works better, because it tests what the browser actually does.

Each web puzzle has `kind: web` and a `webConfig` block in its frontmatter:

- `files`: the starter `html`, `css` and `js` the learner begins with. The HTML is a full document.
- `checks`: a list of questions about the learner's page, run in order after the page has loaded.
- `solution`: one correct answer. It is used by the author's tests and is never sent to the browser.

Check types:

| Type | Asks | Why it works for beginners |
|------|------|----------------------------|
| `element` | Does an element matching a selector exist? | Structure from HTML |
| `count` | How many elements match? | Lists, tables, repeated items |
| `text` | What text does the first match contain? | Content from HTML and JS |
| `attribute` | What is an attribute's value? | `href`, `src`, `alt`, `lang` |
| `style` | What is the computed value of a CSS property? | Uses the browser's own resolved value, so `red` and `rgb(255, 0, 0)` both pass |
| `script` | What does a JavaScript expression evaluate to? | Variables, functions, arrays and objects |
| `click` | After clicking an element, what does a target say? | Event handlers |

The learner's page runs inside a sandboxed iframe, `sandbox="allow-scripts"`, which gives it an opaque origin. It cannot read the course page, cookies, or storage. The checker is a small script added after the learner's code. It runs when the page loads, reports results to the parent with `postMessage`, and the parent accepts only messages from that iframe. The parent gives up after four seconds, which catches infinite loops.

Checks run in order, so a `click` can be followed by checks that look at what the click changed. Checks run in an 800px-wide frame, which is what makes `style` checks on widths and media queries predictable.

### Testing the authoring

Three layers protect the content:

1. **Structure tests** (`tests/webdev-course-content.test.mjs`, runs in `npm test`). Every lesson in the course exists, orders are 1..35, every puzzle is a valid `web` config with check types and fields the runner understands, the solution is never exposed to the browser, and every lesson's MDX compiles through `next-mdx-remote`.
2. **Unit tests** (`tests/web-puzzle.test.mjs`). The pure parts (validation, document assembly, labels, escaping) run in Node.
3. **Browser run** (manual, done for this course). The checker needs a real DOM, so Node can't run it. Each puzzle's `solution` was run through the real `runWebChecks` code in a browser, and each starter was run too. All 35 solutions pass every check, and every starter fails at least one. Re-run this after changing a check or a solution. A puzzle whose solution fails is a broken puzzle.

## Limits

- Checks are visible to the learner in the page's source. That's fine for practice, but these puzzles are not graded; a learner can read a check's expected value. Hidden checks would need a server-side runner, which is out of scope here.
- A check cannot see hover or focus state directly. The lesson teaches `:hover` by having the puzzle check that the rule exists in the stylesheet.
- A learner's `while (true)` freezes the tab for the iframe's thread. The four-second timeout reports this, but it cannot stop it.
