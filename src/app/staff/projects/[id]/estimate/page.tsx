import { Suspense } from "react";
import { ProjectEstimate } from "@/components/project/estimate";
import type { ProjectId } from "@/lib/firm-data";

// The estimate as agreed, and the signed agreement.
export default function Page({ params }: PageProps<"/staff/projects/[id]/estimate">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectEstimate projectId={id as ProjectId} />;
}
