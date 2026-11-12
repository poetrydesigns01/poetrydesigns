import { Suspense } from "react";
import { ProjectMoney } from "@/components/project/money";
import type { ProjectId } from "@/lib/firm-data";

// Money in and money out, the margin so far and the cash position. Finance and admin only.
export default function Page({ params }: PageProps<"/staff/projects/[id]/money">) {
  return (
    <Suspense>
      <FromParams params={params} />
    </Suspense>
  );
}

async function FromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectMoney projectId={id as ProjectId} />;
}
