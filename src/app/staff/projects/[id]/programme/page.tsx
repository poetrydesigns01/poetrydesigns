import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectProgramme } from "@/components/architect/programme";
import { ProjectPlanTab } from "@/components/project/plan";
import { projects, type ProjectId } from "@/lib/firm-data";

// The programme tab of a project record: the week chart and every plan task by stage, then
// the payment stages and the cost revisions. Every staff role reads it; the Project Head and
// admin act on it, and the admin generates the plan and gives tasks to people.

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
  const projectId = project.id as ProjectId;
  return (
    <>
      <ProjectPlanTab projectId={projectId} />
      <ProjectProgramme id={projectId} />
    </>
  );
}
