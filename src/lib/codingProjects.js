import { listProjectsByType } from "./creatorProjects";

const LANGUAGE_IDS = ["python", "cpp", "rust"];
const SUMMARY_LENGTH = 160;

// The saved `content` is generated markdown. Strip it down to plain text for the
// search summary, skipping the title line since the card already shows the title.
function toPlainText(markdown, title) {
  const titleKey = title.trim().toLowerCase();
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .split("\n")
    .filter((line) => line.replace(/^#+\s*/, "").trim().toLowerCase() !== titleKey)
    .join(" ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/(^|\s)[-*+]\s/g, " ")
    .replace(/[#*_`>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text) {
  return text.length > SUMMARY_LENGTH ? `${text.slice(0, SUMMARY_LENGTH).trimEnd()}…` : text;
}

// Same shape as getAllPuzzles(): returns raw items that content.js wraps with toContentItem.
export function getAllProjects() {
  return listProjectsByType("project").flatMap((project) => {
    const { data } = project;
    const title = project.title.trim();
    const language = LANGUAGE_IDS.includes(data.language) ? data.language : "python";
    const starterCode = typeof data.starterCode === "string" ? data.starterCode : "";
    const content = typeof data.content === "string" ? data.content : "";
    const description = toPlainText(content, title);

    // Not "published" until it has a title and something to show.
    if (!title || (!starterCode.trim() && !description)) return [];

    return [
      {
        id: project.id,
        title,
        summary: truncate(description),
        available: true,
        languages: [language],
        difficulty: "",
        areas: [],
        topics: [],
        tags: [],
      },
    ];
  });
}