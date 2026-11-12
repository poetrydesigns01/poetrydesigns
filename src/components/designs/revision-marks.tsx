"use client";

import { Fragment, type RefObject } from "react";
import { PLAN_VIEW, type Revision } from "@/components/floor-plan";

// What changed between two versions of a drawing: numbered marks on the drawing and the
// same numbers in a list of words. Choosing either one brackets that place on the drawing.
// The number and the weight of the line carry the difference, never colour.

const across = (x: number) => `${((x / PLAN_VIEW.w) * 100).toFixed(3)}%`;
const down = (y: number) => `${((y / PLAN_VIEW.h) * 100).toFixed(3)}%`;

const CORNERS = [
  "left-0 top-0 border-l-2 border-t-2",
  "right-0 top-0 border-r-2 border-t-2",
  "bottom-0 left-0 border-b-2 border-l-2",
  "bottom-0 right-0 border-b-2 border-r-2",
];

/** The number in its square, the same on the drawing and in the list. */
function Numeral({ n, on }: { n: number; on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`lettering grid size-6 shrink-0 place-items-center border-[1.5px] border-ink ${
        on ? "bg-ink text-lime" : "bg-paper text-ink"
      }`}
    >
      {n}
    </span>
  );
}

/** Laid over the drawing: a numbered button at each change and brackets round the chosen one. */
export function RevisionMarks({
  changes,
  selected,
  onSelect,
  placeRefs,
}: {
  changes: Revision[];
  selected: number | null;
  onSelect: (n: number | null) => void;
  /**
   * Filled with the bracketed place of each change, so the viewer can bring one into view.
   * Each keeps clear of the top edge and of the bars along the foot of a phone screen.
   */
  placeRefs: RefObject<Record<number, HTMLElement | null>>;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {changes.map((change) => {
        const on = selected === change.n;
        return (
          <Fragment key={change.n}>
            <span
              ref={(el) => {
                placeRefs.current[change.n] = el;
              }}
              aria-hidden="true"
              className="absolute scroll-mb-48 scroll-mt-6"
              style={{
                left: across(change.place.x),
                top: down(change.place.y),
                width: across(change.place.w),
                height: down(change.place.h),
                opacity: on ? 1 : 0,
                transition: "opacity var(--dur-row) var(--ease-lime)",
              }}
            >
              {CORNERS.map((corner) => (
                <span key={corner} className={`absolute size-3 border-ink ${corner}`} />
              ))}
            </span>
            <button
              type="button"
              aria-pressed={on}
              aria-label={`Change ${change.n}: ${change.text}`}
              className="pointer-events-auto absolute grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center"
              style={{ left: across(change.mark.x), top: down(change.mark.y) }}
              onClick={() => onSelect(on ? null : change.n)}
            >
              <Numeral n={change.n} on={on} />
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

/** The same changes in words, numbered to match the marks. */
export function RevisionList({
  changes,
  selected,
  onSelect,
}: {
  changes: Revision[];
  selected: number | null;
  onSelect: (n: number | null) => void;
}) {
  return (
    <ol className="border-t border-ink">
      {changes.map((change) => {
        const on = selected === change.n;
        return (
          <li key={change.n} className="border-b border-sand">
            <button
              type="button"
              aria-pressed={on}
              className="flex min-h-12 w-full cursor-pointer items-center gap-3 py-2.5 text-left hover:bg-sand-2"
              onClick={() => onSelect(on ? null : change.n)}
            >
              <Numeral n={change.n} on={on} />
              <span className={on ? "underline decoration-1 underline-offset-4" : undefined}>{change.text}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
