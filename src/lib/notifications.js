import { and, arrayContains, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { comments as commentsUser, contentSubscriptions, courses, lessons, notifications, user } from "./db/schema";

const unique = (ids) => [...new Set(ids.filter(Boolean))];

export async function createNotification({ recipientId, actorId = null, type, entityType = null, entityId = null, title, body = "", href = null }) {
  if (!recipientId || recipientId === actorId) return;
  await db.insert(notifications).values({ recipientId, actorId, type, entityType, entityId, title, body, href });
}

async function subscriberIds(itemType, itemId, event) {
  const rows = await db
    .select({ userId: contentSubscriptions.userId })
    .from(contentSubscriptions)
    .where(
      and(
        eq(contentSubscriptions.itemType, itemType),
        eq(contentSubscriptions.itemId, itemId),
        sql`${contentSubscriptions.events} @> ARRAY[${event}]::text[]`
      )
    );
  return rows.map((row) => row.userId);
}

export async function notifyCommentCreated(comment) {
  const recipients = [];
  if (comment.parentId) {
    const parent = await getCommentAuthor(comment.parentId);
    if (parent) {
      recipients.push({ userId: parent.userId, type: "reply", title: `${comment.author.name} replied to your comment`, body: comment.body, href: commentHref(comment) });
    }
  }

  const mentionedNames = unique([...comment.body.matchAll(/@([a-zA-Z0-9_]{1,50})/g)].map((match) => match[1].toLowerCase()));
  if (mentionedNames.length) {
    const mentioned = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(sql`lower(${user.name}) in (${sql.join(mentionedNames.map((name) => sql`${name}`), sql`, `)})`);
    for (const target of mentioned) {
      recipients.push({ userId: target.id, type: "mention", title: `${comment.author.name} mentioned you`, body: comment.body, href: commentHref(comment) });
    }
  }

  const subscribers = await subscriberIds(comment.itemType, comment.itemId, "reply");
  for (const userId of subscribers) {
    recipients.push({ userId, type: "reply", title: "New activity in a discussion you follow", body: comment.body, href: commentHref(comment) });
  }

  for (const recipient of recipients) {
    await createNotification({ recipientId: recipient.userId, actorId: comment.author.id, type: recipient.type, entityType: "comment", entityId: comment.id, title: recipient.title, body: recipient.body, href: recipient.href });
  }
}

async function getCommentAuthor(commentId) {
  const rows = await db
    .select({ userId: commentsUser.userId, name: user.name })
    .from(commentsUser)
    .innerJoin(user, eq(commentsUser.userId, user.id))
    .where(eq(commentsUser.id, commentId))
    .limit(1);
  return rows[0] || null;
}

function commentHref(comment) {
  const base = comment.itemType === "project" ? "/projects" : `/${comment.itemType}s`;
  return `${base}/${comment.itemId}#comment-${comment.id}`;
}

export async function notifyPublished({ actorId, itemType, itemId, title }) {
  const recipients = await subscriberIds(itemType, itemId, "published");
  for (const recipientId of recipients) {
    await createNotification({
      recipientId,
      actorId,
      type: "published",
      entityType: itemType,
      entityId: itemId,
      title: `${title} was updated`,
      body: "A published item you follow has new content.",
      href: `/${itemType === "project" ? "projects" : `${itemType}s`}/${itemId}`,
    });
  }
}

async function courseIdsForActivity(itemType, itemId) {
  const courseRows = await db.select({ id: courses.slug, lessonIds: courses.lessonIds }).from(courses);
  if (itemType === "lesson") return courseRows.filter((course) => course.lessonIds.includes(itemId)).map((course) => course.id);
  if (itemType !== "puzzle") return [];

  const lessonRows = await db.select({ slug: lessons.slug, puzzles: lessons.puzzles }).from(lessons).where(arrayContains(lessons.puzzles, [itemId]));
  const lessonIds = new Set(lessonRows.map((lesson) => lesson.slug));
  return courseRows.filter((course) => course.lessonIds.some((lessonId) => lessonIds.has(lessonId))).map((course) => course.id);
}

export async function notifyCourseActivity({ actorId, itemType, itemId }) {
  const ids = await courseIdsForActivity(itemType, itemId);
  for (const courseId of ids) {
    const recipients = await subscriberIds("course", courseId, "course_activity");
    for (const recipientId of recipients) {
      await createNotification({
        recipientId,
        actorId,
        type: "course_activity",
        entityType: "course",
        entityId: courseId,
        title: "New course activity",
        body: "Someone made progress in a course you follow.",
        href: `/courses/${courseId}`,
      });
    }
  }
}

export async function listNotifications(userId, { unreadOnly = false, limit = 50 } = {}) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), unreadOnly ? isNull(notifications.readAt) : undefined))
    .orderBy(desc(notifications.createdAt))
    .limit(Math.min(limit, 100));
}

export async function unreadNotificationCount(userId) {
  const rows = await db
    .select({ count: sql`count(*)`.mapWith(Number) })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
  return rows[0]?.count || 0;
}

export async function markNotificationsRead(userId, ids = []) {
  const condition = ids.length ? inArray(notifications.id, ids) : isNull(notifications.readAt);
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.recipientId, userId), condition));
}

export async function setSubscription({ userId, itemType, itemId, subscribed, events }) {
  if (!subscribed) {
    await db.delete(contentSubscriptions).where(and(eq(contentSubscriptions.userId, userId), eq(contentSubscriptions.itemType, itemType), eq(contentSubscriptions.itemId, itemId)));
    return false;
  }
  await db
    .insert(contentSubscriptions)
    .values({ userId, itemType, itemId, events: events?.length ? events : ["reply", "mention", "published", "course_activity"] })
    .onConflictDoUpdate({ target: [contentSubscriptions.userId, contentSubscriptions.itemType, contentSubscriptions.itemId], set: { events: events?.length ? events : ["reply", "mention", "published", "course_activity"] } });
  return true;
}

export async function isSubscribed({ userId, itemType, itemId }) {
  const rows = await db.select({ userId: contentSubscriptions.userId }).from(contentSubscriptions).where(and(eq(contentSubscriptions.userId, userId), eq(contentSubscriptions.itemType, itemType), eq(contentSubscriptions.itemId, itemId))).limit(1);
  return rows.length > 0;
}
