"use client";

import { StruckFigure } from "@/components/craft/struck-figure";
import { FocusTarget } from "@/components/home/sheet";
import { Status } from "@/components/page-band";
import type { Receipt } from "@/lib/firm-data";
import { formatDate, formatShortDate, inr, listWords } from "@/lib/format";
import { STOPS } from "@/lib/house-model";
import type { ProjectedMilestone } from "@/lib/projection";

// The full schedule: every payment in order, one row each. The row is the control: choosing
// it puts that payment on the house and the rule. Each row says its name, where it stands
// in one sentence, and its figure once.

/** Who paid what, in words: "₹13,00,000 from your bank, ₹2,41,670 from you". */
export function paidWords(receipts: Receipt[]): string {
  const bank = receipts.filter((r) => r.source === "bank").reduce((sum, r) => sum + r.amount, 0);
  const own = receipts.filter((r) => r.source !== "bank").reduce((sum, r) => sum + r.amount, 0);
  const parts = [];
  if (bank > 0) parts.push(`${inr(bank)} from your bank`);
  if (own > 0) parts.push(`${inr(own)} from you`);
  return parts.join(", ");
}

/** Where one payment stands, as one sentence. */
export function moneySentence(milestone: ProjectedMilestone, receipts: Receipt[]) {
  switch (milestone.money) {
    case "paid": {
      const who = paidWords(receipts);
      return (
        <>
          <Status tone="done">Paid</Status>
          {milestone.paidOn ? ` on ${formatDate(milestone.paidOn)}` : ""}
          {who ? `: ${who}.` : "."}
        </>
      );
    }
    case "approved": {
      if (milestone.received > 0) {
        const last = receipts[receipts.length - 1];
        return (
          <>
            Part paid: {paidWords(receipts)}
            {last ? ` on ${formatShortDate(last.on)}` : ""}.
          </>
        );
      }
      return (
        <>
          <Status tone="done">Approved</Status>, waiting for the bank.
        </>
      );
    }
    case "due":
      return <>Waiting for your approval.</>;
    case "under-way":
      return <>Work under way{milestone.expected ? `, expected ${milestone.expected}` : ""}.</>;
    default:
      return <>{milestone.expected ? `Expected ${milestone.expected}.` : "Still to come."}</>;
  }
}

export function Schedule({
  milestones,
  stop,
  onShow,
  receiptsFor,
  focused,
}: {
  milestones: ProjectedMilestone[];
  /** The payment the house is shown at now. */
  stop: number;
  /** Puts a payment on the house. */
  onShow: (stop: number) => void;
  receiptsFor: (n: number) => Receipt[];
  /** The row "See it as" landed on: "pay:iyer:3". */
  focused: string | null;
}) {
  return (
    <ol className="sheet-rows">
      {milestones.map((milestone) => {
        const at = STOPS.find((entry) => entry.milestoneId === milestone.id)?.stop ?? milestone.id;
        const shown = at === stop;
        const tried = milestone.triedBy.length > 0;
        return (
          <li key={milestone.id}>
            <FocusTarget on={focused === `pay:iyer:${milestone.id}`}>
              <button
                type="button"
                aria-pressed={shown}
                onClick={() => onShow(at)}
                className={`-mx-2 grid w-[calc(100%+1rem)] cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 px-2 py-1 text-left ${
                  shown ? "bg-paper" : "hover:bg-paper/60"
                }`}
              >
                <span className="font-semibold leading-snug">
                  {milestone.id > 0 && <span className="figure mr-2">{milestone.id}</span>}
                  {milestone.name}
                </span>
                {milestone.parts ? (
                  <span className="figure whitespace-nowrap">{inr(milestone.agreedTotal)}</span>
                ) : (
                  <span className="whitespace-nowrap [&_.struck]:justify-end">
                    <StruckFigure
                      size="sm"
                      agreed={milestone.agreedTotal}
                      tried={tried ? milestone.triedTotal : null}
                      note={tried ? `with ${listWords(milestone.triedBy)}, not approved` : undefined}
                    />
                  </span>
                )}
                <span className="col-span-2 max-w-[58ch] text-15 leading-snug text-ink-soft">
                  {moneySentence(milestone, receiptsFor(milestone.id))}
                </span>
                {milestone.parts?.map((part) => (
                  <span key={part.label} className="col-span-2 flex justify-between gap-4 text-15 leading-snug">
                    <span>
                      {part.label}, {part.percent}%
                    </span>
                    <span className="figure">{inr(part.total)}</span>
                  </span>
                ))}
              </button>
            </FocusTarget>
          </li>
        );
      })}
    </ol>
  );
}
