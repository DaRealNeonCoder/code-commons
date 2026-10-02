"use server";

import MdxBody from "@/components/mdx/MdxBody";

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

export async function renderMdxPreview(source) {
  if (typeof source !== "string" || !source.trim()) return null;
  return <MdxBody source={source.slice(0, MAX_LENGTH)} />;
}