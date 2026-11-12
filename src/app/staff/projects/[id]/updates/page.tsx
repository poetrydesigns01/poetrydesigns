import { Suspense } from "react";
import { ProjectUpdates } from "@/components/project/updates";
import type { ProjectId } from "@/lib/firm-data";

// The project thread. A staff post is emailed to the client.
export default function Page({ params }: PageProps<"/staff/projects/[id]/updates">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectUpdates projectId={id as ProjectId} />;
}
