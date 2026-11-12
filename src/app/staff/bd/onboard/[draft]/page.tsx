import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DraftPage } from "@/components/bd/draft";
import { DRAFT_IDS } from "@/lib/firm";
import type { DraftId } from "@/lib/firm-data";

export function generateStaticParams() {
  return DRAFT_IDS.map((draft) => ({ draft }));
}

// Business development, one client's workspace being set up in four steps.
export default function BdDraftPage({ params }: PageProps<"/staff/bd/onboard/[draft]">) {
  return (
    <Suspense>
      <DraftFromParams params={params} />
    </Suspense>
  );
}

async function DraftFromParams({ params }: { params: Promise<{ draft: string }> }) {
  const { draft } = await params;
  if (!DRAFT_IDS.includes(draft as DraftId)) notFound();
  return <DraftPage id={draft as DraftId} />;
}
