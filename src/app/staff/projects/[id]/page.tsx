import { Suspense } from "react";
import { ProjectOverview } from "@/components/project/overview";
import type { ProjectId } from "@/lib/firm-data";

// The project at a glance: the site, the team, the hand-off note and every milestone.
export default function Page({ params }: PageProps<"/staff/projects/[id]">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectOverview projectId={id as ProjectId} />;
}
