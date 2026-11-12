import { Suspense } from "react";
import { ProjectMaterials } from "@/components/project/materials";
import type { ProjectId } from "@/lib/firm-data";

// Material requests and their POs for this project.
export default function Page({ params }: PageProps<"/staff/projects/[id]/materials">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectMaterials projectId={id as ProjectId} />;
}
