"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { SampleTag } from "@/components/register/sample-tag";
import { designs } from "@/lib/demo-data";
import { dayCount, formatShortDate, inr } from "@/lib/format";
import type { Projection, WaitingItem } from "@/lib/projection";

const KIND_WORDS: Record<WaitingItem["kind"], string> = {
  stage: "Stage",
  payment: "Payment",
  schedule: "Schedule",
  drawing: "Drawing",
  specification: "Specification",
  change: "Change",
};

/** How many rows show before "Show the rest". */
const FIRST = 3;

/** One line under a row that says what slips if she waits. */
export function neededLine(item: WaitingItem, projection: Projection): string {
  switch (item.kind) {
    case "payment": {
      const due = projection.due;
      const finished = due?.workCompletedOn ? `The work was finished on ${formatShortDate(due.workCompletedOn)}. ` : "";
      return item.blockedBy
        ? `${finished}Accept the stage as finished first.`
        : `${finished}Approving it writes the letter for your bank.`;
    }
    case "schedule": {
      const change = projection.scheduleChange;
      return change ? `Two payments of ${inr(change.totals[0])} in place of one.` : item.detail;
    }
    case "drawing":
    case "specification": {
      const id = item.href.split("/").pop();
      const design = designs.find((d) => d.id === id);
      if (design?.decideBy) {
        return `Decide by ${formatShortDate(design.decideBy)}${design.slips ? ` ${design.slips}` : ""}.`;
      }
      return item.detail;
    }
    case "change": {
      const change = projection.pending.find((c) => c.anchor === item.anchor);
      if (!change) return item.detail;
      const held = change.validUntil ? `Price held until ${formatShortDate(change.validUntil)}. ` : "";
      return `${held}${change.delayDays > 0 ? `Adds ${dayCount(change.delayDays)}.` : "Adds no days."}`;
    }
    default:
      return item.detail;
  }
}

/**
 * What is waiting for her, in the order it needs her. Each row is one link to the item,
 * and from 1024 px a row under the pointer or the focus raises its peg on the house.
 */
export function WaitingList({
  items,
  projection,
  onPoint,
}: {
  items: WaitingItem[];
  projection: Projection;
  /** A row is under the pointer or holds the focus: point at its mark. Null when it leaves. */
  onPoint: (anchor: string | null) => void;
}) {
  const [all, setAll] = useState(false);
  const firstHidden = useRef<HTMLAnchorElement>(null);

  if (items.length === 0) {
    return (
      <p className="max-w-[58ch]">
        Nothing needs you this week. We email you when a drawing, a payment or a change is ready.
      </p>
    );
  }

  const shown = all ? items : items.slice(0, FIRST);
  // Milestone names are sample values: the first row that names one says so, once.
  const tagAt = shown.findIndex((item) => item.kind === "payment" || item.kind === "stage" || item.kind === "schedule");

  return (
    <>
      <ul className="sheet-rows">
        {shown.map((item, index) => (
          <li key={item.key}>
            <Link
              ref={index === FIRST ? firstHidden : undefined}
              href={item.href}
              className="group -mx-2 block px-2 py-1 hover:bg-sand-2/60"
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") onPoint(item.anchor);
              }}
              onPointerLeave={() => onPoint(null)}
              onFocus={() => onPoint(item.anchor)}
              onBlur={() => onPoint(null)}
            >
              <span className="sr-only">{KIND_WORDS[item.kind]}: </span>
              <span className="flex items-baseline justify-between gap-4">
                <span className="text-22 font-semibold leading-snug underline decoration-transparent decoration-1 underline-offset-4 group-hover:decoration-current">
                  {item.title}
                </span>
                {item.figure && (
                  <span className="figure shrink-0 whitespace-nowrap text-22">
                    {item.kind === "change" ? `+${item.figure}` : item.figure}
                  </span>
                )}
              </span>
              <span className="mt-1 block max-w-[58ch] text-ink-soft">
                {neededLine(item, projection)}
                {index === tagAt && (
                  <>
                    {" "}
                    <SampleTag>Sample stage names</SampleTag>
                  </>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!all && items.length > FIRST && (
        <button
          type="button"
          className="btn btn-quiet mt-6"
          onClick={() => {
            setAll(true);
            // The button goes, so the first row it brought takes the focus.
            window.setTimeout(() => firstHidden.current?.focus(), 0);
          }}
        >
          Show the rest
        </button>
      )}
    </>
  );
}
