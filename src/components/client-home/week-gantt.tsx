/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { Fragment } from "react";
import { TODAY } from "@/lib/demo-data";
import { addDays, daysBetween, formatDate, formatShortDate } from "@/lib/format";
import type { TimelineInstalment, TimelineStage, TimelineView } from "@/lib/portal";
import { CheckIcon, LockIcon } from "./icons";

// The weekly plan, read like Poetry's schedule sheet: pre-construction weeks then
// construction weeks across, every workflow stage down, each with its planned run (dashed)
// over its expected run (solid), the days her changes added in brick, and a line for today.
// Each instalment has its own slim row just above the milestone it opens, as on the sheet:
// a red bar from construction week 1 to its due week while that week is still ahead, then
// drawn plainly ("free") once reached, with a diamond in its due week toned by where the
// money stands. From 768 px; phones get the stacked list in timeline-list.tsx.

/** An instalment's diamond sits mid-week in its (expected) due week. */
const MID_WEEK = 3;

export function stageTitle(stage: TimelineStage): string {
  return stage.short;
}

export function weekSpan(stage: TimelineStage): string {
  const prefix = stage.clock === "pre" ? "P" : "W";
  return stage.fromWeek === stage.toWeek ? `${prefix}${stage.fromWeek}` : `${prefix}${stage.fromWeek}–${stage.toWeek}`;
}

/** Shown state: a stage due to start but held for its instalment reads "held". */
export function stageState(stage: TimelineStage): "done" | "current" | "held" | "upcoming" {
  return stage.state;
}

/** The workflow stage an instalment opens: its row sits just above that stage's. */
export function instalmentOpens(i: TimelineInstalment): string {
  if (i.n === 0) return "sign-up";
  return `m${i.unlocks ?? i.n}`;
}

/** "W20", or "P1" before construction: the expected due week, after any client changes. */
export function dueWeekLabel(i: TimelineInstalment): string {
  return `${i.clock === "pre" ? "P" : "W"}${i.expectedWeek}`;
}

/** For a screen reader: "Instalment 6, due week 20, 23 Nov, not reached yet". */
export function instalmentWords(i: TimelineInstalment): string {
  const week = i.clock === "pre" ? `pre-construction week ${i.expectedWeek}` : `week ${i.expectedWeek}`;
  const ahead = instalmentAhead(i);
  return `${i.label}, ${i.percent}%, due ${week}, ${formatDate(i.expectedDate)}, ${ahead ? "not reached yet" : i.status}`;
}

/**
 * Red until the project reaches its due week. Never for the sign-up advance (before
 * construction) or instalment 1 (due in construction week 1): Poetry's sheet draws
 * instalment 1 free, and every chart follows that one rule.
 */
export function instalmentAhead(i: TimelineInstalment): boolean {
  return !i.reached && i.clock === "construction" && i.week > 1;
}

export function StageMark({
  stage,
  lockedFirst,
}: {
  stage: TimelineStage;
  /** The first stage waiting on its instalment: shows the padlock. */
  lockedFirst: boolean;
}) {
  const state = stageState(stage);
  return (
    <span className="stage-dot relative" data-state={state === "held" ? "upcoming" : state} aria-hidden="true">
      {state === "done" ? (
        <CheckIcon />
      ) : lockedFirst ? (
        <LockIcon className="size-3 text-ink-soft" />
      ) : stage.milestone ? (
        <span className={state === "current" ? "text-laterite" : "text-ink-soft"}>{stage.milestone}</span>
      ) : (
        <span className={`size-1.5 rounded-full ${state === "current" ? "bg-laterite" : "bg-ink/30"}`} />
      )}
    </span>
  );
}

/** Received in green, overdue in brick, raised or due in brass, the rest hollow. */
export function instalmentTone(i: TimelineInstalment): TimelineInstalment["tone"] {
  if (i.state === "paid") return "done";
  if (i.tone === "late") return "late";
  if (i.state === "locked" || i.state === "open") return "locked";
  return "waiting";
}

/**
 * The days to print beside a stage: where a change's days land (more than the stage before
 * carried) and the total on the handover. The bars further on show the shift without words.
 */
export function addedLabel(stages: TimelineStage[], index: number): number {
  const stage = stages[index];
  if (stage.extraDays <= 0) return 0;
  if (stage.id === "handover") return stage.extraDays;
  const before = index > 0 ? stages[index - 1].extraDays : 0;
  return Math.max(0, stage.extraDays - before);
}

export function Diamond({ tone, small }: { tone: TimelineInstalment["tone"]; small?: boolean }) {
  return <span className="wk-diamond" data-tone={tone} data-size={small ? "sm" : undefined} aria-hidden="true" />;
}

/** "21 Jan", or "21 Jan 2027" when the year is not this one. */
function when(iso: string): string {
  return iso.slice(0, 4) === TODAY.slice(0, 4) ? formatShortDate(iso) : formatDate(iso);
}

export function WeekGantt({ timeline }: { timeline: TimelineView }) {
  const { weeks, stages, instalments } = timeline;
  const origin = weeks[0].start;
  const lastExpected = stages.reduce((max, s) => (s.expectedEnd > max ? s.expectedEnd : max), weeks[weeks.length - 1].end);
  const span = Math.max(weeks.length * 7, daysBetween(origin, addDays(lastExpected, 1)));
  const at = (iso: string) => Math.min(100, Math.max(0, (daysBetween(origin, iso) / span) * 100));
  const bar = (from: string, to: string) => {
    const left = at(from);
    return { left: `${left}%`, width: `${Math.max(0, at(addDays(to, 1)) - left)}%` };
  };
  const firstLocked = stages.find((s) => s.locked && s.state !== "done")?.id ?? null;

  const find = (clock: "pre" | "construction", week: number) => weeks.find((w) => w.clock === clock && w.week === week);
  const lastBuild = find("construction", 48) ?? weeks[weeks.length - 1];
  const phases = [
    { id: "pre-construction", label: "Pre-construction", from: origin, to: addDays(timeline.constructionStart, -1) },
    { id: "construction", label: "Construction", from: timeline.constructionStart, to: lastBuild.end },
    { id: "close-out", label: "Handover", from: addDays(lastBuild.end, 1), to: weeks[weeks.length - 1].end },
  ];
  const today = at(TODAY);
  const current = weeks.find((w) => w.current);
  const currentAt = current ? weeks.indexOf(current) : -1;
  // A week label within two weeks of today would sit under today's pill: the pill names it.
  const labelled = weeks.filter(
    (w, i) =>
      (w.clock === "pre" ? w.week === 1 : w.week === 1 || w.week % 4 === 0) &&
      (currentAt < 0 || Math.abs(i - currentAt) > 2),
  );

  return (
    <section className="glass-strong p-2 sm:p-3" aria-labelledby="plan-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 pt-2 pb-3">
        <h2 id="plan-title" className="display text-22 text-ink">
          Weekly plan
        </h2>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-13 text-ink-soft" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="wk-key" data-kind="planned" />
            Planned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="wk-key" data-kind="expected" />
            Expected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="wk-key" data-kind="added" />
            Added days
          </span>
          <span className="flex items-center gap-1.5">
            <span className="wk-key" data-kind="due" />
            Due ahead
          </span>
          <span className="flex items-center gap-1.5">
            <span className="wk-key" data-kind="free" />
            Reached
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-0.5 rounded bg-brick" />
            Today
          </span>
        </p>
      </div>

      <div className="wk">
        <div className="wk-overlay" style={{ backgroundSize: `${700 / span}% 100%` }} aria-hidden="true">
          <span className="wk-start" style={{ left: `${at(timeline.constructionStart)}%` }} />
          {current && <span className="wk-today" style={{ left: `${today}%` }} />}
        </div>

        {/* Phases and weeks across the top. */}
        <div className="wk-row pb-1" aria-hidden="true">
          <span className="lettering text-ink-soft">Stage</span>
          <div className="relative h-11">
            {phases.map((p) => (
              <span
                key={p.id}
                className="wk-phase lettering text-ink"
                data-phase={p.id}
                style={bar(p.from, p.to)}
                title={p.label}
              >
                {p.id === "pre-construction" ? (
                  <>
                    <span className="xl:hidden">Design</span>
                    <span className="max-xl:hidden">{p.label}</span>
                  </>
                ) : p.id === "close-out" ? (
                  ""
                ) : (
                  p.label
                )}
              </span>
            ))}
            {labelled.map((w) => (
              <span
                key={w.label}
                className={`lettering absolute top-6 pl-1 whitespace-nowrap text-ink-soft ${
                  w.clock === "construction" && w.week % 8 !== 0 && w.week !== 1 ? "hidden xl:inline" : ""
                }`}
                style={{ left: `${at(w.start)}%` }}
              >
                {w.label}
              </span>
            ))}
            {current && (
              <span
                className="absolute top-6 z-10 -translate-x-1/2 rounded-full bg-brick px-1.5 text-13 font-semibold whitespace-nowrap text-paper"
                style={{ left: `${today}%` }}
              >
                {current.label}
              </span>
            )}
          </div>
          <span className="wk-dates lettering text-right text-ink-soft">Expected</span>
        </div>

        <ol className="relative">
          {stages.map((stage, index) => {
            const state = stageState(stage);
            const lockedFirst = stage.id === firstLocked;
            const added = stage.extraDays > 0 && stage.expectedEnd > stage.plannedEnd;
            const label = addedLabel(stages, index);
            const newPhase = index > 0 && stages[index - 1].phase !== stage.phase;
            const opening = instalments.filter((i) => instalmentOpens(i) === stage.id);
            const words =
              state === "done"
                ? `done ${formatDate(stage.doneOn ?? stage.expectedEnd)}`
                : state === "current"
                  ? `under way, ${stage.percent}% done, expected ${formatDate(stage.expectedEnd)}`
                  : state === "held"
                    ? "waiting on its instalment"
                    : `expected ${formatDate(stage.expectedStart)} to ${formatDate(stage.expectedEnd)}`;
            return (
              <Fragment key={stage.id}>
                {/* Accounts & Finance's rows on the sheet: the instalment that opens this stage. */}
                {opening.map((i, k) => {
                  const ahead = instalmentAhead(i);
                  return (
                    <li key={`i${i.n}`} className={`wk-row wk-inst ${newPhase && k === 0 ? "mt-1.5" : ""}`}>
                      <span className="flex min-w-0 items-center gap-2.5" title={`${i.label} · ${i.percent}%`}>
                        <span className="w-[22px] flex-none" aria-hidden="true" />
                        <span className={`truncate text-13 ${ahead ? "text-ink" : "text-ink-soft"}`} aria-hidden="true">
                          {i.n === 0 ? "Sign-up" : i.label}
                          <span className="figure text-ink-soft"> · {i.percent}%</span>
                        </span>
                        <span className="sr-only">{instalmentWords(i)}</span>
                      </span>
                      <div className="wk-lane" aria-hidden="true">
                        {i.clock === "construction" && (
                          <span className="wk-inst-bar" data-ahead={ahead} style={bar(timeline.constructionStart, i.dueEnd)} />
                        )}
                        <span
                          className="wk-mark"
                          style={{ left: `${at(addDays(i.dueStart, MID_WEEK))}%` }}
                          title={`${i.label} · ${dueWeekLabel(i)} · ${i.status}`}
                        >
                          <Diamond tone={instalmentTone(i)} small />
                        </span>
                      </div>
                      <span
                        className="wk-dates figure text-right text-13 whitespace-nowrap text-ink-soft"
                        aria-hidden="true"
                      >
                        {when(i.expectedDate)}
                      </span>
                    </li>
                  );
                })}
                <li
                  className={`glass-row wk-row py-1.5 ${state === "current" ? "bg-white/45" : ""} ${
                    newPhase && opening.length === 0 ? "mt-1.5" : ""
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5" title={stage.name}>
                    <StageMark stage={stage} lockedFirst={lockedFirst} />
                    <span
                      className={`line-clamp-2 min-w-0 text-15 leading-snug ${state === "upcoming" || state === "held" ? "text-ink-soft" : "text-ink"} ${
                        state === "current" ? "font-semibold" : ""
                      }`}
                    >
                      {stageTitle(stage)}
                    </span>
                    {label > 0 && (
                      <span className="late-text flex-none text-13">
                        +{label}d<span className="sr-only"> from your changes</span>
                      </span>
                    )}
                    <span className="sr-only">
                      , {stage.name}, {weekSpan(stage)}, {lockedFirst ? "opens when its instalment is received, " : ""}
                      {words}
                    </span>
                  </span>

                  <div className="wk-lane" aria-hidden="true">
                    <span className="wk-bar" data-kind="planned" style={bar(stage.plannedStart, stage.plannedEnd)} />
                    <span
                      className="wk-bar"
                      data-kind="expected"
                      data-state={state}
                      data-locked={stage.locked}
                      style={bar(stage.expectedStart, added ? stage.plannedEnd : stage.expectedEnd)}
                    >
                      {state === "current" && (
                        <span className="wk-fill" style={{ transform: `scaleX(${stage.percent / 100})` }} />
                      )}
                    </span>
                    {added && (
                      <span className="wk-bar" data-kind="added" style={bar(addDays(stage.plannedEnd, 1), stage.expectedEnd)} />
                    )}
                  </div>

                  <span className="wk-dates figure text-right text-13 whitespace-nowrap text-ink">
                    {when(stage.doneOn ?? stage.expectedEnd)}
                  </span>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
