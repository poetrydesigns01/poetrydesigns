"use client";

import { useRef, type PointerEvent } from "react";
import { withGst } from "@/lib/demo-data";
import { inr } from "@/lib/format";

// Splitting one milestone into two payments, drawn as its programme cell with a saw cut
// through it. The cut can be dragged; it snaps to whole percent and always leaves at least
// 1% on each side. The two steppers under it are the keyboard path, and they move each part
// on its own, so the words say when the parts do not yet add up to the milestone.

/** "Adds to 9%. 1% left to place." or "Adds to 10%." */
export function splitWords(a: number, b: number, total: number): string {
  const sum = a + b;
  if (sum === total) return `Adds to ${total}%.`;
  if (sum < total) return `Adds to ${sum}%. ${total - sum}% left to place.`;
  return `Adds to ${sum}%. ${sum - total}% more than the milestone.`;
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  amount,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  amount: string;
}) {
  return (
    <div role="group" aria-label={label} className="grid gap-1">
      <span className="text-15 font-semibold">{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn-quiet min-h-11 min-w-11 px-0"
          aria-label={`${label}, one percent less`}
          aria-disabled={value <= min}
          onClick={() => {
            if (value > min) onChange(value - 1);
          }}
        >
          −
        </button>
        <output className="figure min-w-12 text-center text-22" aria-live="polite">
          {value}%
        </output>
        <button
          type="button"
          className="btn btn-quiet min-h-11 min-w-11 px-0"
          aria-label={`${label}, one percent more`}
          aria-disabled={value >= max}
          onClick={() => {
            if (value < max) onChange(value + 1);
          }}
        >
          +
        </button>
      </span>
      <span className="text-15 text-ink-soft">{amount}</span>
    </div>
  );
}

export function SawnCell({
  n,
  total,
  amount,
  a,
  b,
  onChange,
}: {
  /** The milestone number, for the part names "5a" and "5b". */
  n: number;
  /** The milestone's percentage of the contract. */
  total: number;
  /** The milestone's amount before GST. */
  amount: number;
  a: number;
  b: number;
  onChange: (a: number, b: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const span = Math.max(a + b, total);
  const partAmount = (p: number) => Math.round((amount * p) / total);
  const words = (p: number) => {
    const before = partAmount(p);
    return `${inr(before)} before GST, ${inr(withGst(before).total)} with GST`;
  };

  // The cut follows the pointer and snaps to whole percent, 1% from either end.
  const cutAt = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || box.width === 0) return;
    const fraction = (clientX - box.left) / box.width;
    const next = Math.min(total - 1, Math.max(1, Math.round(fraction * total)));
    if (next !== a || a + b !== total) onChange(next, total - next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    cutAt(event.clientX);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) cutAt(event.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  const pct = (p: number) => `${(p / span) * 100}%`;
  const left = span - a - b;

  return (
    <div className="grid max-w-[480px] gap-4">
      {/* The drawing takes the pointer; the steppers below are the keyboard path. */}
      <div
        ref={ref}
        aria-hidden="true"
        className="relative h-14 cursor-ew-resize select-none"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="absolute inset-x-0 top-2 flex h-10">
          <span
            className="lettering flex items-center justify-center border border-rosewood bg-laterite text-lime"
            style={{ width: pct(a) }}
          >
            {n}a
          </span>
          <span className="w-1 shrink-0" />
          <span
            className="lettering flex items-center justify-center border border-rosewood bg-laterite text-lime"
            style={{ width: `calc(${pct(b)} - 4px)` }}
          >
            {n}b
          </span>
          {left > 0 && (
            <span className="border border-dashed border-ink-soft bg-sand-2" style={{ width: pct(left) }} />
          )}
        </div>
        {/* The saw cut and its grip. */}
        <span
          className="absolute top-0 h-14 w-0 border-l-2 border-dashed border-rosewood"
          style={{ left: `calc(${pct(a)} + 1px)` }}
        />
        <span
          className="absolute top-0 h-3 w-5 -translate-x-1/2 bg-rosewood"
          style={{ left: `calc(${pct(a)} + 2px)` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Stepper
          label={`Part ${n}a`}
          value={a}
          min={1}
          max={total}
          amount={words(a)}
          onChange={(next) => onChange(next, b)}
        />
        <Stepper
          label={`Part ${n}b`}
          value={b}
          min={1}
          max={total}
          amount={words(b)}
          onChange={(next) => onChange(a, next)}
        />
      </div>
    </div>
  );
}
