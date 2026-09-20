import fs from "node:fs";
import path from "node:path";

const TAXONOMY_PATH = path.join(process.cwd(), "content/taxonomy.json");

// Server-side only (uses fs). Returns the full taxonomy plus derived lookup
// maps used for hierarchy roll-up.
export function loadTaxonomy() {
  const raw = JSON.parse(fs.readFileSync(TAXONOMY_PATH, "utf8"));

  const areasByTopicId = new Map(raw.topics.map((t) => [t.id, t.areas || []]));
  const topicsByTagId = new Map(raw.tags.map((t) => [t.id, t.topics || []]));

  return { ...raw, areasByTopicId, topicsByTagId };
}

// Maps aren't serializable across the server/client boundary, so client
// components (like the filter bar) get this plain-array subset instead.
export function toClientTaxonomy(taxonomy) {
  const { areas, topics, tags, languages, difficulties } = taxonomy;
  return { areas, topics, tags, languages, difficulties };
}

export function labelFor(list, id) {
  return list.find((entry) => entry.id === id)?.label || id;
}

// Given a content item's own areas/topics/tags, returns the *effective*
// areas/topics after rolling up through the taxonomy graph. A puzzle
// tagged only with the "binary-search" concept effectively belongs to the
// "searching" and "arrays" topics, and the "algorithms"/"data-structures"
// areas — without the author needing to repeat that by hand.
export function expandTaxonomy({ areas = [], topics = [], tags = [] }, taxonomy) {
  const effectiveTopics = new Set(topics);
  for (const tagId of tags) {
    for (const topicId of taxonomy.topicsByTagId.get(tagId) || []) {
      effectiveTopics.add(topicId);
    }
  }

  const effectiveAreas = new Set(areas);
  for (const topicId of effectiveTopics) {
    for (const areaId of taxonomy.areasByTopicId.get(topicId) || []) {
      effectiveAreas.add(areaId);
    }
  }

  return { effectiveAreas: [...effectiveAreas], effectiveTopics: [...effectiveTopics] };
}

// Groups topics under each area they belong to (a topic can appear under
// more than one area), and tags under each topic they belong to — used to
// render the Create page's checkboxes in a way that shows the hierarchy
// instead of one long flat list.
export function groupTopicsByArea(taxonomy) {
  return taxonomy.areas.map((area) => ({
    area,
    topics: taxonomy.topics.filter((topic) => (topic.areas || []).includes(area.id)),
  }));
}

export function groupTagsByTopic(taxonomy) {
  return taxonomy.topics.map((topic) => ({
    topic,
    tags: taxonomy.tags.filter((tag) => (tag.topics || []).includes(topic.id)),
  }));
}

// Rejects any submitted id that isn't part of the controlled vocabulary —
// used server-side so the Create page's save endpoint can't be tricked
// (or bypassed entirely via a direct API call) into writing arbitrary tags.
export function isValidSelection(taxonomy, { areas = [], topics = [], tags = [], languages = [], difficulty }) {
  const idsOf = (list) => new Set(list.map((entry) => entry.id));
  const validAreas = idsOf(taxonomy.areas);
  const validTopics = idsOf(taxonomy.topics);
  const validTags = idsOf(taxonomy.tags);
  const validLanguages = idsOf(taxonomy.languages);
  const validDifficulties = idsOf(taxonomy.difficulties);

  if (areas.some((id) => !validAreas.has(id))) return false;
  if (topics.some((id) => !validTopics.has(id))) return false;
  if (tags.some((id) => !validTags.has(id))) return false;
  if (languages.some((id) => !validLanguages.has(id))) return false;
  if (difficulty && !validDifficulties.has(difficulty)) return false;
  return true;
}
