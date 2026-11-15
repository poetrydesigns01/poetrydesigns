/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { TimelineView, Tone } from "@/lib/portal";
import { WORKFLOW_TEMPLATE, WORKFLOW_TRACKS, type WorkflowClock, type WorkflowStage } from "@/lib/workflow-template";

// A week-by-week chart: a label column, then one column per week (pre-construction weeks 1
// to 7, then construction weeks 1 to 50). Each row is a stage drawn as a bar: the planned
// weeks as a pale outline, where it stands as a filled bar, and any days it runs past plan
// in brick. Instalments sit on their own row as numbered dots, and today is a line. On a
// phone the chart scrolls sideways inside its panel, label column held, and opens on today.

export type BarTone = "done" | "current" | "progress" | "waiting" | "late" | "locked" | "plan" | "track";

export type GanttBar = { from: number; to: number; tone: BarTone };

export type GanttRow = {
  id: string;
  /** Short words for the label column. */
  label: string;
  /** "M4" in front of the label. */
  tag?: string;
  /** Planned weeks, drawn as an outline. */
  planned?: { from: number; to: number };
  bars: GanttBar[];
  /** At the right of the label: "+12 d". */
  aside?: ReactNode;
  strong?: boolean;
  /** For a screen reader: "Milestone 4, under way, weeks 16 to 19". */
  sr: string;
};

export type GanttMarker = { col: number; text: string; tone: Tone; title: string };

export type GanttColumn = { clock: WorkflowClock; week: number; label: string; current?: boolean };

const FILL: Record<BarTone, string> = {
  done: "bg-kota",
  current: "bg-rosewood",
  progress: "bg-laterite",
  waiting: "bg-brass",
  late: "bg-brick",
  locked: "bg-ink/20",
  plan: "bg-rosewood/70",
  track: "bg-ink/15",
};

const DOT: Record<Tone, string> = {
  done: "bg-kota text-lime",
  progress: "bg-laterite text-lime",
  waiting: "bg-brass text-lime",
  late: "bg-brick text-lime",
  locked: "bg-white/70 text-ink-soft ring-1 ring-ink/20",
};

/** The template's week columns: pre-construction 1 to 7, then construction 1 to the last stage week. */
export function templateColumns(): GanttColumn[] {
  const cols: GanttColumn[] = [];
  for (let w = 1; w < WORKFLOW_TEMPLATE.overlap.pre; w++) cols.push({ clock: "pre", week: w, label: `P${w}` });
  const last = Math.max(...WORKFLOW_TEMPLATE.stages.filter((s) => s.clock === "construction").map((s) => s.to));
  for (let w = 1; w <= last; w++) cols.push({ clock: "construction", week: w, label: `W${w}` });
  return cols;
}

/** The column of a week on a clock; pre-construction week 8 is construction week 1. */
export function colOfWeek(cols: GanttColumn[], clock: WorkflowClock, week: number): number {
  const i = cols.findIndex((c) => c.clock === clock && c.week === week);
  if (i >= 0) return i;
  if (clock === "pre") return cols.findIndex((c) => c.clock === "construction" && c.week === week - WORKFLOW_TEMPLATE.overlap.pre + 1);
  return cols.length - 1;
}

/**
 * "P2–5", "W16–19", "W18". Project Initiation keeps the workbook's own pre-construction
 * week, "P8" (it overlaps construction week 1), as the client's timeline prints it.
 */
export function weeksWords(clock: WorkflowClock, from: number, to: number): string {
  const head = clock === "pre" ? "P" : "W";
  return from === to ? `${head}${from}` : `${head}${from}–${to}`;
}

/** The row label of a stage: milestones carry their number as a tag. */
export function stageLabel(s: Pick<WorkflowStage, "milestone" | "short">): { tag?: string; label: string } {
  return s.milestone !== null ? { tag: `M${s.milestone}`, label: s.short } : { label: s.short };
}

/** The template itself: every stage on its planned weeks, instalments on their weeks. */
export function templateGantt(): { cols: GanttColumn[]; rows: GanttRow[]; markers: GanttMarker[] } {
  const cols = templateColumns();
  const rows: GanttRow[] = WORKFLOW_TEMPLATE.stages.map((s) => {
    const from = colOfWeek(cols, s.clock, s.from);
    const to = colOfWeek(cols, s.clock, s.to);
    return {
      id: s.id,
      ...stageLabel(s),
      bars: [{ from, to, tone: s.phase === "construction" ? "progress" : s.phase === "close-out" ? "done" : "plan" }],
      sr: `${s.name}, ${weeksWords(s.clock, s.from, s.to)}`,
    };
  });
  for (const t of WORKFLOW_TRACKS)
    rows.push({
      id: t.id,
      label: t.name,
      bars: [{ from: colOfWeek(cols, t.clock, t.from), to: colOfWeek(cols, t.clock, t.to), tone: "track" }],
      sr: `${t.name}, ${weeksWords(t.clock, t.from, t.to)}`,
    });
  const markers: GanttMarker[] = WORKFLOW_TEMPLATE.instalments.map((i) => ({
    col: colOfWeek(cols, i.clock, i.week),
    text: i.n === 0 ? "S" : String(i.n),
    tone: "waiting",
    title: `${i.label} · ${i.percent}% · ${weeksWords(i.clock, i.week, i.week)}`,
  }));
  return { cols, rows, markers };
}

const STATE_TONE = { done: "done", current: "current", held: "waiting", upcoming: "locked" } as const;
const STATE_WORDS = { done: "done", current: "under way", held: "held for payment", upcoming: "to come" } as const;

/** Money in is kota, money asked for brass (brick when overdue), locked muted. */
function instalmentTone(i: TimelineView["instalments"][number]): Tone {
  if (i.state === "paid") return "done";
  if (i.tone === "late") return "late";
  if (i.state === "due" || i.state === "client-paid" || i.state === "work-done") return "waiting";
  if (i.state === "locked") return "locked";
  return "progress";
}

/** A project's timeline as rows: planned outline, where it stands, extra days in brick. */
export function projectGantt(t: TimelineView): { cols: GanttColumn[]; rows: GanttRow[]; markers: GanttMarker[]; today: number } {
  const cols: GanttColumn[] = t.weeks.map((w) => ({ clock: w.clock, week: w.week, label: w.label, current: w.current }));
  // The column a date falls in, read off the plan's own weeks.
  const colOfDate = (date: string): number => {
    if (date < t.weeks[0].start) return 0;
    const i = t.weeks.findIndex((w) => w.start <= date && date <= w.end);
    return i >= 0 ? i : t.weeks.length - 1;
  };
  const rows: GanttRow[] = t.stages.map((s) => {
    const pFrom = colOfWeek(cols, s.clock, s.fromWeek);
    const pTo = colOfWeek(cols, s.clock, s.toWeek);
    const eFrom = colOfDate(s.expectedStart);
    const eTo = Math.max(eFrom, colOfDate(s.expectedEnd));
    const bars: GanttBar[] = [];
    const tone = STATE_TONE[s.state];
    // A finished stage is one bar, however long it took; an open one shows its overrun in brick.
    if (s.state === "done" || eTo <= pTo) bars.push({ from: eFrom, to: eTo, tone });
    else {
      if (eFrom <= pTo) bars.push({ from: eFrom, to: pTo, tone });
      bars.push({ from: Math.max(eFrom, pTo + 1), to: eTo, tone: "late" });
    }
    const words = s.locked && s.state === "upcoming" ? "locked" : STATE_WORDS[s.state];
    return {
      id: s.id,
      ...stageLabel(s),
      planned: { from: pFrom, to: pTo },
      bars,
      strong: s.state === "current" || s.state === "held",
      aside: s.extraDays > 0 ? <span className="late-text text-13 whitespace-nowrap">+{s.extraDays} d</span> : undefined,
      sr: `${s.name}, ${words}, ${weeksWords(s.clock, s.fromWeek, s.toWeek)}${s.extraDays > 0 ? `, ${s.extraDays} extra days` : ""}`,
    };
  });
  for (const tr of WORKFLOW_TRACKS)
    rows.push({
      id: tr.id,
      label: tr.name,
      bars: [{ from: colOfWeek(cols, tr.clock, tr.from), to: colOfWeek(cols, tr.clock, tr.to), tone: "track" }],
      sr: `${tr.name}, ${weeksWords(tr.clock, tr.from, tr.to)}`,
    });
  const markers: GanttMarker[] = t.instalments.map((i) => ({
    col: colOfDate(i.expectedDate),
    text: i.n === 0 ? "S" : String(i.n),
    tone: instalmentTone(i),
    title: `${i.label} · ${i.status}`,
  }));
  return { cols, rows, markers, today: cols.findIndex((c) => c.current) };
}

/** Header spans: "Pre" over the pre-construction weeks, then W1, W5, W10 ... */
function headerSpans(cols: GanttColumn[]): { from: number; to: number; label: string }[] {
  const starts: { at: number; label: string }[] = [];
  cols.forEach((c, i) => {
    if (c.clock === "pre" && c.week === 1) starts.push({ at: i, label: "Pre" });
    else if (c.clock === "construction" && (c.week === 1 || c.week % 5 === 0)) starts.push({ at: i, label: c.label });
  });
  const spans = starts.map((s, k) => ({ from: s.at, to: (starts[k + 1]?.at ?? cols.length) - 1, label: s.label }));
  // A last span too narrow for its label joins the one before it.
  const last = spans[spans.length - 1];
  if (spans.length > 1 && last.to - last.from < 2) {
    spans.pop();
    spans[spans.length - 1].to = last.to;
  }
  return spans;
}

export function Gantt({
  caption,
  cols,
  rows,
  markers,
  today = -1,
}: {
  caption: string;
  cols: GanttColumn[];
  rows: GanttRow[];
  markers: GanttMarker[];
  today?: number;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const todayLine = useRef<HTMLSpanElement>(null);
  // Open on today: a phone shows a few weeks at a time. The chart can mount before the page
  // is shown, so it waits until it has a width.
  useEffect(() => {
    const box = scroller.current;
    const line = todayLine.current;
    if (!box || !line) return;
    const center = () => {
      if (box.clientWidth === 0) return false;
      if (box.scrollWidth > box.clientWidth) box.scrollLeft = Math.max(0, line.offsetLeft - box.clientWidth / 2);
      return true;
    };
    if (center()) return;
    const watch = new ResizeObserver(() => {
      if (center()) watch.disconnect();
    });
    watch.observe(box);
    return () => watch.disconnect();
  }, [today]);

  const n = cols.length;
  const spans = headerSpans(cols);
  const markerRow = rows.length + 2;
  const lastRow = markerRow + 1;
  const col = (i: number) => i + 2;

  return (
    <div ref={scroller} className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin]" role="group" aria-label={caption}>
      <div
        className="relative grid [--gantt-label:8rem] sm:[--gantt-label:12rem]"
        style={{
          gridTemplateColumns: `var(--gantt-label) repeat(${n}, minmax(0.75rem, 1fr))`,
          gridTemplateRows: `1.75rem repeat(${rows.length}, 2.25rem) 2.25rem`,
          minWidth: `calc(var(--gantt-label) + ${n * 0.75}rem)`,
        }}
      >
        {/* Week guides at each header label. */}
        {spans.map((s) => (
          <span
            key={`g-${s.from}`}
            aria-hidden="true"
            className="pointer-events-none w-px justify-self-start bg-ink/10"
            style={{ gridColumn: col(s.from), gridRow: `1 / ${lastRow}` }}
          />
        ))}

        {/* Header */}
        <span className="sticky left-0 z-20 shadow-[-4px_0_0_0_var(--color-sand-2)] bg-sand-2" style={{ gridColumn: 1, gridRow: 1 }} aria-hidden="true" />
        {spans.map((s) => (
          <span
            key={`h-${s.from}`}
            aria-hidden="true"
            className="lettering self-center truncate pl-1 text-ink-soft"
            style={{ gridColumn: `${col(s.from)} / ${col(s.to) + 1}`, gridRow: 1 }}
          >
            {s.label}
          </span>
        ))}

        {/* Today */}
        {today >= 0 && (
          <span
            ref={todayLine}
            aria-hidden="true"
            className="pointer-events-none z-10 w-0.5 justify-self-center rounded-full bg-laterite"
            style={{ gridColumn: col(today), gridRow: `1 / ${lastRow}` }}
          />
        )}

        {/* Stages */}
        <ul className="contents">
          {rows.map((r, k) => {
            const row = k + 2;
            return (
              <li key={r.id} className="contents">
                <span
                  className="sticky left-0 z-20 shadow-[-4px_0_0_0_var(--color-sand-2)] flex min-w-0 items-center gap-1.5 border-t border-ink/10 bg-sand-2 pr-2 pl-1"
                  style={{ gridColumn: 1, gridRow: row }}
                  title={r.label}
                >
                  {r.tag && <span className="figure shrink-0 text-13 font-semibold text-ink">{r.tag}</span>}
                  <span className={`min-w-0 flex-1 truncate text-13 ${r.strong ? "font-semibold text-ink" : "text-ink-soft"}`}>
                    {r.label}
                  </span>
                  {r.aside}
                  <span className="sr-only">{r.sr}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`border-t border-ink/10 ${r.strong ? "bg-white/40" : ""}`}
                  style={{ gridColumn: `2 / ${n + 2}`, gridRow: row }}
                />
                {r.planned && (
                  <span
                    aria-hidden="true"
                    className="h-4 self-center rounded-full border border-ink/25 bg-white/50"
                    style={{ gridColumn: `${col(r.planned.from)} / ${col(r.planned.to) + 1}`, gridRow: row }}
                  />
                )}
                {r.bars.map((b, j) => (
                  <span
                    key={j}
                    aria-hidden="true"
                    className={`mx-0.5 h-2 self-center rounded-full ${FILL[b.tone]}`}
                    style={{ gridColumn: `${col(b.from)} / ${col(b.to) + 1}`, gridRow: row }}
                  />
                ))}
              </li>
            );
          })}
        </ul>

        {/* Instalments */}
        <span
          className="sticky left-0 z-20 shadow-[-4px_0_0_0_var(--color-sand-2)] flex items-center border-t border-ink/10 bg-sand-2 pl-1 text-13 font-semibold text-ink"
          style={{ gridColumn: 1, gridRow: markerRow }}
        >
          Instalments
        </span>
        <span aria-hidden="true" className="border-t border-ink/10" style={{ gridColumn: `2 / ${n + 2}`, gridRow: markerRow }} />
        <ul className="contents">
          {markers.map((m) => (
            <li
              key={`${m.text}-${m.col}`}
              title={m.title}
              className={`figure z-10 inline-grid size-5 place-items-center self-center justify-self-center rounded-full text-13 font-semibold ${DOT[m.tone]}`}
              style={{ gridColumn: col(m.col), gridRow: markerRow }}
            >
              <span aria-hidden="true">{m.text}</span>
              <span className="sr-only">{m.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The key under a chart: a dot and a word each. */
export function GanttKey({ items }: { items: { tone: BarTone; words: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 px-1" aria-label="Key">
      {items.map((i) => (
        <li key={i.words} className="inline-flex items-center gap-1.5 text-13 text-ink-soft">
          <span aria-hidden="true" className={`block h-2 w-4 rounded-full ${FILL[i.tone]}`} />
          {i.words}
        </li>
      ))}
    </ul>
  );
}
