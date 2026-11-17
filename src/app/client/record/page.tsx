/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { CLIENT_PAGE, PageHead } from "@/components/client-home/page-frame";
import { AgreementPages } from "@/components/record/agreement-pages";
import { DecisionLog } from "@/components/record/decision-log";
import { useFirm, useProjection } from "@/lib/demo-store";
import { datePart, formatDate, inr, inrDelta } from "@/lib/format";

// Her agreement and every decision since, as proof. Nothing here can be changed: the
// agreement is view only, the value history only grows, and the log has no edit or delete.
// Each client project stays on its own: this is always Iyer Residence.

export default function RecordPage() {
  const firm = useFirm();
  const projection = useProjection();
  const project = firm.project("iyer");
  if (!project) return null;

  const area = Math.round(project.originalValue / project.ratePerSqFt);
  const now = projection.agreedValue;
  const history = project.valueHistory;

  return (
    <div className={CLIENT_PAGE}>
      <PageHead title="Agreement and record" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <section aria-labelledby="record-value" className="glass-dark grid content-start gap-4 p-5 sm:p-6">
          <div>
            <h2 id="record-value" className="lettering text-lime/75">
              Contract value now
            </h2>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="figure display-lg">{inr(now)}</span>
              <span className="text-15 text-lime/75">+ GST</span>
            </p>
          </div>
          <ul aria-label="Value history" className="grid gap-2 border-t border-lime/15 pt-3">
            {history.map((row, i) => (
              <li key={`${row.label}-${row.at}`} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-15">{i === 0 ? `Signed · ${area.toLocaleString("en-IN")} sq ft` : row.label}</span>
                  <span className="block text-13 text-lime/75">
                    {i === 0 ? `${inr(project.ratePerSqFt)} per sq ft` : row.at ? formatDate(datePart(row.at)) : ""}
                  </span>
                </span>
                <span className="figure whitespace-nowrap text-15">{i === 0 ? inr(row.amount) : inrDelta(row.amount)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="record-agreement" className="glass-strong grid content-start gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 id="record-agreement" className="lettering text-ink-soft">
              Agreement
            </h2>
            <span className="glass-chip chip-locked">View only</span>
          </div>
          <AgreementPages house="iyer" />
        </section>
      </div>

      <section aria-labelledby="record-log" className="glass-strong grid gap-2 p-2 sm:p-3">
        <h2 id="record-log" className="lettering px-3 pt-2 text-ink-soft">
          Decisions
        </h2>
        <DecisionLog entries={projection.log} />
      </section>
    </div>
  );
}
