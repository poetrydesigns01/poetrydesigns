/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectProgramme } from "@/components/architect/programme";
import { ProjectPlanTab } from "@/components/project/plan";
import { projects } from "@/lib/firm-data";
import { projectIdOf } from "../project-id";

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
  const projectId = projectIdOf((await params).id);
  if (!projectId) notFound();
  return (
    <>
      <ProjectPlanTab projectId={projectId} />
      <ProjectProgramme id={projectId} />
    </>
  );
}
