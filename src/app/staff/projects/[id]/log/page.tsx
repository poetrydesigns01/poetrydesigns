import { Suspense } from "react";
import { ProjectLog } from "@/components/project/log";
import type { ProjectId } from "@/lib/firm-data";

// This project's entries in the record.
export default function Page({ params }: PageProps<"/staff/projects/[id]/log">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectLog projectId={id as ProjectId} />;
}
