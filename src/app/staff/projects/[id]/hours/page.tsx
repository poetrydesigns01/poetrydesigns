/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectHours } from "@/components/project/hours";
import { projectIdOf } from "../project-id";

// Advisory hours: the pools, the sessions, hours bought and hours asked for.
export default function Page({ params }: PageProps<"/staff/projects/[id]/hours">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const projectId = projectIdOf((await params).id);
  if (!projectId) notFound();
  return <ProjectHours projectId={projectId} />;
}
