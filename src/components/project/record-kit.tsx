/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import type { ReactNode } from "react";
import type { PaymentStageView } from "@/lib/portal";

// Small parts the project record's tabs share: a labelled fact in a glass tile, and the
// payment stages as a strip of eleven cells (sign-up and the ten stages), each coloured by
// where it stands, with its number under it and its status said to a screen reader.

export function Fact({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`glass-inner min-w-0 px-3 py-2.5 ${wide ? "col-span-2" : ""}`}>
      <dt className="lettering text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words text-15">{children}</dd>
    </div>
  );
}

/** By where the stage stands, not its chip: paid is kota, money asked for is brass (brick
 * when overdue), work under way is laterite, a stage open to start is a pale laterite. */
function fillOf(s: PaymentStageView): string {
  if (s.state === "paid") return "bg-kota";
  if (s.overdueDays > 0) return "bg-brick";
  if (s.state === "due" || s.state === "client-paid") return "bg-brass";
  if (s.state === "in-progress" || s.state === "work-done") return "bg-laterite";
  if (s.state === "open") return "bg-laterite/40";
  return "bg-ink/15";
}

/** Eleven cells: sign-up, then stages 1 to 10. */
export function StageStrip({ stages }: { stages: PaymentStageView[] }) {
  return (
    <ol className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(stages.length, 1)}, minmax(0, 1fr))` }}>
      {stages.map((s) => (
        <li key={s.n} className="grid justify-items-center gap-1">
          <span aria-hidden="true" className={`block h-2.5 w-full rounded-full ${fillOf(s)}`} />
          <span className={`figure text-13 ${s.locked ? "text-ink-soft" : "text-ink"}`} aria-hidden="true">
            {s.n === 0 ? "S" : s.n}
          </span>
          <span className="sr-only">
            {s.instalmentLabel}, {s.status}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A milestone as a short tag: "M4", or "Pre" for the work before construction. */
export function milestoneTag(n: number): string {
  return n > 0 ? `M${n}` : "Pre";
}

/** The stage that matters now: the first not received and not locked, else the last. */
export function currentStage(stages: PaymentStageView[]): PaymentStageView | undefined {
  return stages.find((s) => !s.locked && s.state !== "paid") ?? stages[stages.length - 1];
}

const STAT_COLS = {
  3: "sm:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "sm:grid-cols-3 xl:grid-cols-5",
} as const;

/** A row of stat cards. Two to a row on a phone; an odd last card takes the whole row there. */
export function Stats({ cols, label, children }: { cols: 3 | 4 | 5; label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className={`grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1 ${STAT_COLS[cols]}`}
    >
      {children}
    </section>
  );
}
