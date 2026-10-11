"use client";

import { useMemo, useState } from "react";
import RatingButtons from "@/components/rating/RatingButtons";

const LIGHT = {
  border: "border-zinc-200 dark:border-zinc-800",
  panel: "bg-white dark:bg-zinc-950",
  muted: "text-zinc-500 dark:text-zinc-400",
  text: "text-zinc-800 dark:text-zinc-200",
  input: "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900",
  accent: "text-teal-600 dark:text-teal-400",
};
const DARK = {
  border: "border-zinc-800",
  panel: "bg-zinc-950",
  muted: "text-zinc-500",
  text: "text-zinc-200",
  input: "border-zinc-700 bg-zinc-900",
  accent: "text-fuchsia-400",
};

function formatDate(value) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function CommentForm({ itemType, itemId, parentId = null, signedIn, tone, onCreated, onCancel }) {
  const colors = tone === "dark" ? DARK : LIGHT;
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (!signedIn) {
      setError("Sign in to comment");
      return;
    }
    const text = body.trim();
    if (!text || busy) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId, parentId, body: text }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.comment) throw new Error(data?.error || "Could not save comment");
      setBody("");
      onCreated(data.comment);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`mt-3 rounded border p-3 ${colors.border} ${colors.panel}`}>
      <label className={`block font-mono text-xs ${colors.muted}`} htmlFor={parentId ? `reply-${parentId}` : "new-comment"}>
        {parentId ? "reply" : "add a comment"}
      </label>
      <textarea
        id={parentId ? `reply-${parentId}` : "new-comment"}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={parentId ? 3 : 4}
        maxLength={5000}
        placeholder={signedIn ? "Share your thoughts..." : "Sign in to join the discussion."}
        disabled={!signedIn || busy}
        className={`mt-2 w-full rounded border px-3 py-2 text-sm outline-none focus:border-teal-500 ${colors.input} ${colors.text}`}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!signedIn || busy || !body.trim()}
          className={`rounded border px-3 py-1.5 font-mono text-xs transition-colors disabled:opacity-40 ${colors.border} ${colors.accent}`}
        >
          {busy ? "posting..." : parentId ? "post reply" : "post comment"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={`font-mono text-xs ${colors.muted} hover:underline`}>
            cancel
          </button>
        )}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </form>
  );
}

function CommentItem({ comment, children, depth, itemType, itemId, signedIn, tone, onCreated }) {
  const colors = tone === "dark" ? DARK : LIGHT;
  const [replying, setReplying] = useState(false);
  const hasReplies = children.length > 0;

  return (
    <div className="mt-3" style={{ marginLeft: `${Math.min(depth, 8) * 16}px` }}>
      <details open className={`rounded border ${colors.border} ${colors.panel}`}>
        <summary className={`cursor-pointer select-none px-3 py-2 text-sm ${colors.text}`}>
          <span className="font-medium">{comment.author.name}</span>
          <span className={`ml-2 font-mono text-xs ${colors.muted}`}>{formatDate(comment.createdAt)}</span>
        </summary>

        <div className={`border-t px-3 pb-3 pt-3 ${colors.border}`}>
          <p className={`whitespace-pre-wrap text-sm leading-6 ${colors.text}`}>{comment.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <RatingButtons
              itemType="comment"
              itemId={comment.id}
              initial={{ likes: comment.likes, dislikes: comment.dislikes, userVote: comment.userVote }}
              signedIn={signedIn}
              size="sm"
              tone={tone === "dark" ? "dark" : "auto"}
              endpoint="/api/comments"
              votePayload={{ action: "vote", commentId: comment.id }}
            />
            <button
              type="button"
              onClick={() => setReplying((open) => !open)}
              className={`font-mono text-xs ${colors.accent} hover:underline`}
            >
              {replying ? "close reply" : "reply"}
            </button>
          </div>

          {replying && (
            <CommentForm
              itemType={itemType}
              itemId={itemId}
              parentId={comment.id}
              signedIn={signedIn}
              tone={tone}
              onCreated={(created) => {
                onCreated(created);
                setReplying(false);
              }}
              onCancel={() => setReplying(false)}
            />
          )}

          {hasReplies && (
            <details open className={`mt-3 border-l-2 pl-3 ${colors.border}`}>
              <summary className={`cursor-pointer select-none font-mono text-xs ${colors.muted}`}>
                {children.length} {children.length === 1 ? "reply" : "replies"}
              </summary>
              <div className="pt-1">{children}</div>
            </details>
          )}
        </div>
      </details>
    </div>
  );
}

export default function CommentThread({ itemType, itemId, initialComments = [], signedIn, tone = "auto" }) {
  const colors = tone === "dark" ? DARK : LIGHT;
  const [comments, setComments] = useState(initialComments);

  const childrenByParent = useMemo(() => {
    const map = new Map();
    for (const comment of comments) {
      const key = comment.parentId || "root";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(comment);
    }
    return map;
  }, [comments]);

  function addComment(comment) {
    setComments((current) => [...current, comment]);
  }

  function renderComments(parentId = null, depth = 0) {
    return (childrenByParent.get(parentId || "root") || []).map((comment) => (
      <CommentItem
        key={comment.id}
        comment={comment}
        depth={depth}
        itemType={itemType}
        itemId={itemId}
        signedIn={signedIn}
        tone={tone}
        onCreated={addComment}
      >
        {renderComments(comment.id, depth + 1)}
      </CommentItem>
    ));
  }

  return (
    <section className={`mt-10 border-t pt-6 ${colors.border}`} aria-label="Comments">
      <details open>
        <summary className={`cursor-pointer select-none font-mono text-sm ${colors.text}`}>
          comments <span className={`ml-1 text-xs ${colors.muted}`}>({comments.length})</span>
        </summary>
        <div className="pt-3">
          <CommentForm itemType={itemType} itemId={itemId} signedIn={signedIn} tone={tone} onCreated={addComment} />
          {comments.length === 0 ? (
            <p className={`mt-5 text-sm ${colors.muted}`}>No comments yet. Start the discussion.</p>
          ) : (
            <div className="mt-4">{renderComments()}</div>
          )}
        </div>
      </details>
    </section>
  );
}
