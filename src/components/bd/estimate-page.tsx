"use client";

import { useState } from "react";
import { useOnHidden } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { EstimateSheet } from "@/components/reports/estimate-sheet";
import { useFirm } from "@/lib/demo-store";
import { estimate, estimateInputFor, type EstimateInput } from "@/lib/estimate";
import type { ProjectId } from "@/lib/firm-data";
import { formatDate } from "@/lib/format";
import { courseWords, EstimateCourse } from "./estimate-course";

// One estimate on an A4 sheet that prints alone. Kulkarni Eco Home's is still a draft, so
// its figures can be tried here before it is printed; the others are as issued.

export function EstimatePage({ id }: { id: ProjectId }) {
  const firm = useFirm();
  const given = estimateInputFor(id, firm);
  const draft = firm.drafts.find((d) => d.id === "kulkarni");
  const editable = id === "kulkarni" && !draft?.opened;
  // Figures tried on the sheet. They are not saved: leaving the screen lets them go.
  const [tried, setTried] = useState<EstimateInput | null>(null);
  const [round, setRound] = useState(0);
  useOnHidden(() => {
    setTried(null);
    setRound((r) => r + 1);
  });

  const input = tried ?? given;
  const result = input ? estimate(input) : null;
  const name = input?.name ?? firm.project(id)?.name ?? "this project";

  return (
    <>
      <StaffBoard
        place="Estimate"
        headline={`Estimate for ${name}`}
        state={result ? `Valid until ${formatDate(result.validUntil)}.` : "There is no estimate for this project yet."}
        primary={result ? { label: "Download estimate", onClick: () => window.print() } : undefined}
        picture={result ? <EstimateCourse result={result} /> : undefined}
        pictureWords={result ? courseWords(result) : undefined}
        chip={false}
        back={id === "kulkarni" ? { label: "Back to Kulkarni Eco Home", href: "/staff/bd/onboard/kulkarni" } : undefined}
      />
      <div className="mt-8">
        <EstimateSheet key={round} projectId={id} editable={editable} onChange={setTried} />
      </div>
    </>
  );
}
