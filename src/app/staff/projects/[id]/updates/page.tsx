/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectUpdates } from "@/components/project/updates";
import { projectIdOf } from "../project-id";

// The project update log: the chat between the team and the client.
export default function Page({ params }: PageProps<"/staff/projects/[id]/updates">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const projectId = projectIdOf((await params).id);
  if (!projectId) notFound();
  return <ProjectUpdates projectId={projectId} />;
}
