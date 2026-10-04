import Link from "next/link";
import { Suspense } from "react";
import { searchContent } from "@/lib/content";
import { getUserVotes } from "@/lib/ratings";
import { getCurrentUserId } from "@/lib/session";
import {
  loadTaxonomy,
  toClientTaxonomy,
  groupTopicsByArea,
  groupTagsByTopic,
} from "@/lib/taxonomy";
import SearchFilterBar from "@/components/search/SearchFilterBar";
import ResultCard from "@/components/search/ResultCard";

// Results shown at first, and how many more each "show more" adds.
const PAGE_SIZE = 12;
const MAX_LIMIT = 500;

const ALL_TYPES = ["course", "lesson", "puzzle", "shader", "circuit", "project"];

const TABS = [
  { id: "all", label: "All" },
  { id: "course", label: "Courses" },
  { id: "lesson", label: "Lessons" },
  { id: "puzzle", label: "Puzzles" },
  { id: "project", label: "Projects" },
  { id: "shader", label: "Shaders" },
  { id: "circuit", label: "Circuits" },
];

function parseList(value) {
  return value ? value.split(",").filter(Boolean) : [];
}

// Current query string with some keys replaced. An empty value removes the key.
function hrefWith(params, patch) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) sp.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) sp.set(key, value);
    else sp.delete(key);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "?";
}

const pill = (active) =>
  `rounded border px-3 py-1 font-mono text-xs transition-colors ${
    active
      ? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-400"
      : "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
  }`;

export default async function SearchPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const taxonomy = loadTaxonomy();

  const query = sp.q || "";
  const typeParam = parseList(sp.type);
  // Unfiltered browsing shows everything searchable.
  const types = typeParam.length ? typeParam : ALL_TYPES;
  const areas = parseList(sp.area);
  const topics = parseList(sp.topic);
  const tags = parseList(sp.tag);
  const language = sp.language || "";
  const difficulty = sp.difficulty || "";
  const sort = sp.sort === "rating" ? "rating" : "relevance";
  const limit = Math.min(Math.max(parseInt(sp.limit, 10) || PAGE_SIZE, PAGE_SIZE), MAX_LIMIT);

  const activeTab = typeParam.length === 0 ? "all" : typeParam.length === 1 ? typeParam[0] : null;

  const results = await searchContent({
  query,
  types,
  areas,
  topics,
  tags,
  languages: language ? [language] : [],
  difficulty: difficulty ? [difficulty] : [],
  sort,
});

  const visible = results.slice(0, limit);
  const hasMore = results.length > visible.length;

  const userId = await getCurrentUserId();
  const userVotes = await getUserVotes(userId);

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-sm text-amber-600 dark:text-amber-400">/browse</p>

        <h1 className="mt-1 text-2xl font-semibold">Browse</h1>

        <nav aria-label="Content type" className="mt-5 flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={hrefWith(sp, { type: tab.id === "all" ? "" : tab.id, limit: "" })}
              aria-current={tab.id === activeTab ? "page" : undefined}
              className={pill(tab.id === activeTab)}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <Suspense fallback={null}>
          <SearchFilterBar
            taxonomy={toClientTaxonomy(taxonomy)}
            groupedTopics={groupTopicsByArea(taxonomy)}
            groupedTags={groupTagsByTopic(taxonomy)}
            showTypeFilter={false}
          />
        </Suspense>

        <div className="mt-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs text-zinc-400">
              {hasMore
                ? `showing ${visible.length} of ${results.length} results`
                : `${results.length} result${results.length === 1 ? "" : "s"}`}
            </p>

            {query ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs text-zinc-400">sort</span>
                <Link href={hrefWith(sp, { sort: "", limit: "" })} className={pill(sort === "relevance")}>
                  best match
                </Link>
                <Link href={hrefWith(sp, { sort: "rating", limit: "" })} className={pill(sort === "rating")}>
                  top rated
                </Link>
              </div>
            ) : (
              <span className="font-mono text-xs text-zinc-400">sorted by rating</span>
            )}
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-zinc-500">No results match your filters.</p>
          ) : (
            visible.map((item) => (
              <ResultCard
                key={`${item.type}:${item.id}`}
                item={item}
                taxonomy={taxonomy}
                userVote={userVotes.get(`${item.type}:${item.id}`) ?? 0}
                signedIn={Boolean(userId)}
              />
            ))
          )}

          {hasMore && (
            <div className="pt-2 text-center">
              <Link
                href={hrefWith(sp, { limit: String(limit + PAGE_SIZE) })}
                scroll={false}
                className={pill(false)}
              >
                show {Math.min(PAGE_SIZE, results.length - visible.length)} more
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}