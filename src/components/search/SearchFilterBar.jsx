"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function parseList(value) {
  return value ? value.split(",").filter(Boolean) : [];
}

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function SearchFilterBar({ taxonomy, groupedTopics, groupedTags, showTypeFilter = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentQuery = searchParams.get("q") || "";
  const [queryInput, setQueryInput] = useState(currentQuery);

  const types = parseList(searchParams.get("type"));
  const areas = parseList(searchParams.get("area"));
  const topics = parseList(searchParams.get("topic"));
  const tags = parseList(searchParams.get("tag"));
  const language = searchParams.get("language") || "";
  const difficulty = searchParams.get("difficulty") || "";

  function pushParams(updates) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      const isEmpty = value == null || value === "" || (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        params.delete(key);
      } else {
        params.set(key, Array.isArray(value) ? value.join(",") : value);
      }
    }
    startTransition(() => {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
    });
  }

  // Debounce the text query so we're not navigating on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (queryInput !== currentQuery) {
        pushParams({ q: queryInput });
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  const hasActiveFilters =
    queryInput || types.length || areas.length || topics.length || tags.length || language || difficulty;

  function clearAll() {
    setQueryInput("");
    router.push(pathname);
  }

  return (
    <div className="mt-6 space-y-4">
      <input
        value={queryInput}
        onChange={(e) => setQueryInput(e.target.value)}
        placeholder="Search lessons and puzzles..."
        className="w-full rounded-md border border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />

      <div className="flex flex-wrap gap-4">
        {showTypeFilter && (
          <FilterGroup label="Type" defaultOpen>
            <CheckboxRow
              label="Lessons"
              checked={types.includes("lesson")}
              onChange={() => pushParams({ type: toggle(types, "lesson") })}
            />
            <CheckboxRow
              label="Puzzles"
              checked={types.includes("puzzle")}
              onChange={() => pushParams({ type: toggle(types, "puzzle") })}
            />
          </FilterGroup>
        )}

        <FilterGroup label="Area" defaultOpen>
          {taxonomy.areas.map((area) => (
            <CheckboxRow
              key={area.id}
              label={area.label}
              checked={areas.includes(area.id)}
              onChange={() => pushParams({ area: toggle(areas, area.id) })}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Topic">
          {groupedTopics.map(({ area, topics: areaTopics }) =>
            areaTopics.length === 0 ? null : (
              <div key={area.id} className="mb-2">
                <p className="mb-1 text-xs font-medium text-zinc-400">{area.label}</p>
                {areaTopics.map((topic) => (
                  <CheckboxRow
                    key={topic.id}
                    label={topic.label}
                    checked={topics.includes(topic.id)}
                    onChange={() => pushParams({ topic: toggle(topics, topic.id) })}
                  />
                ))}
              </div>
            )
          )}
        </FilterGroup>

        <FilterGroup label="Tag / Concept">
          {groupedTags.map(({ topic, tags: topicTags }) =>
            topicTags.length === 0 ? null : (
              <div key={topic.id} className="mb-2">
                <p className="mb-1 text-xs font-medium text-zinc-400">{topic.label}</p>
                {topicTags.map((tag) => (
                  <CheckboxRow
                    key={tag.id}
                    label={tag.label}
                    checked={tags.includes(tag.id)}
                    onChange={() => pushParams({ tag: toggle(tags, tag.id) })}
                  />
                ))}
              </div>
            )
          )}
        </FilterGroup>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500" htmlFor="language-filter">
            Language
          </label>
          <select
            id="language-filter"
            value={language}
            onChange={(e) => pushParams({ language: e.target.value })}
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Any language</option>
            {taxonomy.languages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500" htmlFor="difficulty-filter">
            Difficulty
          </label>
          <select
            id="difficulty-filter"
            value={difficulty}
            onChange={(e) => pushParams({ difficulty: e.target.value })}
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">Any difficulty</option>
            {taxonomy.difficulties.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="font-mono text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          clear all filters
        </button>
      )}
    </div>
  );
}

function FilterGroup({ label, children, defaultOpen = false }) {
  return (
    <details className="min-w-[10rem] rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800" open={defaultOpen}>
      <summary className="cursor-pointer select-none font-mono text-xs text-zinc-500">{label}</summary>
      <div className="mt-2 max-h-56 overflow-y-auto pr-1">{children}</div>
    </details>
  );
}

function CheckboxRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 py-0.5 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="accent-teal-600" />
      {label}
    </label>
  );
}
