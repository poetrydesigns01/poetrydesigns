"use client";

import Link from "next/link";
import { useId, type FocusEvent, type RefObject } from "react";
import { ApproveControl, DECISION_BAR } from "@/components/craft/approve-control";
import { FocusTarget } from "@/components/home/sheet";
import { client, TODAY, withGst } from "@/lib/demo-data";
import { useDemo, useProjection } from "@/lib/demo-store";
import { addDays, dayCount, formatDate, formatStamp, inr, listWords } from "@/lib/format";
import type { ProjectedChange } from "@/lib/projection";
import { AskForChanges } from "./ask-changes";

// One change that is waiting for her: what it adds, who raised it, the revised
// specification, a record in two columns of what is agreed now and what the change would
// make it, how long the price is held, and the two ways to answer. The working sits behind
// a disclosure. The record is always there in words, so nothing here depends on trying it.

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

const ROW = "grid grid-cols-2 gap-x-4 gap-y-0.5 py-2.5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,1fr)]";

/** A small block beside a column name: solid for what is agreed, loose and hatched for what is not. */
function Swatch({ kind }: { kind: "set" | "loose" | "was" }) {
  if (kind === "loose") {
    return (
      <span
        className="loose block h-[14px] w-[22px] shrink-0 border border-dashed border-brass"
        style={{ backgroundImage: "var(--tex-hatch-brass-on-light)" }}
        aria-hidden="true"
      />
    );
  }
  return (
    <span
      className={`block h-[14px] w-[22px] shrink-0 border ${kind === "set" ? "border-ink bg-laterite" : "border-dashed border-ink-soft"}`}
      aria-hidden="true"
    />
  );
}

type RecordRow = { label: string; before: string; after: string };

/** The permanent record: the same three lines read down two columns. */
function Record({ label, approved, rows }: { label: string; approved: boolean; rows: RecordRow[] }) {
  return (
    <div role="table" aria-label={label} className="mt-5 max-w-[40rem]">
      <div role="row" className={`${ROW} pt-0`}>
        <span role="columnheader" className="sr-only">
          What
        </span>
        <span role="columnheader" className="flex items-center gap-2 text-15 sm:col-start-2">
          <Swatch kind={approved ? "was" : "set"} />
          {approved ? "Without this change" : "As agreed"}
        </span>
        <span role="columnheader" className="flex items-center gap-2 text-15">
          <Swatch kind={approved ? "set" : "loose"} />
          {approved ? "As agreed now" : "With this change"}
        </span>
      </div>
      {rows.map((row, index) => (
        <div key={row.label} role="row" className={`${ROW}${index > 0 ? " border-t border-sand" : ""}`}>
          <span role="rowheader" className="col-span-2 text-15 text-ink-soft sm:col-span-1 sm:self-baseline">
            {row.label}
          </span>
          <span role="cell" className="figure leading-snug">
            {row.before}
          </span>
          <span role="cell" className="figure leading-snug">
            {row.after}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChangeSheet({
  change,
  tableRef,
  focused,
  onDecided,
  onPoint,
}: {
  change: ProjectedChange;
  /** The page's table, so the piece on the house follows a hold. */
  tableRef: RefObject<HTMLDivElement | null>;
  /** "See it as" landed on this change. */
  focused: boolean;
  /** Called in the same write as a decision made here, so the page keeps this sheet where it is. */
  onDecided: (id: string) => void;
  /** Says which mark on the house this sheet is about while it is under the pointer or holds focus. */
  onPoint: (anchor: string | null) => void;
}) {
  const demo = useDemo();
  const projection = useProjection();
  const titleId = useId();

  const approved = change.status === "approved";
  const asked = change.status === "changes-asked" || change.status === "declined";
  const gst = withGst(change.cost);
  const what = `the ${lowerFirst(change.title)}`;
  const decision = demo.changeDecisions[change.id];
  const decidedAt = decision?.at;
  const when = decidedAt ? formatStamp(decidedAt) : formatDate(change.decidedOn ?? TODAY);

  // Until it is approved the left column is the home as agreed. Once it is, the right one
  // is, and the left is the home without this change, whatever else was approved after it.
  const before = {
    value: approved ? projection.agreedValue - change.cost : projection.agreedValue,
    total: approved ? projection.total - gst.total : projection.total,
    handover: approved ? addDays(projection.handoverAgreed, -change.delayDays) : projection.handoverAgreed,
  };
  const rows: RecordRow[] = [
    { label: "Price before GST", before: inr(before.value), after: inr(before.value + change.cost) },
    { label: "Price with GST", before: inr(before.total), after: inr(before.total + gst.total) },
    {
      label: "Handover",
      before: formatDate(before.handover),
      after: formatDate(addDays(before.handover, change.delayDays)),
    },
  ];
  const lands = change.lands.map((land) => {
    const milestone = projection.milestones.find((m) => m.id === land.milestoneId);
    return `${inr(land.amount)} to ${milestone ? lowerFirst(milestone.name) : "a later payment"}`;
  });
  const days = change.delayDays > 0 ? dayCount(change.delayDays) : "no days";

  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) onPoint(null);
  };

  return (
    <article
      aria-labelledby={titleId}
      onPointerEnter={() => onPoint(change.anchor)}
      onPointerLeave={() => onPoint(null)}
      onFocus={() => onPoint(change.anchor)}
      onBlur={onBlur}
    >
      <FocusTarget on={focused}>
        <p className="figure text-22 leading-snug">
          Adds {inr(change.cost)} and {days}
        </p>
        <h3 id={titleId} className="mt-1 font-semibold leading-snug">
          {change.title}
        </h3>
        <p className="mt-1 max-w-[58ch] text-ink-soft">
          Raised by {change.raisedBy}, Project Head, on {formatDate(change.raisedOn)}.
        </p>
        <Link
          href={`/client/changes/${change.id}/specification`}
          className="link mt-1 inline-flex min-h-11 items-center"
        >
          Open revised specification {change.revisedSpec.sheet}
        </Link>

        {!asked && (
          <>
            <Record
              label={approved ? `What ${change.short} changed` : `What ${change.short} would change`}
              approved={approved}
              rows={rows}
            />
            {change.validUntil && (
              <p className="mt-3 max-w-[58ch]">
                {approved ? "The price was held" : "Price held"} until {formatDate(change.validUntil)}.
              </p>
            )}
            <details className="mt-2">
              <summary className="link inline-flex min-h-11 cursor-pointer items-center">How the price is worked out</summary>
              <p className="max-w-[58ch]">{change.working}</p>
              {lands.length > 0 && (
                <p className="mt-1 max-w-[58ch] pb-2 text-ink-soft">
                  It is added to {lands.length === 1 ? "this payment" : "these payments"}, before GST: {listWords(lands)}.
                </p>
              )}
            </details>

            <div className={`mt-5 ${approved ? "" : DECISION_BAR}`}>
              <ApproveControl
                confirmTitle={`Approve ${what} for ${inr(gst.total)} with GST and ${days}?`}
                confirmBody="It is added to your approved value and recorded as an addendum to your agreement, with your name, the date and the time."
                what={`Your approval of ${what}`}
                note
                approved={approved}
                onApprove={(note) => {
                  onDecided(change.id);
                  demo.decideChange(change.id, "approved", undefined, note);
                }}
                receipt={
                  <p>
                    Approved by {client.name} on {when}. Recorded as {change.addendum ?? "an addendum"}. Posted in
                    Updates. Vikram Desai, Prakash Hegde and Shalini Murthy were emailed.
                  </p>
                }
                holdTarget={change.anchor}
                scopeRef={tableRef}
                secondary={
                  <AskForChanges
                    what={`Your request for changes to ${what}`}
                    prompt="What would you like changed in this price?"
                    onSend={(comment) => {
                      onDecided(change.id);
                      demo.decideChange(change.id, "changes-asked", comment);
                    }}
                  />
                }
              />
            </div>
          </>
        )}

        {/* Always here, so a screen reader is told when the sentence arrives. */}
        <div role="status" className={asked ? "mt-4 max-w-[58ch]" : undefined}>
          {asked && (
            <p>
              You asked for changes on {when}. {change.raisedBy} will reply in Updates.
              {decision?.comment && <span className="mt-1 block text-ink-soft">You wrote: {decision.comment}</span>}
            </p>
          )}
        </div>
      </FocusTarget>
    </article>
  );
}
