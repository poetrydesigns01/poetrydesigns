/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProspectPage } from "@/components/bd/prospect-page";

/** Enquiries registered in the demo are built ahead (pr-01 to pr-60), so one taken in this tab can open. */
const PROSPECT_IDS = Array.from({ length: 60 }, (_, i) => `pr-${String(i + 1).padStart(2, "0")}`);

export function generateStaticParams() {
  return PROSPECT_IDS.map((id) => ({ id }));
}

// Business development, one prospect under discussion: the enquiry and where it stands.
export default function BdProspectPage({ params }: PageProps<"/staff/bd/prospects/[id]">) {
  return (
    <Suspense>
      <ProspectFromParams params={params} />
    </Suspense>
  );
}

async function ProspectFromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!PROSPECT_IDS.includes(id)) notFound();
  return <ProspectPage id={id} />;
}
