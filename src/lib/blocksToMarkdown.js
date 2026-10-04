// Turns the block editor's state into a plain Markdown string that is safe to
// compile as MDX.
//
// Block text is DATA, never syntax. Every block's raw text is escaped first, so:
//   - a literal "*" or "_" stays a literal character (no accidental italics/bold)
//   - "{ ... }" can't become a JavaScript expression, and "<Tag>" can't become JSX
//   - a line starting with "import" or "export" can't become an ESM statement
// Those last two matter because MDX is JavaScript: if the text were left raw,
// anyone able to POST a block could run code on the server that renders it.

// Characters that are escaped with a backslash. A backslash before any ASCII
// punctuation is a valid Markdown/MDX escape and renders as the plain character.
const ESCAPE_PATTERN = /[\\`*_[\]{}<>]/g;

// MDX treats a line that starts with `import` / `export` as ESM. Swapping the
// first letter for a character reference (&#105; = "i", &#101; = "e") renders
// the same text but is no longer a keyword to the parser.
const ESM_LINE = /^([ \t]*)(import|export)(?![\w$])/gm;

function neutralizeEsm(text) {
  return text.replace(ESM_LINE, (_, indent, word) => `${indent}${word[0] === "i" ? "&#105;" : "&#101;"}${word.slice(1)}`);
}

export function escapeMarkdown(text) {
  return neutralizeEsm(text.replace(ESCAPE_PATTERN, (match) => `\\${match}`));
}

export function blockToMarkdown(block) {
  const escaped = escapeMarkdown(block.content || "");
  const text = block.bold ? `**${escaped}**` : escaped;

  if (block.size === "title") return `# ${text}`;
  if (block.size === "subtitle") return `## ${text}`;
  return text;
}

export function blocksToMarkdown(blocks) {
  return blocks
    .filter((block) => (block.content || "").trim() !== "")
    .map(blockToMarkdown)
    .join("\n\n");
}
