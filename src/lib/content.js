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
const RELATED_WEIGHT = 0.18;
const INDEX_TTL_MS = 60_000;

// Small vocabulary bridges common learner language to the controlled taxonomy.
// The taxonomy labels remain the source of truth; aliases simply make discovery
// more forgiving when someone searches with a synonym or abbreviation.
const SEARCH_ALIASES = {
  algo: "algorithms",
  algorithms: "algo algorithm coding problem",
  ds: "data structures",
  "data structure": "data structures ds dsa",
  dsa: "data structures data structure algorithms",
  dp: "dynamic programming",
  recursion: "recursive recursive functions",
  "hash table": "hash maps hash map dictionary dictionaries",
  "hash map": "hash maps hashmap dictionary dictionaries",
  hashmap: "hash maps hash map dictionary dictionaries",
  dict: "hash maps dictionary dictionaries",
  list: "arrays array sequences",
  string: "strings text",
  oop: "object oriented classes objects",
  "object-oriented": "object oriented classes objects",
  js: "javascript web development",
  web: "web development html css javascript",
  py: "python programming",
};

let searchIndexCache = null;

function searchAliasText(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ");
  const phraseAliases = Object.entries(SEARCH_ALIASES)
    .filter(([key]) => normalized.includes(key))
    .map(([, aliases]) => aliases);
  const terms = normalized
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return [...phraseAliases, ...terms.map((term) => SEARCH_ALIASES[term] || "")].join(" ");
}

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
      aliases: [
        ...areas,
        ...effectiveAreas,
        ...topics,
        ...effectiveTopics,
        ...tags,
        ...languages,
        type,
        raw.title,
      ].map(searchAliasText).join(" "),
    },
  };
}

// Everything now comes from the database (lessons also still merge in the
// official .mdx files). The search snapshot is cached separately below so the
// index can be reused while ratings remain a fresh read for each request.
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

function overlapScore(item, seeds) {
  if (!seeds.length) return 0;
  const sets = (candidate) => [
    [candidate.effectiveTopics, 4],
    [candidate.tags, 3],
    [candidate.effectiveAreas, 1.5],
    [[candidate.type], 0.5],
  ];
  let score = 0;
  for (const seed of seeds) {
    const seedSets = sets(seed);
    for (const [index, [values, weight]] of sets(item).entries()) {
      const seedValues = new Set(seedSets[index][0]);
      score += values.length && values.some((value) => seedValues.has(value)) ? weight : 0;
    }
  }
  const maximum = seeds.length * 9;
  return maximum ? Math.min(score / maximum, 1) : 0;
}

function buildSearchIndex(items) {
  const index = new MiniSearch({
    idField: "_key",
    fields: ["title", "summary", "areaLabels", "topicLabels", "tagLabels", "aliases"],
    searchOptions: {
      prefix: true,
      fuzzy: (term) => (term.length >= 4 ? 0.3 : false),
      boost: { title: 5, summary: 2, topicLabels: 2.5, tagLabels: 2, aliases: 1.5 },
    },
  });
  index.addAll(
    items.map((item) => ({
      _key: `${item.type}:${item.id}`,
      title: item.title,
      summary: item.summary,
      areaLabels: item._searchText.areaLabels,
      topicLabels: item._searchText.topicLabels,
      tagLabels: item._searchText.tagLabels,
      aliases: item._searchText.aliases,
    }))
  );
  return index;
}

async function getSearchSnapshot() {
  if (searchIndexCache && Date.now() - searchIndexCache.createdAt < INDEX_TTL_MS) {
    return searchIndexCache;
  }

  const content = await getAllContent();
  searchIndexCache = { createdAt: Date.now(), content, index: buildSearchIndex(content) };
  return searchIndexCache;
}

export function invalidateSearchIndex() {
  searchIndexCache = null;
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
  const [{ content, index }, totals] = await Promise.all([getSearchSnapshot(), getRatingTotals()]);
  // Content and the MiniSearch index can be cached, but rating totals must not
  // be. A vote can happen between two browse requests while the index is still
  // warm, so apply the current totals after loading the cached snapshot.
  const items = content.map((item) => withRating(item, totals));
  const filters = { types, areas, topics, tags, languages, difficulty };
  const trimmedQuery = (query || "").trim();

  if (!trimmedQuery) {
    return items.filter((item) => matchesFilters(item, filters)).sort(compareByRating);
  }

  const keyOf = (item) => `${item.type}:${item.id}`;
  const byKey = new Map(items.map((item) => [keyOf(item), item]));

   const hits = index.search(trimmedQuery, {
     filter: (result) => matchesFilters(byKey.get(result.id), filters),
   });

  if (sort === "rating") {
    return hits.map((hit) => byKey.get(hit.id)).sort(compareByRating);
  }

   const topScore = hits[0]?.score || 1;
   const seeds = hits.slice(0, 3).map((hit) => byKey.get(hit.id));
   return hits
     .map((hit) => {
       const item = byKey.get(hit.id);
       const relatedScore = overlapScore(item, seeds.filter((seed) => seed !== item));
       return {
         item: { ...item, discovery: relatedScore > 0.18 ? "related match" : undefined },
         rank: hit.score / topScore + RATING_WEIGHT * item.rating.score + RELATED_WEIGHT * relatedScore,
       };
     })
    .sort((a, b) => b.rank - a.rank)
    .map(({ item }) => item);
}
