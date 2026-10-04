import MiniSearch from "minisearch";
import { getLessons } from "./lessonStore";
import { getAllPuzzles } from "./puzzles";
import { getAllShaders } from "./shaders/shaders";
import { getAllCircuits } from "./circuits/circuits";
import { getAllProjects } from "./codingProjects";
import { loadTaxonomy, expandTaxonomy, labelFor } from "./taxonomy";
import { getAllCourses } from "./courses";
import { getRatingTotals, wilsonScore } from "./ratings";

const HREF_PREFIX = {
  course: "/courses",
  lesson: "/lessons",
  puzzle: "/puzzles",
  shader: "/shaders",
  circuit: "/circuits",
  project: "/projects",
};

// How much a perfect rating can lift a result, relative to a perfect text
// match (1.0).
const RATING_WEIGHT = 0.25;

// `course` is the first course containing a lesson (lessons only), or null.
function toContentItem(raw, type, taxonomy, course = null) {
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
    course,
    _searchText: {
      areaLabels: effectiveAreas.map((id) => labelFor(taxonomy.areas, id)).join(" "),
      topicLabels: effectiveTopics.map((id) => labelFor(taxonomy.topics, id)).join(" "),
      tagLabels: tags.map((id) => labelFor(taxonomy.tags, id)).join(" "),
    },
  };
}

// Everything now comes from the database (lessons also still merge in the
// official .mdx files). Intentionally uncached: one cheap list query per type,
// so anything published via /create is searchable immediately.
export async function getAllContent() {
  const taxonomy = loadTaxonomy();
  const [rawLessons, rawPuzzles, rawShaders, rawCircuits, rawProjects, rawCourses] = await Promise.all([
    getLessons(),
    getAllPuzzles(),
    getAllShaders(),
    getAllCircuits(),
    getAllProjects(),
    getAllCourses(),
  ]);

  const lessonsById = new Map(rawLessons.map((l) => [l.id, l]));

  // One pass instead of a query per lesson. Courses arrive oldest first.
  const firstCourseOf = new Map();
  for (const course of rawCourses) {
    for (const lessonId of course.lessons) {
      if (!firstCourseOf.has(lessonId)) firstCourseOf.set(lessonId, { id: course.id, title: course.title });
    }
  }

  const courses = rawCourses.map((course) => toContentItem(courseToRaw(course, lessonsById), "course", taxonomy));
  const lessons = rawLessons.map((l) => toContentItem(l, "lesson", taxonomy, firstCourseOf.get(l.id) ?? null));
  const puzzles = rawPuzzles.map((p) => toContentItem(p, "puzzle", taxonomy));
  const shaders = rawShaders.map((s) => toContentItem(s, "shader", taxonomy));
  const circuits = rawCircuits.map((c) => toContentItem(c, "circuit", taxonomy));
  const projects = rawProjects.map((p) => toContentItem(p, "project", taxonomy));
  return [...courses, ...lessons, ...puzzles, ...shaders, ...circuits, ...projects];
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

function withRating(item, totals) {
  const { likes = 0, dislikes = 0 } = totals.get(`${item.type}:${item.id}`) ?? {};
  return { ...item, rating: { likes, dislikes, score: wilsonScore(likes, dislikes) } };
}

function compareByRating(a, b) {
  return (
    b.rating.score - a.rating.score ||
    b.rating.likes - b.rating.dislikes - (a.rating.likes - a.rating.dislikes) ||
    (a.title || "").localeCompare(b.title || "")
  );
}

// types/areas/topics/tags/languages/difficulty are all arrays: values within one
// axis are OR'd, axes are AND'd. Empty array = no filter on that axis.
// sort: "relevance" (default, text match boosted by rating) | "rating".
// async: await it.
export async function searchContent({
  query,
  types = [],
  areas = [],
  topics = [],
  tags = [],
  languages = [],
  difficulty = [],
  sort = "relevance",
} = {}) {
  const [totals, content] = await Promise.all([getRatingTotals(), getAllContent()]);
  const items = content.map((item) => withRating(item, totals));
  const filters = { types, areas, topics, tags, languages, difficulty };
  const trimmedQuery = (query || "").trim();

  if (!trimmedQuery) {
    return items.filter((item) => matchesFilters(item, filters)).sort(compareByRating);
  }

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

  const hits = index.search(trimmedQuery, {
    filter: (result) => matchesFilters(byKey.get(result.id), filters),
  });

  if (sort === "rating") {
    return hits.map((hit) => byKey.get(hit.id)).sort(compareByRating);
  }

  const topScore = hits[0]?.score || 1;
  return hits
    .map((hit) => {
      const item = byKey.get(hit.id);
      return { item, rank: hit.score / topScore + RATING_WEIGHT * item.rating.score };
    })
    .sort((a, b) => b.rank - a.rank)
    .map(({ item }) => item);
}
