// Web puzzles: HTML, CSS and JavaScript exercises that are checked in the browser.
//
// A web puzzle has three parts in its frontmatter:
//   files:    the starter html, css and js the learner begins with
//   checks:   questions asked of the learner's page once it has loaded
//   solution: (optional) one correct answer, used by the author's tests only.
//             It is never sent to the browser.
//
// Checking works like this: the learner's code runs inside a sandboxed iframe
// that has no access to this page. A small checker script runs after the page
// loads, asks the document questions and reports pass or fail back with
// postMessage. See buildCheckDocument below.

export const WEB_CONFIG_VERSION = 1;
export const WEB_CHECK_SOURCE = "codecommons-web-check";

const MAX_FILE_LENGTH = 20_000;
const MAX_TEXT_LENGTH = 500;
const MAX_CHECKS = 20;
const FILE_NAMES = ["html", "css", "js"];

// Every check type and the fields it needs. Anything else is rejected, so a
// typo in a puzzle fails the authoring tests instead of silently passing.
export const CHECK_FIELDS = {
  element: ["selector"],
  text: ["selector", "text"],
  count: ["selector", "count"],
  style: ["selector", "property", "value"],
  attribute: ["selector", "attribute", "value"],
  script: ["expression", "expected"],
  click: ["selector", "target", "text"],
};

function cleanText(value, max = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") return null;
  return value.length <= max ? value : null;
}

// Checks are plain data: a type plus the fields listed above, and an optional label.
function normalizeCheck(value) {
  if (!value || typeof value !== "object" || !Object.hasOwn(CHECK_FIELDS, value.type)) return null;

  const required = CHECK_FIELDS[value.type];
  const check = { type: value.type };
  for (const field of required) {
    if (value[field] === undefined || value[field] === null) return null;
    if (field === "count") {
      if (!Number.isInteger(value.count) || value.count < 0) return null;
      check.count = value.count;
    } else if (field === "expected") {
      // expected can be any JSON value: a number, a string, a boolean, an array...
      if (typeof value.expected === "function" || typeof value.expected === "symbol") return null;
      check.expected = value.expected;
    } else {
      const text = cleanText(value[field]);
      if (text === null) return null;
      check[field] = text;
    }
  }

  if (value.label !== undefined) {
    const label = cleanText(value.label);
    if (label === null) return null;
    check.label = label;
  } else {
    check.label = defaultLabel(check);
  }
  return check;
}

function defaultLabel(check) {
  switch (check.type) {
    case "element":
      return `There is an element matching ${check.selector}`;
    case "text":
      return `${check.selector} says "${check.text}"`;
    case "count":
      return `${check.selector} appears ${check.count} time(s)`;
    case "style":
      return `${check.selector} has ${check.property}: ${check.value}`;
    case "attribute":
      return `${check.selector} has ${check.attribute}="${check.value}"`;
    case "script":
      return `${check.expression} gives ${JSON.stringify(check.expected)}`;
    case "click":
      return `Clicking ${check.selector} updates ${check.target} to "${check.text}"`;
    default:
      return check.type;
  }
}

function normalizeFiles(value) {
  if (!value || typeof value !== "object") return null;
  const files = {};
  for (const name of FILE_NAMES) {
    const file = value[name] ?? "";
    if (typeof file !== "string" || file.length > MAX_FILE_LENGTH) return null;
    files[name] = file;
  }
  return files;
}

// Returns a strict copy of a web puzzle config, or null if it is malformed.
// The config comes from frontmatter (or the database), so treat it as untrusted.
export function normalizeWebConfig(value) {
  if (!value || typeof value !== "object" || value.version !== WEB_CONFIG_VERSION) return null;

  const files = normalizeFiles(value.files);
  if (!files || !Array.isArray(value.checks)) return null;
  if (value.checks.length === 0 || value.checks.length > MAX_CHECKS) return null;

  const checks = [];
  for (const raw of value.checks) {
    const check = normalizeCheck(raw);
    if (!check) return null;
    checks.push(check);
  }

  let solution = null;
  if (value.solution !== undefined && value.solution !== null) {
    solution = normalizeFiles(value.solution);
    if (!solution) return null;
  }

  return { version: WEB_CONFIG_VERSION, files, checks, solution };
}

// The only part of a web puzzle the browser receives: the starter files and
// the checks. The solution stays on the server.
export function getClientWebInfo(value) {
  const config = normalizeWebConfig(value);
  if (!config) return null;
  return {
    version: config.version,
    files: config.files,
    checks: config.checks.map(({ type, label, ...rest }) => ({ type, label, ...rest })),
  };
}

// --- Documents -------------------------------------------------------------

// The learner's HTML is a whole document. The CSS goes at the end of <head> and
// the JavaScript (plus any checker) at the end of <body>, so the page works the
// way it would on a real site. The iframe sandbox is what keeps it contained.
function pageSource({ html, css, js }, extraScript = "") {
  const style = `<style>\n${css}\n</style>`;
  const script = `<script>\n${js}\n</script>\n${extraScript}`;
  const withStyle = /<\/head>/i.test(html)
    ? html.replace(/<\/head>/i, () => `${style}\n</head>`)
    : `${style}\n${html}`;
  return /<\/body>/i.test(withStyle)
    ? withStyle.replace(/<\/body>/i, () => `${script}\n</body>`)
    : `${withStyle}\n${script}`;
}

// Live preview: exactly what the learner wrote, nothing added.
export function buildPreviewDocument(files) {
  return pageSource(files);
}

// Checking: the learner's page plus a checker that runs once everything has
// loaded. The checks are serialized as JSON, with "<" escaped so a value can't
// close the script tag early.
export function buildCheckDocument({ files, checks }) {
  const payload = JSON.stringify(checks).replace(/</g, "\\u003c");
  const checker = `(${runChecksInFrame.toString()})(${payload}, ${JSON.stringify(WEB_CHECK_SOURCE)});`;
  return pageSource(files, `<script>\nwindow.addEventListener("load", function () {\n${checker}\n});\n</script>`);
}

// This function is converted to text and runs inside the iframe, so it must
// not reference anything from this module. It asks each check question and
// posts the answers to the parent window.
function runChecksInFrame(checks, source) {
  var uncaught = null;
  window.addEventListener("error", function (event) {
    uncaught = event.message || "Your JavaScript stopped with an error.";
  });

  function clean(text) {
    return String(text == null ? "" : text).replace(/\s+/g, " ").trim();
  }

  function first(selector) {
    return document.querySelector(selector);
  }

  function run(check) {
    if (check.type === "element") {
      return [first(check.selector) !== null, "No element matches " + check.selector];
    }
    if (check.type === "count") {
      var found = document.querySelectorAll(check.selector).length;
      return [found === check.count, "Found " + found + ", expected " + check.count];
    }
    if (check.type === "text") {
      var node = first(check.selector);
      if (!node) return [false, "No element matches " + check.selector];
      var said = clean(node.textContent);
      return [said === check.text, 'It says "' + said + '"'];
    }
    if (check.type === "style") {
      var styled = first(check.selector);
      if (!styled) return [false, "No element matches " + check.selector];
      var actual = getComputedStyle(styled).getPropertyValue(check.property).trim();
      return [actual === check.value, "The computed " + check.property + " is " + actual];
    }
    if (check.type === "attribute") {
      var tagged = first(check.selector);
      if (!tagged) return [false, "No element matches " + check.selector];
      var attr = tagged.getAttribute(check.attribute);
      return [attr === check.value, "The " + check.attribute + " is " + JSON.stringify(attr)];
    }
    if (check.type === "script") {
      var value = new Function("return (" + check.expression + ");")();
      var same = JSON.stringify(value) === JSON.stringify(check.expected);
      return [same, check.expression + " returned " + JSON.stringify(value)];
    }
    if (check.type === "click") {
      var button = first(check.selector);
      if (!button) return [false, "No element matches " + check.selector];
      button.click();
      var output = first(check.target);
      if (!output) return [false, "No element matches " + check.target];
      var after = clean(output.textContent);
      return [after === check.text, "After the click it says \"" + after + '"'];
    }
    return [false, "Unknown check " + check.type];
  }

  var results = checks.map(function (check) {
    try {
      var outcome = run(check);
      return { label: check.label, pass: outcome[0], message: outcome[0] ? "" : outcome[1] };
    } catch (error) {
      return { label: check.label, pass: false, message: String(error && error.message ? error.message : error) };
    }
  });

  parent.postMessage({ source: source, results: results, uncaught: uncaught }, "*");
}
