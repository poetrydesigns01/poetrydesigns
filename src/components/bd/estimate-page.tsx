"use client";

import { useState } from "react";
import { useOnHidden } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { EstimateFigures, EstimateSheet } from "@/components/reports/estimate-sheet";
import { useFirm } from "@/lib/demo-store";
import { estimate, estimateInputFor, type EstimateInput } from "@/lib/estimate";
import type { ProjectId } from "@/lib/firm-data";
import { formatDate, inr } from "@/lib/format";

// One estimate on an A4 sheet that prints alone, with a side column from 1024 px: the
// figures (Kulkarni Eco Home's draft only) and the grand total. The figures tried here are
// not saved; leaving the screen lets them go.

export function EstimatePage({ id }: { id: ProjectId }) {
  const firm = useFirm();
  const given = estimateInputFor(id, firm);
  const draft = firm.drafts.find((d) => d.id === "kulkarni");
  const editable = id === "kulkarni" && !draft?.opened;
  const [tried, setTried] = useState<EstimateInput | null>(null);
  useOnHidden(() => setTried(null));

  const input = tried ?? given;
  const result = input ? estimate(input) : null;
  const name = input?.name ?? firm.project(id)?.name ?? "this project";

  return (
    <>
      <StaffBoard
        place="Estimate"
        headline={`${name} estimate`}
        state={result ? `Valid until ${formatDate(result.validUntil)}` : "No estimate yet"}
        primary={result ? { label: "Download", onClick: () => window.print() } : undefined}
        chip={false}
        back={id === "kulkarni" ? { label: "Kulkarni Eco Home", href: "/staff/bd/onboard/kulkarni" } : undefined}
      />
      {input && result && (
        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
          <aside className="no-print grid gap-4 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1" aria-label="Figures and total">
            {editable && (
              <section className="glass p-4 sm:p-5" aria-labelledby="estimate-figures">
                <h2 id="estimate-figures" className="mb-3 text-17 font-semibold text-ink">
                  Figures
                </h2>
                <EstimateFigures input={input} onChange={setTried} />
              </section>
            )}
            <section className="glass-dark grid gap-1 p-5" aria-labelledby="estimate-total">
              <h2 id="estimate-total" className="lettering text-lime/75">
                Grand total
              </h2>
              <p className="figure text-32">{inr(result.grandTotal)}</p>
              <p className="text-13 text-lime/75">With GST</p>
            </section>
          </aside>
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <EstimateSheet projectId={id} input={input} printButton={false} />
          </div>
        </div>
      )}
    </>
  );
}
