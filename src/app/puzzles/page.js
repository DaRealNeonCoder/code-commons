import SearchPage from "@/components/search/SearchPage";

export default async function PuzzlesPage({ searchParams }) {
  const params = await searchParams;
  return <SearchPage searchParams={params} defaultType="puzzle" />;
}