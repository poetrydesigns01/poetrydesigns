"use client";

import { useId } from "react";
import type { MouseEvent, ReactNode, Ref } from "react";
import { ChalkTick } from "@/components/staff/chalk-tick";

// Chips are the staff side's answer to a select: every choice is on the screen and one tap
// picks it. Unchosen chips are flat sand; the chosen one is filled rosewood and carries a
// tick, so the state is never colour alone. The state changes at once; nothing animates.

/**
 * The look of a native field on staff screens: sand fill, an ink rule along the bottom only.
 * `staff-field` gives a select its own drawn chevron and a date field its own calendar.
 */
export const field =
  "staff-field block min-h-12 w-full rounded-none border-0 border-b border-ink/40 bg-sand-2 px-3 text-17 text-ink placeholder:text-ink-soft";

const COLUMNS = {
  // Two to a row from 400 px; on the narrowest phones a chip with a detail line needs the width.
  2: "grid-cols-1 min-[400px]:grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
} as const;

/** A named set of chips. With `columns` they stand in a grid; without, they wrap in a line. */
export function ChipGroup({
  label,
  columns,
  className = "",
  ref,
  children,
}: {
  label: string;
  columns?: 2 | 3;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div ref={ref} role="group" aria-labelledby={id} className={className}>
      <p id={id} className="text-15 font-semibold">
        {label}
      </p>
      <div className={`mt-2 ${columns ? `grid gap-2 ${COLUMNS[columns]}` : "flex flex-wrap gap-2"}`}>{children}</div>
    </div>
  );
}

/** One choice. On site screens it is 56 px tall, for a thumb in the sun. */
export function Chip({
  pressed,
  onClick,
  size,
  detail,
  ref,
  children,
}: {
  pressed: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  size?: "site";
  /** A quieter second line: what the chip would add. */
  detail?: string;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`chip${size === "site" ? " chip-site" : ""} justify-between`}
    >
      <span className="min-w-0 py-1.5">
        <span className="block">{children}</span>
        {detail && <span className="chip-detail">{detail}</span>}
      </span>
      {pressed && <ChalkTick className="size-4 shrink-0" />}
    </button>
  );
}
