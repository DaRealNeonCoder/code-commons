import LessonCreator from "@/components/creator/LessonCreator";
import { loadTaxonomy, toClientTaxonomy, groupTopicsByArea, groupTagsByTopic } from "@/lib/taxonomy";

export default function CreatePage() {
  const taxonomy = loadTaxonomy();

  return (
    <LessonCreator
      taxonomy={toClientTaxonomy(taxonomy)}
      groupedTopics={groupTopicsByArea(taxonomy)}
      groupedTags={groupTagsByTopic(taxonomy)}
    />
  );
}