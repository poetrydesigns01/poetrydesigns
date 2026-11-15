/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { inrShort } from "@/components/admin/glass-kit";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import type { ProjectId } from "@/lib/firm-data";
import { formatShortDate, inr } from "@/lib/format";
import type { PaymentStageView } from "@/lib/portal";
import { WORKFLOW_TEMPLATE } from "@/lib/workflow-template";
import { instShort, isOverdue, weekShort, type WeekLane } from "./instalment-weeks";
import { ProjectLink } from "./rows";

// The instalments of every project laid out by the calendar week they fall due in, and
// each project's instalment track: the Accounts & Finance row of the workbook's tracker.

/** Overdue, this week and the weeks ahead, side by side from a laptop, stacked on a phone. */
export function WeekBoard({ overdue, lanes, later }: { overdue: WeekLane; lanes: WeekLane[]; later: number }) {
  const all = [overdue, ...lanes];
  return (
    <section aria-labelledby="weeks-heading" className="glass p-3 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 pb-3">
        <h2 id="weeks-heading" className="text-17 font-semibold">
          By due week
        </h2>
        {later > 0 && <span className="glass-chip">{later} later</span>}
      </header>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {all.map((lane) => (
          <Lane key={lane.id} lane={lane} />
        ))}
      </ol>
    </section>
  );
}

function Lane({ lane }: { lane: WeekLane }) {
  const late = lane.id === "overdue" && lane.items.length > 0;
  const current = lane.id === "this";
  return (
    <li
      aria-label={`${lane.label}, ${lane.items.length}`}
      className={`grid min-w-0 content-start gap-2 rounded-xl p-2 ${current ? "bg-white/45 ring-1 ring-laterite/40" : "bg-white/20"}`}
    >
      <div className="flex items-baseline justify-between gap-2 px-1">
        <p className={`lettering ${late ? "font-semibold text-brick" : current ? "text-ink" : "text-ink-soft"}`}>
          {lane.label}
          {lane.start && (lane.id === "this" || lane.id === "w1") && (
            <span className="font-normal text-ink-soft"> · {formatShortDate(lane.start)}</span>
          )}
        </p>
        <p className={`figure text-15 ${late ? "font-semibold text-brick" : "text-ink"}`}>
          {lane.items.length > 0 ? inrShort(lane.total) : "–"}
        </p>
      </div>
      {lane.items.length > 0 && (
        <ul className="grid gap-1.5">
          {lane.items.map((s) => (
            <Tile key={`${s.projectId}:${s.n}`} stage={s} />
          ))}
        </ul>
      )}
    </li>
  );
}

function Tile({ stage }: { stage: PaymentStageView }) {
  const firm = useFirm();
  const name = firm.project(stage.projectId)?.name ?? stage.projectId;
  return (
    <li className={`glass-inner grid min-w-0 gap-1.5 p-2.5 ${stage.state === "locked" ? "opacity-70" : ""}`}>
      <div className="flex min-w-0 items-baseline justify-between gap-2">
        <ProjectLink id={stage.projectId} name={name} className="min-w-0 truncate text-15 font-semibold" />
        <span className="figure shrink-0 text-15" title={inr(stage.outstanding)}>
          {inrShort(stage.outstanding)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="figure text-13 text-ink-soft">
          {instShort(stage)} · {weekShort(stage)}
        </span>
        <StatusChip tone={stage.tone}>{stage.status}</StatusChip>
      </div>
    </li>
  );
}

// ---- Instalment track ----

const DOT: Record<"paid" | "act" | "out" | "late" | "soon" | "locked", { fill: string; words: string }> = {
  paid: { fill: "bg-kota border-kota", words: "Received" },
  act: { fill: "bg-brass border-brass", words: "To act" },
  out: { fill: "bg-laterite border-laterite", words: "Letter out" },
  late: { fill: "bg-brick border-brick", words: "Overdue" },
  soon: { fill: "bg-white/70 border-laterite", words: "Coming up" },
  locked: { fill: "bg-ink/10 border-ink/20", words: "Locked" },
};

function dotOf(s: PaymentStageView): keyof typeof DOT {
  if (s.state === "paid") return "paid";
  if (isOverdue(s)) return "late";
  if (s.state === "client-paid" || s.state === "work-done") return "act";
  if (s.state === "due") return "out";
  if (s.state === "locked") return "locked";
  return "soon";
}

/** Every project's eleven instalments on the workbook's weeks: sign-up, then W1, W8, W12 ... W41. */
export function InstalmentTrack({ projects }: { projects: ProjectId[] }) {
  const firm = useFirm();
  const rows = projects
    .map((id) => ({ project: firm.project(id), stages: firm.payments(id) }))
    .filter((r) => r.project && r.stages.length > 0);
  if (rows.length === 0) return null;
  const heads = WORKFLOW_TEMPLATE.instalments;
  const cols = "grid grid-cols-11 gap-0.5 sm:gap-1";

  return (
    <section aria-labelledby="track-heading" className="glass p-3 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 pb-3">
        <h2 id="track-heading" className="text-17 font-semibold">
          Instalment track
        </h2>
        <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Key">
          {(Object.keys(DOT) as (keyof typeof DOT)[]).map((k) => (
            <li key={k} className="flex items-center gap-1.5 text-13 text-ink-soft">
              <span aria-hidden="true" className={`size-2.5 rounded-full border-2 ${DOT[k].fill}`} />
              {DOT[k].words}
            </li>
          ))}
        </ul>
      </header>

      <div className="grid gap-1">
        <div className="grid items-end gap-x-3 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]" aria-hidden="true">
          <span className="hidden md:block" />
          <div className={cols}>
            {heads.map((h) => (
              <span key={h.n} className="grid justify-items-center leading-tight">
                <span className="figure text-13 text-ink">{h.n === 0 ? "S" : h.n}</span>
                <span className="figure hidden text-13 text-ink-soft sm:block">
                  {h.clock === "construction" ? "W" : "P"}
                  {h.week}
                </span>
              </span>
            ))}
          </div>
        </div>
        <ul className="grid gap-1">
          {rows.map(({ project, stages }) => (
            <li
              key={project!.id}
              className="glass-row grid items-center gap-x-3 gap-y-1.5 px-1 py-2 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] md:px-0"
            >
              <span className="flex min-w-0 items-baseline gap-x-2 md:grid md:pl-2">
                <ProjectLink id={project!.id} name={project!.name} className="truncate text-15 font-semibold" />
                <span className="figure truncate text-13 text-ink-soft">{project!.code}</span>
              </span>
              <ol className={cols} aria-label={`${project!.name} instalments`}>
                {heads.map((h) => {
                  const s = stages.find((x) => x.n === h.n);
                  const kind = s ? dotOf(s) : "locked";
                  const words = s ? `${s.instalmentLabel}, ${s.dueWeekLabel}: ${s.status}` : h.label;
                  return (
                    <li key={h.n} className="grid place-items-center py-1" title={words}>
                      <span aria-hidden="true" className={`size-3.5 rounded-full border-2 sm:size-4 ${DOT[kind].fill}`} />
                      <span className="sr-only">{words}</span>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
