import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProject } from "@/lib/creatorProjects";
import LessonCreator from "@/components/creator/LessonCreator";
import PuzzleCreator from "@/components/creator/PuzzleCreator";
import ShaderCreator from "@/components/creator/ShaderCreator";
import CircuitCreator from "@/components/creator/CircuitCreator";
import CodingProjectCreator from "@/components/creator/CodingProjectCreator";

const EDITORS = {
  lesson: LessonCreator,
  puzzle: PuzzleCreator,
  shader: ShaderCreator,
  circuit: CircuitCreator,
  project: CodingProjectCreator,
};

export default async function ProjectEditorPage({ params }) {
  const { type, id } = await params;

  const project = getProject(id);
  if (!project || project.type !== type || !EDITORS[type]) notFound();

  // WIP projects are public for now: anyone with the link can open one, but only the
  // owner can edit (the API enforces this too).
  const session = await auth.api.getSession({ headers: await headers() });
  const canEdit = session?.user?.id === project.userId;

  const Editor = EDITORS[type];
  return (
    <Editor
      key={project.id}
      project={{ id: project.id, title: project.title, data: project.data, canEdit }}
    />
  );
}