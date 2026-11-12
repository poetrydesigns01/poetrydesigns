import { Suspense } from "react";
import { ProjectDesigns } from "@/components/project/designs";
import type { ProjectId } from "@/lib/firm-data";

// Every design with its versions and the client's decision, read only.
export default function Page({ params }: PageProps<"/staff/projects/[id]/designs">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDesigns projectId={id as ProjectId} />;
}
