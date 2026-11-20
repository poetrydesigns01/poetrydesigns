/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useState } from "react";
import { ChangeRow, CHANGE_GRID, type RowMode } from "@/components/changes/change-row";
import { ContractHero } from "@/components/changes/contract-hero";
import { CLIENT_PAGE, PageHead } from "@/components/client-home/page-frame";
import { CLIENT_PROJECT, DesignChangeAsk, RequestRows } from "@/components/hours/client-requests";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useFirm, useProjection } from "@/lib/demo-store";

// Changes: what the architect recommends beyond the agreement, as a table. Each row has its
// cost, the days it adds in bold brick, its status and the two answers. The hero above holds
// the running contract value, which follows a previewed change. Below, the design changes she
// asked for herself: each goes to the Project Head, and its cost comes back for her yes.

export default function ChangesPage() {
  const demo = useDemo();
  const firm = useFirm();
  const projection = useProjection();
  const asked = firm.requestsFor(CLIENT_PROJECT).filter((r) => r.type === "design-change");
  const [open, setOpen] = useState<{ id: string; mode: RowMode } | null>(null);

  const pending = projection.changes.filter((change) => change.status === "pending");
  const decided = projection.changes.filter((change) => change.status !== "pending");
  const rows = [...pending, ...decided];

  return (
    <div className={CLIENT_PAGE}>
      <PageHead title="Changes">
        {pending.length > 0 ? (
          <StatusChip tone="waiting">{pending.length} to decide</StatusChip>
        ) : (
          <StatusChip tone="done">All decided</StatusChip>
        )}
      </PageHead>

      <ContractHero />

      <section id="waiting" aria-labelledby="changes-table" className="glass-strong scroll-mt-24 p-2 sm:p-3">
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

      <section aria-labelledby="changes-asked" className="glass p-2 sm:p-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-2 pt-2">
          <h2 id="changes-asked" className="lettering text-ink-soft">
            Asked by you
          </h2>
          <DesignChangeAsk />
        </div>
        {asked.length === 0 ? (
          <p className="px-3 pb-3 text-15 text-ink-soft">None yet</p>
        ) : (
          <RequestRows requests={asked} label="Design changes you asked for" />
        )}
      </section>
    </div>
  );
}
