/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectLog } from "@/components/project/log";
import { projectIdOf } from "../project-id";

// This project's entries in the record.
export default function Page({ params }: PageProps<"/staff/projects/[id]/log">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const projectId = projectIdOf((await params).id);
  if (!projectId) notFound();
  return <ProjectLog projectId={projectId} />;
}
