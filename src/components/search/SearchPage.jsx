import { Suspense } from "react";
import Link from "next/link";
import { searchContent } from "@/lib/content";
import { loadTaxonomy, toClientTaxonomy, groupTopicsByArea, groupTagsByTopic } from "@/lib/taxonomy";
import { getAllCourses } from "@/lib/courses";
import SearchFilterBar from "./SearchFilterBar";
import ResultCard from "./ResultCard";

function parseList(value) {
  return value ? value.split(",").filter(Boolean) : [];
}

const HEADINGS = {
  lesson: { path: "/lessons", title: "Lessons", accent: "text-amber-600 dark:text-amber-400" },
  puzzle: { path: "/puzzles", title: "Puzzles", accent: "text-teal-600 dark:text-teal-400" },
};

export default function SearchPage({ searchParams, defaultType }) {
  const taxonomy = loadTaxonomy();
  const heading = HEADINGS[defaultType];

  const query = searchParams?.q || "";
  const types = searchParams?.type ? parseList(searchParams.type) : [defaultType];
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

  const isBrowsingUnfiltered =
    defaultType === "lesson" &&
    !query &&
    areas.length === 0 &&
    topics.length === 0 &&
    tags.length === 0 &&
    !language &&
    !difficulty;
  const courses = isBrowsingUnfiltered ? getAllCourses() : [];

  return (
    <div className="w-full h-full overflow-y-auto px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <p className={`font-mono text-sm ${heading.accent}`}>{heading.path}</p>
        <h1 className="mt-1 text-2xl font-semibold">{heading.title}</h1>

        <Suspense fallback={null}>
          <SearchFilterBar
            taxonomy={toClientTaxonomy(taxonomy)}
            groupedTopics={groupTopicsByArea(taxonomy)}
            groupedTags={groupTagsByTopic(taxonomy)}
          />
        </Suspense>

        {courses.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-mono text-sm text-zinc-500">browse by course</h2>
            <div className="flex flex-wrap gap-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="rounded-md border border-zinc-200 px-4 py-2.5 text-sm transition-colors hover:border-amber-400 hover:text-amber-600 dark:border-zinc-800 dark:hover:text-amber-400"
                >
                  {course.title}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 space-y-3">
          <p className="font-mono text-xs text-zinc-400">
            {results.length} result{results.length === 1 ? "" : "s"}
          </p>
          {results.length === 0 ? (
            <p className="text-sm text-zinc-500">No results match your filters.</p>
          ) : (
            results.map((item) => <ResultCard key={`${item.type}:${item.id}`} item={item} taxonomy={taxonomy} />)
          )}
        </div>
      </div>
    </div>
  );
}
