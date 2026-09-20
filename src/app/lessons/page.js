import SearchPage from "@/components/search/SearchPage";

export default async function LessonsPage({ searchParams }) {
  const params = await searchParams;
  return <SearchPage searchParams={params} defaultType="lesson" />;
}