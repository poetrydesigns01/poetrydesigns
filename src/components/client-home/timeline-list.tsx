/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { ReactNode } from "react";
import { TODAY } from "@/lib/demo-data";
import { formatDate, formatShortDate } from "@/lib/format";
import type { TimelineInstalment, TimelineStage, TimelineView } from "@/lib/portal";
import { CheckIcon } from "./icons";
import {
  addedLabel,
  Diamond,
  dueWeekLabel,
  instalmentAhead,
  instalmentOpens,
  instalmentTone,
  instalmentWords,
  StageMark,
  weekSpan,
} from "./week-gantt";

// The weekly plan stacked for a phone: one row per workflow stage with its weeks, the
// instalment that opens it (a brick pill with its due week until the project reaches that
// week, plain after), and its expected finish. What is
// already finished folds into one line each (before construction, milestones done) and
// opens on tap, so the list stays short.

function when(iso: string): string {
  return iso.slice(0, 4) === TODAY.slice(0, 4) ? formatShortDate(iso) : formatDate(iso);
}

function Pins({ list }: { list: TimelineInstalment[] }) {
  if (list.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-2">
      {list.map((i) => {
        const short = i.n === 0 ? "Sign-up" : `Inst. ${i.n}`;
        return instalmentAhead(i) ? (
          <span key={i.n} className="wk-due-pill" title={`${i.label} · ${i.status}`}>
            <span aria-hidden="true">
              {short} · {dueWeekLabel(i)}
            </span>
            <span className="sr-only">{instalmentWords(i)}</span>
          </span>
        ) : (
          <span key={i.n} className="inline-flex items-center gap-1" title={`${i.label} · ${i.status}`}>
            <Diamond tone={instalmentTone(i)} small />
            <span className="text-ink" aria-hidden="true">
              {short} · {dueWeekLabel(i)}
            </span>
            <span className="sr-only">{instalmentWords(i)}</span>
          </span>
        );
      })}
    </span>
  );
}

function Row({
  stage,
  pins,
  lockedFirst,
  added,
}: {
  stage: TimelineStage;
  pins: TimelineInstalment[];
  lockedFirst: boolean;
  /** Days her changes add here, printed in brick. */
  added: number;
}) {
  const state = stage.state;
  return (
    <li className={`glass-row grid gap-2 px-3 py-2.5 ${state === "current" ? "bg-white/45" : ""}`}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <StageMark stage={stage} lockedFirst={lockedFirst} />
        <span className="grid min-w-0">
          <span
            className={`truncate text-15 ${state === "upcoming" || state === "held" ? "text-ink-soft" : "text-ink"} ${
              state === "current" ? "font-semibold" : ""
            }`}
          >
            {stage.short}
          </span>
          <span className="lettering flex flex-wrap items-center gap-x-2.5 text-ink-soft">
            <span>{weekSpan(stage)}</span>
            <Pins list={pins} />
          </span>
        </span>
        <span className="grid justify-items-end text-right">
          <span className="figure text-15 whitespace-nowrap text-ink">
            <span className="sr-only">{stage.doneOn ? "Finished " : "Expected "}</span>
            {when(stage.doneOn ?? stage.expectedEnd)}
          </span>
          {added > 0 && (
            <span className="late-text text-13">
              +{added}d<span className="sr-only"> from your changes</span>
            </span>
          )}
          {lockedFirst && stage.milestone && <span className="text-13 text-ink-soft">After instalment {stage.milestone}</span>}
        </span>
      </div>
      {state === "current" && (
        <div className="flex items-center gap-2 pl-[34px]">
          <div className="wk-mini flex-1" aria-hidden="true">
            <span style={{ transform: `scaleX(${stage.percent / 100})` }} />
          </div>
          <span className="figure text-13 text-ink">{stage.percent}%</span>
        </div>
      )}
    </li>
  );
}

function Folded({
  title,
  weeks,
  count,
  children,
}: {
  title: string;
  weeks: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <li>
      <details>
        <summary className="wk-summary glass-row grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2.5">
          <span className="stage-dot" data-state="done" aria-hidden="true">
            <CheckIcon />
          </span>
          <span className="grid min-w-0">
            <span className="truncate text-15 text-ink">{title}</span>
            <span className="lettering text-ink-soft">{weeks}</span>
          </span>
          <span className="glass-chip chip-done">{count} done</span>
          <svg viewBox="0 0 20 20" className="wk-chevron size-4 text-ink-soft" aria-hidden="true">
            <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </summary>
        <ol className="grid gap-0.5 pt-0.5">{children}</ol>
      </details>
    </li>
  );
}

export function TimelineList({ timeline }: { timeline: TimelineView }) {
  const { stages, instalments } = timeline;
  const pinsFor = (id: string) => instalments.filter((i) => instalmentOpens(i) === id);
  const firstLocked = stages.find((s) => s.locked && s.state !== "done")?.id ?? null;
  const anyAhead = instalments.some(instalmentAhead);
  const row = (stage: TimelineStage) => (
    <Row
      key={stage.id}
      stage={stage}
      pins={pinsFor(stage.id)}
      lockedFirst={stage.id === firstLocked}
      added={addedLabel(stages, stages.indexOf(stage))}
    />
  );

  const pre = stages.filter((s) => s.phase === "pre-construction");
  const build = stages.filter((s) => s.phase === "construction");
  const close = stages.filter((s) => s.phase === "close-out");
  const preDone = pre.every((s) => s.state === "done");
  // Milestones finished from the start fold into one line once there are two or more.
  const doneCount = build.findIndex((s) => s.state !== "done");
  const builtRun = doneCount === -1 ? build.length : doneCount;
  const folded = builtRun >= 2 ? build.slice(0, builtRun) : [];
  const open = build.slice(folded.length);

  return (
    <section className="glass-strong p-2" aria-labelledby="plan-list-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 pt-2 pb-2">
        <h2 id="plan-list-title" className="display text-22 text-ink">
          Weekly plan
        </h2>
        {anyAhead && (
          <p className="flex items-center gap-1.5 text-13 text-ink-soft" aria-hidden="true">
            <span className="wk-key" data-kind="due" />
            Due ahead
          </p>
        )}
      </div>
      <ol className="grid gap-0.5">
        {preDone ? (
          <Folded title="Before construction" weeks={`P1–P${pre[pre.length - 1]?.toWeek ?? 8}`} count={pre.length}>
            {pre.map(row)}
          </Folded>
        ) : (
          pre.map(row)
        )}
        {folded.length > 0 && (
          <Folded
            title={`Milestones 1–${folded.length}`}
            weeks={`W${folded[0].fromWeek}–${folded[folded.length - 1].toWeek}`}
            count={folded.length}
          >
            {folded.map(row)}
          </Folded>
        )}
        {open.map(row)}
        {close.map(row)}
      </ol>
    </section>
  );
}
