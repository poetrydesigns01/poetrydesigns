/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectDesigns } from "@/components/project/designs";
import { projectIdOf } from "../project-id";

// Every design with its versions and the client's decision, read only.
export default function Page({ params }: PageProps<"/staff/projects/[id]/designs">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const projectId = projectIdOf((await params).id);
  if (!projectId) notFound();
  return <ProjectDesigns projectId={projectId} />;
}
