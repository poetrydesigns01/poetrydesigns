"use client";

import { useFirm, useProjection } from "@/lib/demo-store";
import { addDays, formatDate, inr, inrDelta } from "@/lib/format";

// The running contract value for the changes screen: what the home costs now before GST,
// what it was signed at, what approved changes added, and the handover with its extra days.
// The handover and its days come from the plan, so a change approved before construction
// (already in the plan) adds none. While a change is previewed the figure and the handover
// show it.

export function ContractHero() {
  const projection = useProjection();
  const timeline = useFirm().timeline("iyer");
  const { changes, agreedValue, triedValue, triedCost, triedDays, handoverAgreed, handoverTried, tried } = projection;

  const approved = changes.filter((change) => change.status === "approved");
  const addedCost = approved.reduce((sum, change) => sum + change.cost, 0);
  const signed = agreedValue - addedCost;
  const previewing = tried.length > 0;
  const shown = previewing ? triedValue : agreedValue;
  const planned = timeline?.handoverExpected ?? handoverAgreed;
  const handover = timeline ? (previewing ? addDays(planned, triedDays) : planned) : previewing ? handoverTried : handoverAgreed;
  const extraDays = (timeline?.extraDays ?? 0) + (previewing ? triedDays : 0);

  return (
    <section
      aria-label="Contract value"
      className="glass-dark grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] lg:gap-3"
    >
      <div className="min-w-0 lg:self-center lg:pr-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="lettering text-lime/75">Contract value</p>
          {previewing && <span className="glass-chip chip-waiting">Preview</span>}
        </div>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2" aria-live="polite">
          <span className="figure display-lg">{inr(shown)}</span>
          <span className="text-15 text-lime/75">+ GST</span>
        </p>
        {previewing && <p className="figure text-15 text-lime/75">{inrDelta(triedCost)} if approved</p>}
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:contents">
        <div className="glass-inner px-3 py-2.5 lg:px-4 lg:py-3">
          <dt className="lettering text-lime/75">Signed</dt>
          <dd className="figure text-17 lg:text-22">{inr(signed)}</dd>
        </div>
        <div className="glass-inner px-3 py-2.5 lg:px-4 lg:py-3">
          <dt className="lettering text-lime/75">Changes</dt>
          <dd className="figure text-17 lg:text-22">{inrDelta(addedCost)}</dd>
        </div>
        <div className="glass-inner col-span-2 px-3 py-2.5 sm:col-span-1 lg:px-4 lg:py-3">
          <dt className="lettering text-lime/75">Handover</dt>
          <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="figure text-17 lg:text-22">{formatDate(handover)}</span>
            {extraDays > 0 && <span className="glass-chip chip-late">+{extraDays} days</span>}
          </dd>
        </div>
      </dl>
    </section>
  );
}
