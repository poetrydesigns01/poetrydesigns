/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectOverview } from "@/components/project/overview";
import { projectIdOf } from "./project-id";

// The project at a glance: the site, the team, the hand-off note and every milestone.
export default function Page({ params }: PageProps<"/staff/projects/[id]">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const projectId = projectIdOf((await params).id);
  if (!projectId) notFound();
  return <ProjectOverview projectId={projectId} />;
}
