// Validates the block list the lesson creator sends, and reduces it to exactly
// { size, bold, content } per block. Anything else (extra keys, ids, wrong
// types) is dropped or normalised, so the server only ever builds MDX from a
// shape it fully controls.

export const MAX_BLOCKS = 200;
export const MAX_BLOCK_CHARS = 20_000;

const SIZES = new Set(["title", "subtitle", "normal"]);

// Returns a clean array, or null if the payload is malformed.
export function parseBlocks(value) {
  if (!Array.isArray(value) || value.length > MAX_BLOCKS) return null;

  const blocks = [];
  for (const block of value) {
    if (!block || typeof block !== "object") return null;
    const content = typeof block.content === "string" ? block.content : "";
    if (content.length > MAX_BLOCK_CHARS) return null;

    blocks.push({
      size: SIZES.has(block.size) ? block.size : "normal",
      bold: block.bold === true,
      content,
    });
  }
  return blocks;
}
