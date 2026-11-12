"use client";

import { dayWords } from "@/components/admin/admin-data";
import { EstimateSheet } from "@/components/reports/estimate-sheet";
import { SampleTag } from "@/components/register/sample-tag";
import { useFirm } from "@/lib/demo-store";
import type { ProjectId } from "@/lib/firm-data";
import { inr, inrDelta } from "@/lib/format";

// The estimate as agreed, read only, and the signed agreement with every addendum since.
// Estimates, requests and orders for a project are kept together on its record.

export function ProjectEstimate({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  const [signed, ...addenda] = p.valueHistory;

  return (
    <div className="grid gap-12">
      <section aria-label="The agreement" className="grid max-w-[44rem] gap-3">
        <h2 className="register-title">The agreement</h2>
        <ul className="sheet-rows ruled">
          <li className="grid gap-0.5">
            <p className="flex flex-wrap items-baseline gap-x-2 text-17 font-semibold">
              <span>Signed agreement, {p.name}.pdf</span>
              <SampleTag>Sample file</SampleTag>
            </p>
            <p className="text-15 text-ink-soft">
              {p.signedOn ? `Signed ${dayWords(p.signedOn)}` : "Not signed yet"},{" "}
              {inr(signed?.amount ?? p.originalValue)} before GST. Uploaded by {firm.person(p.onboardedBy)?.name}.
            </p>
          </li>
          {addenda.map((a, i) => (
            <li key={`${a.label}-${i}`} className="grid gap-0.5">
              <p className="text-17 font-semibold">{a.label}</p>
              <p className="text-15 text-ink-soft">
                {inrDelta(a.amount)} before GST{a.at ? `, approved ${dayWords(a.at)}` : ""}.
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="The estimate" className="grid gap-3">
        <h2 className="register-title">The estimate</h2>
        <EstimateSheet projectId={projectId} />
      </section>
    </div>
  );
}
