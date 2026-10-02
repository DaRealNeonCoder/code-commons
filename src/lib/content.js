import MiniSearch from "minisearch";
import { getAllLessons } from "./lessons";
import { getAllPuzzles } from "./puzzles";
import { getAllShaders } from "./shaders/shaders";
import { getAllCircuits } from "./circuits/circuits";
import { loadTaxonomy, expandTaxonomy, labelFor } from "./taxonomy";
import { getCourseForLesson } from "./courses";
import { getAllCourses } from "./courses"; // alongside the existing getCourseForLesson import

const HREF_PREFIX = {
  course: "/courses",
  lesson: "/lessons",
  puzzle: "/puzzles",
  shader: "/shaders",
  circuit: "/circuits",
};
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
    href: `${HREF_PREFIX[type]}/${raw.id}`,
    effectiveAreas,
    effectiveTopics,
    // Only lessons belong to a course right now — shaders/circuits have no
    // equivalent grouping yet, so this just stays null for them.
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
  const rawLessons = getAllLessons();
  const lessonsById = new Map(rawLessons.map((l) => [l.id, l]));

  const courses = getAllCourses().map((course) =>
    toContentItem(courseToRaw(course, lessonsById), "course", taxonomy)
  );
  const lessons = rawLessons.map((lesson) => toContentItem(lesson, "lesson", taxonomy));
  const puzzles = getAllPuzzles().map((puzzle) => toContentItem(puzzle, "puzzle", taxonomy));
  const shaders = getAllShaders().map((shader) => toContentItem(shader, "shader", taxonomy));
  const circuits = getAllCircuits().map((circuit) => toContentItem(circuit, "circuit", taxonomy));
  return [...courses, ...lessons, ...puzzles, ...shaders, ...circuits];
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
function courseToRaw(course, lessonsById) {
  const own = course.lessons.map((id) => lessonsById.get(id)).filter(Boolean);
  const union = (key) => [...new Set(own.flatMap((l) => l[key] || []))];
  return {
    available: true,
    difficulty: own[0]?.difficulty ?? "beginner",
    areas: union("areas"),
    topics: union("topics"),
    tags: union("tags"),
    languages: union("languages"),
    ...course,
  };
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

  // Lessons/puzzles/shaders/circuits are separate id namespaces, so a
  // composite key avoids collisions if two types ever share a slug.
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