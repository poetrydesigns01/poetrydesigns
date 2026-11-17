/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { StatusChip } from "@/components/register/status-chip";
import { formatShortDate, inr } from "@/lib/format";
import type { PaymentStageView } from "@/lib/portal";
import { planDate } from "./dates";

// The one rosewood hero on Payments: what is due next and the milestone it unlocks, what is
// paid, and how far through the contract the money is. Outstanding shows only when it
// differs from the amount due; otherwise that tile counts instalments received.

/** What paying opens: the milestone that cannot start until this is received. */
function Unlocks({ n, name }: { n: number; name: string }) {
  return (
    <p className="mt-1.5 flex min-w-0 items-center gap-2 text-15">
      <span className="glass-chip">
        Unlocks<span className="sr-only"> milestone {n}</span>
      </span>
      <span className="min-w-0 truncate text-lime/80">{name}</span>
    </p>
  );
}

export function PaySummary({ stages }: { stages: PaymentStageView[] }) {
  const contract = stages.reduce((total, s) => total + s.total, 0);
  const paid = stages.reduce((total, s) => total + s.received, 0);
  const raised = stages.filter((s) => s.state === "due" || s.state === "client-paid");
  const outstanding = raised.reduce((total, s) => total + s.outstanding, 0);
  const paidCount = stages.filter((s) => s.state === "paid").length;
  const share = contract > 0 ? Math.min(1, paid / contract) : 0;

  const due = stages.find((s) => s.state === "due");
  const made = stages.find((s) => s.state === "client-paid");
  const upcoming = stages.find((s) => s.state !== "paid");
  const heroAmount = due ? due.outstanding : made ? made.outstanding : null;
  const showOutstanding = outstanding > 0 && outstanding !== heroAmount;

  return (
    <section id="due" aria-label="Summary" className="glass-dark grid scroll-mt-24 gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
      <div className="grid content-start gap-1.5">
        <p className="lettering text-lime/75">{due ? "Next due" : made ? "Awaiting receipt" : "Next payment"}</p>
        {due ? (
          <>
            <p className="figure text-32">{inr(due.outstanding)}</p>
            <p className="flex flex-wrap items-center gap-2 text-15 text-lime/80">
              <span>
                {due.instalmentLabel} · {due.dueDate ? `by ${formatShortDate(due.dueDate)}` : due.dueWeekLabel}
              </span>
              {due.overdueDays > 0 && <StatusChip tone="late">{due.status}</StatusChip>}
            </p>
            {due.unlocks && <Unlocks n={due.unlocks} name={due.name} />}
          </>
        ) : made ? (
          <>
            <p className="figure text-32">{inr(made.outstanding)}</p>
            <p className="flex flex-wrap items-center gap-2 text-15 text-lime/80">
              <span>{made.instalmentLabel}</span>
              <StatusChip tone="waiting">Payment made</StatusChip>
            </p>
            {made.unlocks && <Unlocks n={made.unlocks} name={made.name} />}
          </>
        ) : upcoming ? (
          <>
            <p className="figure text-32">{inr(upcoming.total)}</p>
            <p className="text-15 text-lime/80">
              {upcoming.instalmentLabel} · {upcoming.dueWeekLabel} · {planDate(upcoming.expectedDueDate)}
            </p>
          </>
        ) : (
          <p className="figure text-32">All paid</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-inner grid content-between gap-2 p-3 sm:p-4">
          <p className="lettering text-lime/75">Paid</p>
          <p className="figure text-22">{inr(paid)}</p>
        </div>
        {showOutstanding ? (
          <div className="glass-inner grid content-between gap-2 p-3 sm:p-4">
            <p className="lettering text-lime/75">Outstanding</p>
            <p className="figure text-22">{inr(outstanding)}</p>
          </div>
        ) : (
          <div className="glass-inner grid content-between gap-2 p-3 sm:p-4">
            <p className="lettering text-lime/75">Instalments</p>
            <p className="figure text-22">
              {paidCount}/{stages.length}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-2 lg:col-span-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-15">
          <span>
            <span className="figure">{Math.round(share * 100)}%</span> paid
          </span>
          <span className="text-lime/75">{inr(contract)} total with GST</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-lime/15"
          role="progressbar"
          aria-label="Contract paid"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
        >
          <div className="pay-fill h-full origin-left rounded-full bg-lime" style={{ transform: `scaleX(${share})` }} />
        </div>
      </div>
    </section>
  );
}
