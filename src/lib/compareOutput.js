function normalize(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();
}

export function outputsMatch(actual, expected) {
  return normalize(actual) === normalize(expected);
}

// `input()` / `cin` behave best when the last line is newline-terminated.
export function withTrailingNewline(text) {
  const s = String(text ?? "");
  return s === "" || s.endsWith("\n") ? s : `${s}\n`;
}

export function clip(text, max = 500) {
  const s = String(text ?? "");
  return s.length > max ? `${s.slice(0, max)}…` : s;
}