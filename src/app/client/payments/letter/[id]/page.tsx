import { notFound } from "next/navigation";
import { Suspense } from "react";
import { milestones } from "@/lib/demo-data";
import { DemandLetter } from "./demand-letter";

export function generateStaticParams() {
  return milestones.filter((m) => m.letterNo).map((m) => ({ id: String(m.id) }));
}

export default function DemandLetterPage({ params }: PageProps<"/client/payments/letter/[id]">) {
  return (
    <Suspense>
      <LetterFromParams params={params} />
    </Suspense>
  );
}

async function LetterFromParams({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const milestone = milestones.find((m) => String(m.id) === id && m.letterNo);
  if (!milestone) notFound();
  return <DemandLetter milestone={milestone} />;
}
