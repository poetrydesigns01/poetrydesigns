/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useRef, useState } from "react";
import { changeStamp, changeStatus, useChangeAnswer, type RowMode } from "@/components/changes/change-row";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useProjection } from "@/lib/demo-store";
import { inrDelta } from "@/lib/format";

// The decision strip above a specification: cost, extra days, status and the same Ask and
// Approve as the change's row, so the sheet is not a dead end. The comment box or the
// confirmation opens below the strip, on light glass.

export function SpecDecision({ changeId }: { changeId: string }) {
  const demo = useDemo();
  const projection = useProjection();
  const stripRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<RowMode>(null);
  const change = projection.changes.find((c) => c.id === changeId);
  const decision = demo.changeDecisions[changeId];
  const { buttons, more } = useChangeAnswer({
    // The hook needs a change on every render; the page only mounts this for a known id.
    change: change ?? projection.changes[0],
    mode,
    onMode: setMode,
    focusRef: stripRef,
    preview: false,
    dark: true,
    comment: decision?.comment,
    moreClassName: "glass-strong p-2",
  });
  if (!change) return null;

  const status = changeStatus(change);
  const decidedAt = projection.approvedAt[change.anchor] ?? decision?.at ?? change.decidedOn;

  return (
    <div className="grid gap-2">
      <section
        ref={stripRef}
        tabIndex={-1}
        aria-label="Decision"
        className="glass-dark flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3.5 outline-offset-2 sm:px-5"
      >
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="figure text-22">
            <span className="sr-only">Cost </span>
            {inrDelta(change.cost)}
          </span>
          {change.delayDays > 0 ? (
            <span className="glass-chip chip-late">
              <span className="sr-only">Extra time </span>+{change.delayDays} days
            </span>
          ) : (
            <span className="text-15 text-lime/75">0 days</span>
          )}
          <StatusChip tone={status.tone}>{status.words}</StatusChip>
        </p>
        {buttons ?? (decidedAt ? <p className="text-13 text-lime/75">{changeStamp(decidedAt)}</p> : null)}
      </section>
      {more}
    </div>
  );
}
