import { Suspense } from "react";
import { ProjectHours } from "@/components/project/hours";
import type { ProjectId } from "@/lib/firm-data";

// Advisory hours: the pools, the sessions, hours bought and hours asked for.
export default function Page({ params }: PageProps<"/staff/projects/[id]/hours">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectHours projectId={id as ProjectId} />;
}
