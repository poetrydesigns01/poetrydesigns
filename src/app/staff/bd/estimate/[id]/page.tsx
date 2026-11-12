import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EstimatePage } from "@/components/bd/estimate-page";
import type { ProjectId } from "@/lib/firm-data";

const ESTIMATES: ProjectId[] = ["kulkarni", "iyer-cottage", "sharma", "iyer"];

export function generateStaticParams() {
  return ESTIMATES.map((id) => ({ id }));
}

// Business development, one estimate on paper: the figures, the schedule, and a print.
export default function BdEstimatePage({ params }: PageProps<"/staff/bd/estimate/[id]">) {
  return (
    <Suspense>
      <EstimateFromParams params={params} />
    </Suspense>
  );
}

async function EstimateFromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ESTIMATES.includes(id as ProjectId)) notFound();
  return <EstimatePage id={id as ProjectId} />;
}
