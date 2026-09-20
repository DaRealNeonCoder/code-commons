import MiniSearch from "minisearch";
import { getAllLessons } from "./lessons";
import { getAllPuzzles } from "./puzzles";
import { loadTaxonomy, expandTaxonomy, labelFor } from "./taxonomy";
import { getCourseForLesson } from "./courses";

function toContentItem(raw, type, taxonomy) {
  const areas = raw.areas || [];
  const topics = raw.topics || [];
  const tags = raw.tags || [];
  const languages = raw.languages || [];
  const { effectiveAreas, effectiveTopics } = expandTaxonomy({ areas, topics, tags }, taxonomy);

  return {
    ...raw,
    type,
    areas,
    topics,
    tags,
    languages,
    href: type === "lesson" ? `/lessons/${raw.id}` : `/puzzles/${raw.id}`,
    effectiveAreas,
    effectiveTopics,
    course: type === "lesson" ? getCourseForLesson(raw.id) : null,
    // Label text (not ids) gets indexed for free-text search, so searching
    // "algorithms" matches even content that only carries a narrower tag.
    _searchText: {
      areaLabels: effectiveAreas.map((id) => labelFor(taxonomy.areas, id)).join(" "),
      topicLabels: effectiveTopics.map((id) => labelFor(taxonomy.topics, id)).join(" "),
      tagLabels: tags.map((id) => labelFor(taxonomy.tags, id)).join(" "),
    },
  };
}

// Re-reads content from disk on every call, same as the rest of this
// project's content loaders — intentionally uncached. At this project's
// scale (dozens to low hundreds of items) re-parsing on each request is
// well within a normal response budget, and it means a lesson saved via
// /create is searchable immediately with no cache to invalidate. If the
// library grows into the thousands, the next step would be a build-time
// index rather than a redesign of this API.
export function getAllContent() {
  const taxonomy = loadTaxonomy();
  const lessons = getAllLessons().map((lesson) => toContentItem(lesson, "lesson", taxonomy));
  const puzzles = getAllPuzzles().map((puzzle) => toContentItem(puzzle, "puzzle", taxonomy));
  return [...lessons, ...puzzles];
}

function matchesFilters(item, filters) {
  const { types, areas, topics, tags, languages, difficulty } = filters;

  if (types?.length && !types.includes(item.type)) return false;
  if (difficulty?.length && !difficulty.includes(item.difficulty)) return false;
  if (areas?.length && !areas.some((a) => item.effectiveAreas.includes(a))) return false;
  if (topics?.length && !topics.some((t) => item.effectiveTopics.includes(t))) return false;
  if (tags?.length && !tags.some((t) => item.tags.includes(t))) return false;

  if (languages?.length) {
    const isLanguageless = item.languages.length === 0;
    const matchesLanguage = item.languages.some((l) => languages.includes(l));
    if (!isLanguageless && !matchesLanguage) return false;
  }

  return true;
}

// types/areas/topics/tags/languages/difficulty are all arrays: values
// within one axis are OR'd together, axes are AND'd together. An empty
// array for an axis means "no filter on that axis."
export function searchContent({
  query,
  types = [],
  areas = [],
  topics = [],
  tags = [],
  languages = [],
  difficulty = [],
} = {}) {
  const items = getAllContent();
  const filters = { types, areas, topics, tags, languages, difficulty };
  const trimmedQuery = (query || "").trim();

  if (!trimmedQuery) {
    return items.filter((item) => matchesFilters(item, filters));
  }

  // Lessons and puzzles are separate id namespaces, so a composite key
  // avoids collisions if a lesson and a puzzle ever share a slug.
  const keyOf = (item) => `${item.type}:${item.id}`;
  const byKey = new Map(items.map((item) => [keyOf(item), item]));

  const index = new MiniSearch({
    idField: "_key",
    fields: ["title", "summary", "areaLabels", "topicLabels", "tagLabels"],
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 3, summary: 2 } },
  });
  index.addAll(
    items.map((item) => ({
      _key: keyOf(item),
      title: item.title,
      summary: item.summary,
      areaLabels: item._searchText.areaLabels,
      topicLabels: item._searchText.topicLabels,
      tagLabels: item._searchText.tagLabels,
    }))
  );

  return index
    .search(trimmedQuery, { filter: (result) => matchesFilters(byKey.get(result.id), filters) })
    .map((result) => byKey.get(result.id));
}
