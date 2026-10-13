// Server-only moderation configuration.
// Put the site owner's sign-in email in OWNER_EMAIL and the initial
// moderator email(s) in MODERATOR_EMAILS before deploying.
export const OWNER_EMAIL = "";
export const MODERATOR_EMAILS = [];

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function getConfiguredRole(email, ownerEmail = OWNER_EMAIL, moderatorEmails = MODERATOR_EMAILS) {
  const normalized = normalizeEmail(email);
  if (normalized && normalizeEmail(ownerEmail) === normalized) return "owner";
  if (normalized && moderatorEmails.some((candidate) => normalizeEmail(candidate) === normalized)) return "moderator";
  return null;
}
