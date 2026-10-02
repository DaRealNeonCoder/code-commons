import { Suspense } from "react";
import { searchContent } from "@/lib/content";
import {
  loadTaxonomy,
  toClientTaxonomy,
  groupTopicsByArea,
  groupTagsByTopic,
} from "@/lib/taxonomy";
import SearchFilterBar from "./SearchFilterBar";
import ResultCard from "./ResultCard";

function parseList(value) {
  return value ? value.split(",").filter(Boolean) : [];
}

export default function SearchPage({ searchParams }) {
  const taxonomy = loadTaxonomy();

  const query = searchParams?.q || "";
  // Unfiltered browsing shows everything searchable, not just the original
  // two content types.
  const types = searchParams?.type
    ? parseList(searchParams.type)
    : ["course", "lesson", "puzzle", "shader", "circuit"];
  const areas = parseList(searchParams?.area);
  const topics = parseList(searchParams?.topic);
  const tags = parseList(searchParams?.tag);
  const language = searchParams?.language || "";
  const difficulty = searchParams?.difficulty || "";

  const results = searchContent({
    query,
    types,
    areas,
    topics,
    tags,
    languages: language ? [language] : [],
    difficulty: difficulty ? [difficulty] : [],
  });

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-sm text-amber-600 dark:text-amber-400">
          /browse
        </p>

        <h1 className="mt-1 text-2xl font-semibold">Browse</h1>

        <Suspense fallback={null}>
          <SearchFilterBar
            taxonomy={toClientTaxonomy(taxonomy)}
            groupedTopics={groupTopicsByArea(taxonomy)}
            groupedTags={groupTagsByTopic(taxonomy)}
          />
        </Suspense>

        <div className="mt-8 space-y-3">
          <p className="font-mono text-xs text-zinc-400">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>

          {results.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No results match your filters.
            </p>
          ) : (
            results.map((item) => (
              <ResultCard
                key={`${item.type}:${item.id}`}
                item={item}
                taxonomy={taxonomy}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}