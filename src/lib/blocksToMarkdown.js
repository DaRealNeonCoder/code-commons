// Turns the block editor's state into a plain Markdown string.
//
// Every block's raw text is escaped for Markdown-special characters first,
// so an author who types a literal "*" or "_" gets that literal character
// back, instead of accidentally triggering italics/bold. That's the whole
// point of building a block editor instead of asking people to write
// Markdown by hand.

const ESCAPE_PATTERN = /[\\`*_[\]]/g;

export function escapeMarkdown(text) {
  return text.replace(ESCAPE_PATTERN, (match) => `\\${match}`);
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