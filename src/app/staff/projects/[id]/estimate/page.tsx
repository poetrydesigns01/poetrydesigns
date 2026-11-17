/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectEstimate } from "@/components/project/estimate";
import { projectIdOf } from "../project-id";

// The estimate as agreed, and the signed agreement.
export default function Page({ params }: PageProps<"/staff/projects/[id]/estimate">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const projectId = projectIdOf((await params).id);
  if (!projectId) notFound();
  return <ProjectEstimate projectId={projectId} />;
}
