"use client";

import { useState } from "react";
import { PageBand, Section, Status } from "@/components/page-band";
import { project, withGst, type Change } from "@/lib/demo-data";
import { useChanges, useDemo } from "@/lib/demo-store";
import { formatDate, inr, inrDelta } from "@/lib/format";

export default function ChangesPage() {
  const changes = useChanges();
  const pending = changes.filter((c) => c.status === "pending");
  const decided = changes.filter((c) => c.status !== "pending");
  const approvedValue = project.initialEstimate + changes.filter((c) => c.status === "approved").reduce((sum, c) => sum + c.cost, 0);
  const pendingValue = pending.reduce((sum, c) => sum + c.cost, 0);
  const pendingDays = pending.reduce((sum, c) => sum + c.delayDays, 0);

  return (
    <>
      <PageBand
        title="Changes"
        lede="When something is added or altered, you see what it costs and what it does to the schedule before you decide. Approved changes become an addendum to your agreement."
      >
        <dl className="mt-8 grid max-w-3xl gap-x-12 gap-y-5 border-t border-lime/30 pt-6 sm:grid-cols-3">
          <div>
            <dt className="text-lime/75">Approved value today</dt>
            <dd className="figure text-[1.75rem]">{inr(approvedValue)}</dd>
          </div>
          <div>
            <dt className="text-lime/75">If you approve what is open</dt>
            <dd className="figure text-[1.75rem]">{inr(approvedValue + pendingValue)}</dd>
          </div>
          <div>
            <dt className="text-lime/75">Effect on the schedule</dt>
            <dd className="figure text-[1.75rem]">{pendingDays === 0 ? "None" : `${pendingDays} more days`}</dd>
          </div>
        </dl>
      </PageBand>

      <Section title="Waiting for your decision">
        {pending.length === 0 ? (
          <p className="text-ink-soft">
            No changes are open. To ask for one, speak to your point of contact and it will appear here with its price.
          </p>
        ) : (
          <div className="border-t border-ink">
            {pending.map((change) => (
              <ChangeItem key={change.id} change={change} />
            ))}
          </div>
        )}
      </Section>

      <div className="bg-sand-2">
        <Section title="Decided">
          <div className="border-t border-ink">
            {decided.map((change) => (
              <ChangeItem key={change.id} change={change} />
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

function ChangeItem({ change }: { change: Change }) {
  const { decideChange } = useDemo();
  const [confirming, setConfirming] = useState<"approve" | "decline" | null>(null);
  const money = withGst(change.cost);

  return (
    <article className="grid gap-x-12 gap-y-5 border-b border-sand py-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <div>
        <p className="text-ink-soft">
          {change.reason}, raised on {formatDate(change.raisedOn)}
        </p>
        <h3 className="mt-1 text-[1.375rem] font-semibold leading-snug">{change.title}</h3>
        <p className="mt-2 max-w-xl">{change.summary}</p>
        <p className="mt-2 max-w-xl text-ink-soft">How the price is worked out: {change.working}</p>

        {change.status === "pending" && !confirming && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={() => setConfirming("approve")}>
              Approve this change
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirming("decline")}>
              Decline
            </button>
          </div>
        )}

        {change.status === "pending" && confirming && (
          <div className="reveal mt-6 bg-sand-2 p-5">
            <p className="text-[1.125rem] font-semibold">
              {confirming === "approve"
                ? `Approve ${change.title.toLowerCase()} for ${inr(money.total)} and ${change.delayDays} more days?`
                : `Decline ${change.title.toLowerCase()}?`}
            </p>
            <p className="mt-2 text-ink-soft">
              {confirming === "approve"
                ? "It is added to your approved value and recorded as an addendum to your agreement, with your name, the date and the time."
                : "Nothing is added to your approved value or your schedule. The proposal stays on record as declined."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => decideChange(change.id, confirming === "approve" ? "approved" : "declined")}
              >
                {confirming === "approve" ? "Confirm approval" : "Confirm decline"}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setConfirming(null)}>
                Go back
              </button>
            </div>
          </div>
        )}

        {change.status !== "pending" && (
          <p className="reveal mt-5 text-[1.125rem]">
            {change.status === "approved" ? <Status tone="done">Approved</Status> : <Status tone="quiet">Declined</Status>} on{" "}
            {formatDate(change.decidedOn!)}
            {change.status === "approved" && (
              <span className="text-ink-soft">, recorded as {change.addendum ?? "a new addendum"}</span>
            )}
          </p>
        )}
      </div>

      <dl className="self-start border-t border-sand lg:border-t-0">
        <div className="flex items-baseline justify-between gap-6 border-b border-sand py-3">
          <dt className="text-ink-soft">Price</dt>
          <dd className="figure text-[1.75rem]">{inrDelta(change.cost)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-6 border-b border-sand py-3">
          <dt className="text-ink-soft">With GST at 18%</dt>
          <dd className="figure text-[1.125rem]">{inr(money.total)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-6 border-b border-sand py-3">
          <dt className="text-ink-soft">Schedule</dt>
          <dd className="figure text-[1.125rem]">{change.delayDays} more days</dd>
        </div>
        <div className="border-b border-sand py-3">
          <dt className="text-ink-soft">Milestones affected</dt>
          <dd>{change.affects}</dd>
        </div>
        {change.status === "pending" && change.validUntil && (
          <div className="py-3">
            <dt className="text-ink-soft">Price held until</dt>
            <dd>{formatDate(change.validUntil)}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
