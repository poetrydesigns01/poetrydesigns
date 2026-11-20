/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectTeam } from "@/components/project/team";
import { projectIdOf } from "../project-id";

// The architects on the project: the head, the juniors assigned or invited, and who fits best.
export default function Page({ params }: PageProps<"/staff/projects/[id]/team">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const projectId = projectIdOf((await params).id);
  if (!projectId) notFound();
  return <ProjectTeam projectId={projectId} />;
}
