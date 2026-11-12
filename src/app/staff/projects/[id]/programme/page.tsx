import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectProgramme } from "@/components/architect/programme";
import { projects, type ProjectId } from "@/lib/firm-data";

// The programme tab of a project record: a row per milestone and the cost revisions. Every
// staff role reads it; the Project Head and admin act on it.

export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}

export default function ProgrammePage({ params }: PageProps<"/staff/projects/[id]/programme">) {
  return (
    <Suspense>
      <ProgrammeFromParams params={params} />
    </Suspense>
  );
}

async function ProgrammeFromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();
  return <ProjectProgramme id={project.id as ProjectId} />;
}
