"use server";

import MdxBody from "@/components/mdx/MdxBody";
import { buildReactDemoDataMarkup } from "@/lib/reactDemo";
import { validateReactDemos } from "@/lib/reactDemoServer";

// Renders lesson markdown on the server with the same MdxBody the published
// shader/circuit pages use, so the creator preview matches what readers see.
// (MdxBody wraps next-mdx-remote/rsc, which can't run in a client component.)
//
// Server actions are public HTTP endpoints, and this compiles text the caller
// supplies. Before shipping, add the same signed-in check your
// /api/creator-projects routes use, e.g.:
//
//   const user = await getCurrentUser();
//   if (!user) throw new Error("Not signed in.");

const MAX_LENGTH = 200_000;

export async function renderMdxPreview(source, reactDemos = []) {
  if (typeof source !== "string" || !source.trim()) return null;
  const validatedDemos = await validateReactDemos(reactDemos);
  if (!validatedDemos.ok) throw new Error(validatedDemos.error);
  const text = source.slice(0, MAX_LENGTH);
  return <MdxBody source={`${text}${buildReactDemoDataMarkup(validatedDemos.artifacts)}`} />;
}
