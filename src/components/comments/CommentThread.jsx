"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RatingButtons from "@/components/rating/RatingButtons";
import UserAvatar from "@/components/UserAvatar";

const LIGHT = {
  border: "border-zinc-200 dark:border-zinc-800",
  panel: "bg-white dark:bg-zinc-950",
  muted: "text-zinc-500 dark:text-zinc-400",
  text: "text-zinc-800 dark:text-zinc-200",
  input: "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900",
  accent: "text-teal-600 dark:text-teal-400",
  reply: "text-violet-600 dark:text-violet-400",
};
const DARK = {
  border: "border-zinc-800",
  panel: "bg-zinc-950",
  muted: "text-zinc-500",
  text: "text-zinc-200",
  input: "border-zinc-700 bg-zinc-900",
  accent: "text-fuchsia-400",
  reply: "text-amber-400",
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

function SubscriptionButton({ itemType, itemId, signedIn, colors }) {
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (signedIn) {
      fetch(`/api/subscriptions?itemType=${encodeURIComponent(itemType)}&itemId=${encodeURIComponent(itemId)}`)
        .then((response) => response.json())
        .then((data) => setSubscribed(Boolean(data.subscribed)))
        .catch(() => {});
    }
  }, [itemId, itemType, signedIn]);

  async function toggle() {
    if (!signedIn || busy) return;
    setBusy(true);
    const next = !subscribed;
    const response = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, itemId, subscribed: next }),
    });
    if (response.ok) setSubscribed(next);
    setBusy(false);
  }

  return (
    <button type="button" disabled={!signedIn || busy} onClick={toggle} className={`font-mono text-xs ${colors.accent} hover:underline disabled:opacity-40`}>
      {subscribed ? "following discussion" : "follow discussion"}
    </button>
  );
}

function CommentItem({ comment, children, depth, itemType, itemId, signedIn, currentUserId, tone, onCreated, onUpdated, onDeleted }) {
  const colors = tone === "dark" ? DARK : LIGHT;
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [busy, setBusy] = useState(false);
  const hasReplies = children.length > 0;
  const isAuthor = currentUserId && comment.author.id === currentUserId;

  async function edit() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    const response = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "edit", commentId: comment.id, body: text }) });
    const data = await response.json().catch(() => null);
    if (response.ok) { onUpdated(data.comment); setEditing(false); }
    setBusy(false);
  }

  async function remove() {
    if (busy || !window.confirm("Delete this comment?")) return;
    setBusy(true);
    const response = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", commentId: comment.id }) });
    if (response.ok) onDeleted(comment.id);
    setBusy(false);
  }

  async function report() {
    if (!signedIn) return;
    const reason = window.prompt("Why are you reporting this comment?", "spam");
    if (!reason) return;
    await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "report", commentId: comment.id, reason }) });
  }

  return (
    <div className="mt-3" style={{ marginLeft: `${Math.min(depth, 8) * 16}px` }}>
      <details open className={`rounded border ${colors.border} ${colors.panel}`}>
        <summary className={`cursor-pointer select-none px-3 py-2 text-sm ${colors.text}`}>
          <UserAvatar image={comment.author.image} name={comment.author.name} size="xs" scale={comment.author.scale} positionX={comment.author.positionX} positionY={comment.author.positionY} className="mr-2 align-middle" />
          <span className="font-medium">{comment.author.name}</span>
          <span className={`ml-2 font-mono text-xs ${colors.muted}`}>{formatDate(comment.createdAt)}</span>
          {comment.editedAt && <span className={`ml-2 font-mono text-xs ${colors.muted}`}>(edited)</span>}
        </summary>

        <div className={`border-t px-3 pb-3 pt-3 ${colors.border}`}>
          {editing ? <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={4} className={`w-full rounded border px-3 py-2 text-sm ${colors.input} ${colors.text}`} /> : <p className={`whitespace-pre-wrap text-sm leading-6 ${colors.text} ${comment.status === "pending" ? "opacity-60" : ""}`}>{comment.body}</p>}
          {comment.status === "pending" && <p className={`mt-2 text-xs ${colors.muted}`}>awaiting moderation</p>}
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
            {isAuthor && comment.status === "visible" && (editing ? <><button type="button" disabled={busy} onClick={edit} className={`font-mono text-xs ${colors.accent} hover:underline disabled:opacity-40`}>save</button><button type="button" onClick={() => { setBody(comment.body); setEditing(false); }} className={`font-mono text-xs ${colors.muted} hover:underline`}>cancel</button></> : <><button type="button" onClick={() => setEditing(true)} className={`font-mono text-xs ${colors.accent} hover:underline`}>edit</button><button type="button" onClick={remove} className="font-mono text-xs text-red-500 hover:underline">delete</button></>)}
            {signedIn && !isAuthor && comment.status === "visible" && <button type="button" onClick={report} className={`font-mono text-xs ${colors.muted} hover:underline`}>report</button>}
            <button
              type="button"
              onClick={() => setReplying((open) => !open)}
               className={`font-mono text-xs ${colors.reply} hover:underline`}
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

export default function CommentThread({ itemType, itemId, initialComments = [], signedIn, currentUserId, canModerate = false, tone = "auto" }) {
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

  function updateComment(comment) {
    setComments((current) => current.map((item) => (item.id === comment.id ? comment : item)));
  }

  function removeComment(commentId) {
    setComments((current) => current.map((item) => (item.id === commentId ? { ...item, body: "[deleted]", status: "deleted" } : item)));
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
        currentUserId={currentUserId}
        tone={tone}
        onCreated={addComment}
        onUpdated={updateComment}
        onDeleted={removeComment}
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
          <div className="flex items-center justify-between gap-3">
            <CommentForm itemType={itemType} itemId={itemId} signedIn={signedIn} tone={tone} onCreated={addComment} />
            <div className="flex shrink-0 flex-col items-end gap-1">
              <SubscriptionButton itemType={itemType} itemId={itemId} signedIn={signedIn} colors={colors} />
              {canModerate && <Link href={`/moderation?itemType=${encodeURIComponent(itemType)}&itemId=${encodeURIComponent(itemId)}`} className={`font-mono text-xs ${colors.muted} hover:underline`}>moderate comments</Link>}
            </div>
          </div>
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
