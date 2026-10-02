"use client";

import { Component, useEffect, useState } from "react";
import { renderMdxPreview } from "@/lib/renderMdxPreview";

const DEBOUNCE_MS = 250;
const CACHE_LIMIT = 4;

// The workspace is remounted each time you switch back to it. Remembering the
// last few renders means an unchanged lesson appears instantly instead of
// flashing "rendering..." every time.
const cache = new Map(); // markdown source -> rendered element

function remember(source, node) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(source, node);
}

const BROKEN_MESSAGE =
  "This lesson can't be rendered yet. Check the markdown for unclosed tags or stray { } characters.";

// Invalid MDX throws while the server-rendered element is being drawn, not
// inside the action, so it has to be caught here or it would take down the
// whole creator. It clears itself as soon as the source changes.
class PreviewBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prevProps) {
    if (this.state.failed && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) return <p className="text-sm text-red-500">{BROKEN_MESSAGE}</p>;
    return this.props.children;
  }
}

export default function LessonPreview({ source }) {
  const text = source ?? "";
  const [node, setNode] = useState(() => cache.get(text) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!text.trim()) {
      setNode(null);
      setFailed(false);
      return;
    }

    if (cache.has(text)) {
      setNode(cache.get(text));
      setFailed(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const next = await renderMdxPreview(text);
        if (cancelled) return;
        remember(text, next);
        setNode(next);
        setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text]);

  if (!text.trim()) {
    return <p className="text-sm text-zinc-500">Nothing to preview yet. Add text in the markdown tab.</p>;
  }
  if (failed) return <p className="text-sm text-red-500">Couldn&apos;t render the preview. Try again.</p>;
  if (!node) return <p className="text-sm text-zinc-500">Rendering preview...</p>;

  return <PreviewBoundary resetKey={text}>{node}</PreviewBoundary>;
}