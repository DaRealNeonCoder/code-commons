"use client";

import { useEffect, useMemo, useState } from "react";
import { MultiSelectDropdown, SingleSelectDropdown } from "./FilterPrimitives";

function toggle(list, value) {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export const EMPTY_TAXONOMY_SELECTION = {
  areas: [],
  topics: [],
  tags: [],
  languages: [],
  difficulty: "",
};

/**
 * Area -> Topic -> Tag cascade, plus Language and Difficulty, rendered with
 * the exact same dropdown primitives the search filter bar uses, so it looks
 * and behaves identically wherever it's dropped in.
 *
 * Pass `taxonomy` if the caller already has it (e.g. a server component that
 * loaded it for the page); otherwise this fetches GET /api/taxonomy itself
 * on mount, which is what every create page does since they're plain client
 * components with no server-fetched props.
 *
 * `languageMode="single"` renders Language as a single-select (for
 * filtering — one value narrows the results) instead of the default
 * multi-select (for tagging content with one or more languages, matching
 * the `languages: []` MDX frontmatter field).
 */
export default function FilterFields({
  taxonomy: taxonomyProp,
  showAreas = true,
  typeSlot = null,

  areas,
  onAreasChange,
  topics,
  onTopicsChange,
  tags,
  onTagsChange,

  languageMode = "multi",
  language,
  onLanguageChange,
  languages,
  onLanguagesChange,

  difficulty,
  onDifficultyChange,
}) {
  const [fetchedTaxonomy, setFetchedTaxonomy] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (taxonomyProp || fetchedTaxonomy) return;
    let cancelled = false;

    fetch("/api/taxonomy")
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load filter options.");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setFetchedTaxonomy(data);
      })
      .catch((err) => {
        if (!cancelled) setFetchError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [taxonomyProp, fetchedTaxonomy]);

  const taxonomy = taxonomyProp || fetchedTaxonomy;

  // Topics under a selected area, plus any already-selected topic whose area
  // got deselected since — so an existing selection never silently vanishes
  // from the list. (Assumption: this narrows options by current selection,
  // unlike the original search bar where the narrowing — if any — happened
  // server-side before groupedTopics/groupedTags ever reached the component.
  // Flag this if it doesn't match what your search page actually does.)
  const groupedTopics = useMemo(() => {
    if (!taxonomy) return [];
    return taxonomy.areas
      .map((area) => ({
        area,
        topics: taxonomy.topics.filter(
          (t) =>
            t.areas.includes(area.id) &&
            (areas.includes(area.id) || topics.includes(t.id))
        ),
      }))
      .filter((g) => g.topics.length > 0);
  }, [taxonomy, areas, topics]);

  const groupedTags = useMemo(() => {
    if (!taxonomy) return [];
    return taxonomy.topics
      .map((topic) => ({
        topic,
        tags: taxonomy.tags.filter(
          (tg) =>
            tg.topics.includes(topic.id) &&
            (topics.includes(topic.id) || tags.includes(tg.id))
        ),
      }))
      .filter((g) => g.tags.length > 0);
  }, [taxonomy, topics, tags]);

  const showTopics = areas.length > 0 || topics.length > 0;
  const showTags = topics.length > 0 || tags.length > 0;

  if (fetchError) {
    return <p className="text-sm text-red-600 dark:text-red-400">{fetchError}</p>;
  }
  if (!taxonomy) {
    return <p className="text-sm text-zinc-400">Loading filters…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-6">
        {typeSlot}

        {languageMode === "single" ? (
          <SingleSelectDropdown
            label="Language"
            options={taxonomy.languages}
            value={language}
            onChange={onLanguageChange}
            emptyLabel="Any language"
            searchPlaceholder="Search languages..."
          />
        ) : (
          <MultiSelectDropdown
            label="Language"
            groups={[{ options: taxonomy.languages }]}
            selected={languages}
            onToggle={(id) => onLanguagesChange(toggle(languages, id))}
            searchPlaceholder="Search languages..."
          />
        )}

        <SingleSelectDropdown
          label="Difficulty"
          options={taxonomy.difficulties}
          value={difficulty}
          onChange={onDifficultyChange}
          emptyLabel="Any difficulty"
          searchPlaceholder="Search difficulties..."
        />
      </div>

      {showAreas && (
        <div className="flex flex-wrap gap-6 border-t border-zinc-100 pt-4 dark:border-zinc-900">
          <MultiSelectDropdown
            label="Area"
            groups={[{ options: taxonomy.areas }]}
            selected={areas}
            onToggle={(id) => onAreasChange(toggle(areas, id))}
            searchPlaceholder="Search areas..."
          />

          {showTopics && (
            <MultiSelectDropdown
              label="Topic"
              groups={groupedTopics.map(({ area, topics: areaTopics }) => ({
                groupLabel: area.label,
                options: areaTopics,
              }))}
              selected={topics}
              onToggle={(id) => onTopicsChange(toggle(topics, id))}
              searchPlaceholder="Search topics..."
            />
          )}

          {showTags && (
            <MultiSelectDropdown
              label="Tag / Concept"
              groups={groupedTags.map(({ topic, tags: topicTags }) => ({
                groupLabel: topic.label,
                options: topicTags,
              }))}
              selected={tags}
              onToggle={(id) => onTagsChange(toggle(tags, id))}
              searchPlaceholder="Search tags..."
            />
          )}
        </div>
      )}
    </div>
  );
}