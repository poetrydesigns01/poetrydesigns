/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useState } from "react";
import { ChangeRow, CHANGE_GRID, type RowMode } from "@/components/changes/change-row";
import { ContractHero } from "@/components/changes/contract-hero";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useProjection } from "@/lib/demo-store";

// Changes: what the architect recommends beyond the agreement, as a table. Each row has its
// cost, the days it adds in bold brick, its status and the two answers. The hero above holds
// the running contract value, which follows a previewed change.

export default function ChangesPage() {
  const demo = useDemo();
  const projection = useProjection();
  const [open, setOpen] = useState<{ id: string; mode: RowMode } | null>(null);

  const pending = projection.changes.filter((change) => change.status === "pending");
  const decided = projection.changes.filter((change) => change.status !== "pending");
  const rows = [...pending, ...decided];

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <h1 className="display text-32 text-ink">Changes</h1>
        {pending.length > 0 ? (
          <StatusChip tone="waiting">{pending.length} to decide</StatusChip>
        ) : (
          <StatusChip tone="done">All decided</StatusChip>
        )}
      </header>

      <ContractHero />

      <section aria-labelledby="changes-table" className="glass-strong p-2 sm:p-3">
        <h2 id="changes-table" className="lettering px-3 pb-1 pt-2 text-ink-soft">
          Recommended by architect
        </h2>
        <div
          aria-hidden="true"
          className={`lettering hidden px-3 pb-1 pt-2 text-ink-soft lg:grid ${CHANGE_GRID}`}
        >
          <span>Item</span>
          <span>Cost</span>
          <span>Extra time</span>
          <span>Status</span>
          <span className="text-right">Decision</span>
        </div>
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-15 text-ink-soft">No changes</p>
        ) : (
          <ul className="grid gap-1">
            {rows.map((change) => {
              const decision = demo.changeDecisions[change.id];
              return (
                <ChangeRow
                  key={change.id}
                  change={change}
                  mode={open?.id === change.id ? open.mode : null}
                  onMode={(mode) => setOpen(mode ? { id: change.id, mode } : null)}
                  decidedAt={projection.approvedAt[change.anchor] ?? decision?.at ?? change.decidedOn}
                  comment={decision?.comment}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
