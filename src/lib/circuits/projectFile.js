// Builds and parses the .mdx files used to export/import whole projects.
//
// The file is plain MDX: human-readable frontmatter + a short note, with the
// actual circuit data embedded as a fenced JSON block. Parsing only cares
// about that block (and, cosmetically, two frontmatter fields) — everything
// else is just there so the file reads sensibly if someone opens it.

const DATA_FENCE_START = "```json circuit-data";
const DATA_FENCE_END = "```";

export function buildProjectMdx({ name = "Untitled Project", components = [], connections = [], chips = {} }) {
  const savedAt = new Date().toISOString();
  const payload = { components, connections, chips };

  return `---
name: ${name}
savedAt: ${savedAt}
---

This circuit was exported from the Codeloop logic simulator.

${DATA_FENCE_START}
${JSON.stringify(payload, null, 2)}
${DATA_FENCE_END}
`;
}

export function parseProjectMdx(text) {
  const startIdx = text.indexOf(DATA_FENCE_START);
  if (startIdx === -1) throw new Error("No circuit data found in file");
  const afterStart = text.slice(startIdx + DATA_FENCE_START.length);
  const endIdx = afterStart.indexOf(DATA_FENCE_END);
  if (endIdx === -1) throw new Error("Malformed circuit data block");

  const payload = JSON.parse(afterStart.slice(0, endIdx).trim());
  const nameMatch = text.match(/^name:\s*(.+)$/m);
  const savedAtMatch = text.match(/^savedAt:\s*(.+)$/m);

  return {
    name: nameMatch ? nameMatch[1].trim() : "Untitled Project",
    savedAt: savedAtMatch ? savedAtMatch[1].trim() : null,
    components: payload.components ?? [],
    connections: payload.connections ?? [],
    chips: payload.chips ?? {},
  };
}

export function slugify(name) {
  const slug = (name || "project")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "project";
}