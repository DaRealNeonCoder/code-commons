"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterFields from "@/components/filters/FilterFields";
import { MultiSelectDropdown } from "@/components/filters/FilterPrimitives";

function parseList(value) {
  return value ? value.split(",").filter(Boolean) : [];
}

function toggle(list, value) {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

const TYPE_OPTIONS = [
  { id: "lesson", label: "Lessons" },
  { id: "puzzle", label: "Puzzles" },
  { id: "shader", label: "Shaders" },
  { id: "circuit", label: "Circuits" },
];

export default function SearchFilterBar({ taxonomy, showTypeFilter = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentSearchParams = searchParams.toString();

  const [queryInput, setQueryInput] = useState(
    () => searchParams.get("q") || ""
  );

  const [types, setTypes] = useState(() => parseList(searchParams.get("type")));
  const [areas, setAreas] = useState(() => parseList(searchParams.get("area")));
  const [topics, setTopics] = useState(() => parseList(searchParams.get("topic")));
  const [tags, setTags] = useState(() => parseList(searchParams.get("tag")));
  const [language, setLanguage] = useState(
    () => searchParams.get("language") || ""
  );
  const [difficulty, setDifficulty] = useState(
    () => searchParams.get("difficulty") || ""
  );

  const [filtersOpen, setFiltersOpen] = useState(
    () =>
      types.length > 0 ||
      areas.length > 0 ||
      topics.length > 0 ||
      tags.length > 0 ||
      Boolean(language) ||
      Boolean(difficulty)
  );

  // Keep local state in sync when the URL changes after a search.
  useEffect(() => {
    setQueryInput(searchParams.get("q") || "");
    setTypes(parseList(searchParams.get("type")));
    setAreas(parseList(searchParams.get("area")));
    setTopics(parseList(searchParams.get("topic")));
    setTags(parseList(searchParams.get("tag")));
    setLanguage(searchParams.get("language") || "");
    setDifficulty(searchParams.get("difficulty") || "");
  }, [currentSearchParams, searchParams]);

  function submitSearch() {
    const params = new URLSearchParams(searchParams.toString());

    const updates = {
      q: queryInput,
      type: types,
      area: areas,
      topic: topics,
      tag: tags,
      language,
      difficulty,
    };

    for (const [key, value] of Object.entries(updates)) {
      const isEmpty =
        value == null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        params.delete(key);
      } else {
        params.set(key, Array.isArray(value) ? value.join(",") : value);
      }
    }

    startTransition(() => {
      router.push(
        params.toString() ? `${pathname}?${params.toString()}` : pathname
      );
    });
  }

  const activeFilterCount =
    types.length +
    areas.length +
    topics.length +
    tags.length +
    (language ? 1 : 0) +
    (difficulty ? 1 : 0);

  function clearAll() {
    setQueryInput("");
    setTypes([]);
    setAreas([]);
    setTopics([]);
    setTags([]);
    setLanguage("");
    setDifficulty("");
  }

  // Cascade: Type -> Area -> Topic -> Tag
  const showAreas = types.length > 0;

  return (
    <div className="mt-6 space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitSearch();
        }}
        className="flex gap-2"
      >
        <input
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Search lessons, puzzles, shaders, and circuits..."
          className="w-full rounded-md border border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />

        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Search
        </button>
      </form>

      <details
        open={filtersOpen}
        onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
        className="rounded-md border border-zinc-200 dark:border-zinc-800"
      >
        <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-2.5 font-mono text-sm text-zinc-600 dark:text-zinc-400">
          <span>
            filters
            {activeFilterCount > 0 && (
              <span className="ml-1 text-teal-600 dark:text-teal-400">
                ({activeFilterCount})
              </span>
            )}
          </span>

          {(activeFilterCount > 0 || queryInput) && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearAll();
              }}
              className="font-mono text-xs text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              clear all
            </button>
          )}
        </summary>

        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <FilterFields
            taxonomy={taxonomy}
            showAreas={showAreas}
            typeSlot={
              showTypeFilter && (
                <MultiSelectDropdown
                  label="Type"
                  groups={[{ options: TYPE_OPTIONS }]}
                  selected={types}
                  onToggle={(id) => setTypes(toggle(types, id))}
                  searchable={false}
                />
              )
            }
            areas={areas}
            onAreasChange={setAreas}
            topics={topics}
            onTopicsChange={setTopics}
            tags={tags}
            onTagsChange={setTags}
            languageMode="single"
            language={language}
            onLanguageChange={setLanguage}
            difficulty={difficulty}
            onDifficultyChange={setDifficulty}
          />
        </div>
      </details>
    </div>
  );
}