import { loadTaxonomy } from "@/lib/taxonomy";

export async function GET() {
  return Response.json(loadTaxonomy());
}