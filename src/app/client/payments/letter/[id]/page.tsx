import { notFound } from "next/navigation";
import { Suspense } from "react";
import { milestones } from "@/lib/demo-data";
import { DemandLetter } from "./demand-letter";

// Every milestone after sign-up can have a letter, including one raised in this tab, so
// each has its page. A letter not written yet says so.
export function generateStaticParams() {
  return milestones.filter((m) => m.id > 0).map((m) => ({ id: String(m.id) }));
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
  const milestone = milestones.find((m) => String(m.id) === id && m.id > 0);
  if (!milestone) notFound();
  return <DemandLetter milestone={milestone} />;
}
