/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EstimatePage } from "@/components/bd/estimate-page";
import { ESTIMATES, estimateFor } from "../estimates";

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
  const project = estimateFor(id);
  if (!project) notFound();
  return <EstimatePage id={project} />;
}
