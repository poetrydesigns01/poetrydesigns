/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectMaterials } from "@/components/project/materials";
import { projectIdOf } from "../project-id";

// Material requests and their POs for this project.
export default function Page({ params }: PageProps<"/staff/projects/[id]/materials">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const projectId = projectIdOf((await params).id);
  if (!projectId) notFound();
  return <ProjectMaterials projectId={projectId} />;
}
