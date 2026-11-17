/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectMoney } from "@/components/project/money";
import { projectIdOf } from "../project-id";

// Money in and money out, the margin so far and the cash position. Finance and admin only.
export default function Page({ params }: PageProps<"/staff/projects/[id]/money">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const projectId = projectIdOf((await params).id);
  if (!projectId) notFound();
  return <ProjectMoney projectId={projectId} />;
}
