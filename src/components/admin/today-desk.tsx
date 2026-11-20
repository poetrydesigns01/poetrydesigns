/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useState } from "react";
import { AttentionList, type AttentionAction } from "@/components/shared/attention-list";
import { ProjectTile } from "@/components/shared/project-tile";
import { StatusChip } from "@/components/register/status-chip";
import type { AttentionItem, ProjectAttention } from "@/lib/desk";
import { useFirm } from "@/lib/demo-store";
import type { ProjectView } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { Count } from "./glass-kit";

// The two halves of a staff Today, shared by site, finance and admin: what waits on this
// person (urgent first, each with how long it has waited), then their projects that need
// attention as picture tiles. Waits and reasons come from the firm (lib/desk.ts).

/** The items for one project, or all of them; items with no project stay in every view. */
function inScope<T extends { projectId?: ProjectId }>(items: T[], scope: ProjectId | "all"): T[] {
  return scope === "all" ? items : items.filter((x) => !x.projectId || x.projectId === scope);
}

export function WaitingPanel({
  items,
  scope = "all",
  limit = 8,
  title = "Waiting on you",
  empty = "Nothing waiting",
  action,
}: {
  items: AttentionItem[];
  scope?: ProjectId | "all";
  /** An action at the end of some rows (hand in, review), answered in place. */
  action?: AttentionAction;
  /** Rows shown before "Show all". */
  limit?: number;
  title?: string;
  empty?: string;
}) {
  const id = useId();
  const [all, setAll] = useState(false);
  const rows = inScope(items, scope);
  const urgent = rows.filter((x) => x.tier === "urgent").length;
  const approvals = rows.filter((x) => x.approval).length;
  return (
    <section aria-labelledby={id} className="grid content-start gap-2">
      <header className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 id={id} className="flex items-center gap-2 text-17 font-semibold text-ink">
          {title}
          <Count n={rows.length} tone={urgent > 0 ? "late" : rows.length > 0 ? "waiting" : "done"} />
        </h2>
        <span className="flex flex-wrap items-center gap-1.5">
          {urgent > 0 && <span className="glass-chip chip-late">{urgent} urgent</span>}
          {approvals > 0 && <span className="glass-chip">{approvals === 1 ? "1 approval" : `${approvals} approvals`}</span>}
        </span>
      </header>
      <AttentionList items={rows} label={title} empty={empty} limit={all ? undefined : limit} action={action} />
      {rows.length > limit && (
        <button type="button" className="btn btn-glass justify-self-start" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  );
}

/** Up to two reasons as chips under a tile's name, "+1" for the rest. */
function Reasons({ row }: { row: ProjectAttention }) {
  const shown = row.reasons.slice(0, 2);
  const more = row.reasons.length - shown.length;
  return (
    <>
      {shown.map((r) => (
        <StatusChip key={`${r.kind}:${r.words}`} tone={r.tone}>
          {r.words}
        </StatusChip>
      ))}
      {more > 0 && <span className="glass-chip">+{more}</span>}
    </>
  );
}

export function ProjectsAttention({
  person,
  scope = "all",
  title = "Projects needing attention",
  href,
  others = [],
  waiting = [],
}: {
  person: PersonId;
  scope?: ProjectId | "all";
  title?: string;
  /** Where a tile opens; the staff project page by default. */
  href?: (projectId: ProjectId) => string;
  /** The person's other projects, shown calm after the ones that need attention. */
  others?: ProjectView[];
  /** Their Today rows over every project: a calm tile says how many wait on it ("1 waiting"). */
  waiting?: AttentionItem[];
}) {
  const firm = useFirm();
  const id = useId();
  const rows = inScope(firm.projectsNeedingAttention(person), scope);
  const rest = others.filter((p) => p.phase !== "handed-over" && !rows.some((r) => r.projectId === p.id));
  if (rows.length === 0 && rest.length === 0) return null;
  return (
    <section aria-labelledby={id} className="grid content-start gap-2">
      <h2 id={id} className="flex items-center gap-2 px-1 text-17 font-semibold text-ink">
        {title}
        {rows.length > 0 && <Count n={rows.length} tone={rows.some((r) => r.tier === "urgent") ? "late" : "waiting"} />}
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {rows.map((row) => (
          <li key={row.projectId} className="relative min-w-0">
            {row.tier === "urgent" && (
              <span aria-hidden className="pointer-events-none absolute inset-x-6 -top-px z-10 h-1 rounded-full bg-brick" />
            )}
            <ProjectTile
              project={row.project}
              href={href?.(row.projectId)}
              badge={<Reasons row={row} />}
              showStage={!row.reasons.some((r) => r.kind === "held")}
              className="h-full content-start"
            />
            {row.tier === "urgent" && <span className="sr-only">Urgent</span>}
          </li>
        ))}
        {rest.map((p) => {
          const n = waiting.filter((x) => x.projectId === p.id).length;
          return (
            <li key={p.id} className="min-w-0">
              <ProjectTile
                project={p}
                href={href?.(p.id)}
                badge={n > 0 ? { words: `${n} waiting`, tone: "waiting" } : undefined}
                className="h-full content-start"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
