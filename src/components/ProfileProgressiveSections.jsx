"use client";

import Link from "next/link";
import { useState } from "react";

const INITIAL_COUNT = 6;
const PAGE_SIZE = 6;

function ShowMore({ shown, total, onClick }) {
  if (shown >= total) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 rounded border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
    >
      show more ({total - shown} remaining)
    </button>
  );
}

export function ProfileProgressiveSections({ topics, recommendations }) {
  const [topicCount, setTopicCount] = useState(INITIAL_COUNT);
  const [recommendationCount, setRecommendationCount] = useState(INITIAL_COUNT);
  const sortedTopics = topics.slice().sort((a, b) => b.total - a.total || a.percent - b.percent);
  const visibleTopics = sortedTopics.slice(0, topicCount);
  const visibleRecommendations = recommendations.slice(0, recommendationCount);

  return (
    <section className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="self-start rounded-lg border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-wide text-violet-400">skill map</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Topic confidence</h2>
        <div className="mt-5 space-y-4">
          {visibleTopics.map((topic) => (
            <div key={topic.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-200">{topic.label}</span>
                <span className="font-mono text-xs text-zinc-500">{topic.solved}/{topic.total}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-violet-400 transition-[width]" style={{ width: `${topic.percent}%` }} />
              </div>
            </div>
          ))}
          {visibleTopics.length === 0 && <p className="text-sm text-zinc-500">Complete a puzzle to start building your map.</p>}
        </div>
        <ShowMore shown={visibleTopics.length} total={sortedTopics.length} onClick={() => setTopicCount((count) => count + PAGE_SIZE)} />
      </div>

      <div className="self-start rounded-lg border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
        <p className="font-mono text-xs uppercase tracking-wide text-amber-400">next up</p>
        <h2 className="mt-1 text-xl font-semibold text-white">Recommended for you</h2>
        <div className="mt-4 space-y-2">
          {visibleRecommendations.length ? visibleRecommendations.map((item) => (
            <Link key={`${item.type}:${item.id}`} href={item.href} className="block rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 transition-colors hover:border-amber-500/60 hover:bg-zinc-900">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-zinc-100">{item.title}</span>
                <span className="shrink-0 font-mono text-[10px] uppercase text-zinc-500">{item.type}</span>
              </div>
              {item.topic && <p className="mt-1 font-mono text-[11px] text-amber-400">practice {item.topic}</p>}
            </Link>
          )) : <p className="text-sm text-zinc-500">You have explored everything currently available. Check back for more.</p>}
        </div>
        <ShowMore shown={visibleRecommendations.length} total={recommendations.length} onClick={() => setRecommendationCount((count) => count + PAGE_SIZE)} />
      </div>
    </section>
  );
}

export function PublicProfileContent({ content }) {
  const [count, setCount] = useState(INITIAL_COUNT);
  const visible = content.slice(0, count);
  return (
    <section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <h2 className="font-mono text-sm text-zinc-100">Published work</h2>
        <span className="font-mono text-xs text-zinc-500">{content.length} item{content.length === 1 ? "" : "s"}</span>
      </div>
      {content.length === 0 ? <p className="border-t border-zinc-800 px-4 py-4 text-sm text-zinc-500">No published work yet.</p> : (
        <>
          <ul className="divide-y divide-zinc-800 border-t border-zinc-800">
            {visible.map((item) => (
              <li key={`${item.type}:${item.id}`}>
                <Link href={item.href} className="block px-4 py-3 transition-colors hover:bg-zinc-800/50">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm text-zinc-100">{item.title}</span>
                    <span className="shrink-0 font-mono text-[10px] uppercase text-zinc-500">{item.type}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 font-mono text-[11px] text-zinc-500">
                    <span>{item.rating.likes} like{item.rating.likes === 1 ? "" : "s"}</span>
                    {item.rating.total > 0 && <span>{item.rating.likeRate}% liked</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4">
            <ShowMore shown={visible.length} total={content.length} onClick={() => setCount((value) => value + PAGE_SIZE)} />
          </div>
        </>
      )}
    </section>
  );
}
