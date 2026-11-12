"use client";

import type { CSSProperties, RefObject } from "react";
import { PegMark } from "@/components/house/house";
import { formatDate, inr } from "@/lib/format";
import { STOPS } from "@/lib/house-model";
import type { MoneyState, ProjectedMilestone } from "@/lib/projection";

// The payment rule: a length of teak with one division for each payment, lying under the
// house. Moving along it un-lays and lays the house. A native range input lies over the
// strip, so dragging, focus and the keys are the browser's own.

const CELLS = STOPS.length;
const CELL = `${(100 / CELLS).toFixed(4)}%`;

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * The schedule with the month of the last payment taken from the handover date as agreed
 * today. The keys are handed over at handover, so when an approved change moves that date,
 * this payment moves with it and no screen is left saying the old month.
 */
export function withHandover(milestones: ProjectedMilestone[], handoverAgreed: string): ProjectedMilestone[] {
  const month = monthFormat.format(new Date(`${handoverAgreed}T12:00:00+05:30`));
  return milestones.map((milestone, index) =>
    index === milestones.length - 1 && milestone.expected ? { ...milestone, expected: month } : milestone,
  );
}

/** Where a payment stands, as the end of a sentence: "paid on 2 Jun 2026". */
export function moneyWords(milestone: ProjectedMilestone): string {
  switch (milestone.money) {
    case "paid":
      return milestone.paidOn ? `paid on ${formatDate(milestone.paidOn)}` : "paid";
    case "approved":
      return "approved, waiting for your bank";
    case "due":
      return "waiting for your approval";
    case "under-way":
      return milestone.expected ? `work under way, expected ${milestone.expected}` : "work under way";
    default:
      return milestone.expected ? `expected ${milestone.expected}` : "still to come";
  }
}

/** What a screen reader is told for the payment the rule is on. */
function valueText(milestone: ProjectedMilestone, last: number): string {
  const name =
    milestone.id === 0 ? "Sign-up advance" : `Milestone ${milestone.id} of ${last}, ${lowerFirst(milestone.name)}`;
  return `${name}, ${inr(milestone.agreedTotal)} with GST, ${moneyWords(milestone)}`;
}

// Two courses of blocks, small enough to stand over one division of the rule.
const JOINTS = "M0.5 6.5h19M6.5 0.5v6M13.5 0.5v6M3.5 6.5v6M10.5 6.5v6M16.5 6.5v6";

/** The state of one payment, drawn the way the house draws it. */
function StateMark({ money }: { money: MoneyState }) {
  if (money === "due") return <PegMark className="h-[18px] w-auto" />;
  if (money === "paid" || money === "approved") {
    return (
      <svg viewBox="0 0 20 13" className="h-[13px] w-5" aria-hidden="true" focusable="false" fill="none">
        <rect x="0.5" y="0.5" width="19" height="12" style={{ fill: "var(--color-laterite)" }} />
        <path
          d={JOINTS}
          shapeRendering="crispEdges"
          strokeDasharray={money === "approved" ? "2 2" : undefined}
          style={{ stroke: "var(--color-lime)" }}
        />
        <rect x="0.5" y="0.5" width="19" height="12" stroke="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 13 13" className="size-[13px]" aria-hidden="true" focusable="false" fill="none">
      <rect x="0.5" y="0.5" width="12" height="12" strokeDasharray="2 2" style={{ stroke: "var(--color-chalk)" }} />
    </svg>
  );
}

export function PaymentRule({
  stop,
  onChange,
  milestones,
  inputRef,
}: {
  /** 0 to 10: the payment the house is shown at. */
  stop: number;
  onChange: (stop: number) => void;
  /** One for each stop, in order. */
  milestones: ProjectedMilestone[];
  /** The range input, so a button elsewhere can hand focus back to the rule. */
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const current = milestones[stop] ?? milestones[0];

  return (
    <div className="relative select-none pb-1">
      <div className="grid h-5 grid-cols-11 items-end justify-items-center" aria-hidden="true">
        {milestones.map((milestone) => (
          <StateMark key={milestone.id} money={milestone.money} />
        ))}
      </div>

      <div className="relative mt-1.5" aria-hidden="true">
        <div className="grid h-7 grid-cols-11" style={{ backgroundImage: "var(--tex-teak)" } as CSSProperties}>
          {milestones.map((milestone) => (
            <span key={milestone.id} className="lettering relative grid place-items-center pt-1 text-lime">
              <span className="absolute left-1/2 top-0 h-1 w-px -translate-x-1/2 bg-lime" />
              {milestone.id === 0 ? <span className="block size-1 rounded-full bg-lime" /> : milestone.id}
            </span>
          ))}
        </div>

        {/* The cursor: a lime line across the rule with a round head on the chosen division. */}
        <div
          className="pointer-events-none absolute -inset-y-1 left-0"
          style={{
            width: CELL,
            transform: `translateX(${stop * 100}%)`,
            transition: "transform var(--dur-row) var(--ease-lime)",
          }}
        >
          <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-lime" />
          <span className="lettering absolute left-1/2 top-1/2 grid size-[22px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-lime font-bold text-rosewood">
            {stop === 0 ? <span className="block size-1 rounded-full bg-rosewood" /> : stop}
          </span>
        </div>
      </div>

      {/* The thumb is as wide as one division, so each division is the place its payment is picked up. */}
      <input
        ref={inputRef}
        type="range"
        min={0}
        max={CELLS - 1}
        step={1}
        value={stop}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Payment shown on the house"
        aria-valuetext={valueText(current, CELLS - 1)}
        className="absolute inset-0 m-0 size-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-full [&::-moz-range-thumb]:w-[calc(100%/11)] [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-full [&::-webkit-slider-thumb]:w-[calc(100%/11)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent"
        style={{ touchAction: "pan-y" }}
      />
    </div>
  );
}
