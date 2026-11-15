import type { PlanStageState, PlanTaskView, PlanView } from "@/lib/workflow-plan";
import type { WorkflowClock } from "@/lib/workflow-template";
import type { Tone } from "@/lib/portal";
import { day } from "./glass-ui";

// The plan, drawn and said the same way on the studio and business development screens:
// week labels ("P2–P5", "W16–W19"), whether a task falls in this week, and a strip that
// lays every stage on the workbook's week grid (pre-construction weeks 1 to 7, then
// construction weeks 1 to 50; pre-construction week 8 is construction week 1).

const PRE_SLOTS = 7;
const SLOTS = PRE_SLOTS + 50;

/** Where a week sits on the strip, counted from pre-construction week 1. */
function slotOf(clock: WorkflowClock, week: number): number {
  return clock === "pre" ? Math.min(week, PRE_SLOTS + 1) - 1 : PRE_SLOTS + week - 1;
}

/** "P1", "P2–P5", "W16–W19". */
export function weeksLabel(clock: WorkflowClock, from: number, to: number): string {
  const p = clock === "pre" ? "P" : "W";
  return from === to ? `${p}${from}` : `${p}${from}–${to}`;
}

/** The week the plan is in, on a clock. */
export function weekNow(plan: Pick<PlanView, "todayWeek" | "todayPreWeek">, clock: WorkflowClock): number {
  return clock === "pre" ? plan.todayPreWeek : plan.todayWeek;
}

/** "Week 18", "Pre week 7" before construction, or "Starts 16 Nov" before the plan's first week. */
export function weekNowLabel(plan: Pick<PlanView, "todayWeek" | "todayPreWeek" | "preStart">): string {
  if (plan.todayWeek >= 1) return `Week ${plan.todayWeek}`;
  if (plan.todayPreWeek < 1) return `Starts ${day(plan.preStart)}`;
  return `Pre week ${plan.todayPreWeek}`;
}

/** The task's planned weeks include this week. */
export function inWeek(plan: Pick<PlanView, "todayWeek" | "todayPreWeek">, t: Pick<PlanTaskView, "clock" | "fromWeek" | "toWeek">): boolean {
  const w = weekNow(plan, t.clock);
  return w >= t.fromWeek && w <= t.toWeek;
}

/** Open work on the plan for now: in this week's window, or past its planned end. */
export function dueNow(plan: PlanView, t: PlanTaskView): boolean {
  if (t.state === "done" || t.state === "locked") return false;
  return t.late || inWeek(plan, t);
}

/** "3 days late". */
export function lateWords(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"} late`;
}

/** A plan task's state as one chip, for tasks with no client design item. */
export function planChip(plan: PlanView, t: PlanTaskView): { tone: Tone; words: string } {
  if (t.state === "done") return { tone: "done", words: t.doneOn ? `Done ${day(t.doneOn)}` : "Done" };
  if (t.state === "locked") return { tone: "locked", words: "Locked" };
  if (t.late) return { tone: "late", words: lateWords(t.daysLate) };
  if (t.state === "in-progress") return { tone: "progress", words: t.percent > 0 ? `${t.percent}%` : "Under way" };
  if (inWeek(plan, t)) return { tone: "waiting", words: "This week" };
  return { tone: "locked", words: "To do" };
}

export const STAGE_TONE: Record<PlanStageState, Tone> = {
  done: "done",
  current: "progress",
  held: "late",
  upcoming: "locked",
};

export const STAGE_WORDS: Record<PlanStageState, string> = {
  done: "Done",
  current: "Under way",
  held: "Held",
  upcoming: "Upcoming",
};

const BAR: Record<Tone, string> = {
  done: "bg-kota",
  progress: "bg-laterite",
  waiting: "bg-brass",
  late: "bg-brick",
  locked: "bg-ink/25",
};

export type StripRow = {
  id: string;
  label: string;
  clock: WorkflowClock;
  from: number;
  to: number;
  tone: Tone;
  start: string;
  end: string;
};

const AXIS: { label: string; slot: number }[] = [
  { label: "P1", slot: 0 },
  { label: "W1", slot: slotOf("construction", 1) },
  { label: "W13", slot: slotOf("construction", 13) },
  { label: "W26", slot: slotOf("construction", 26) },
  { label: "W38", slot: slotOf("construction", 38) },
  { label: "W50", slot: slotOf("construction", 50) },
];

const pct = (slot: number) => `${(slot / SLOTS) * 100}%`;

/**
 * Every stage as a bar on the week grid, with a line at this week. On a phone the label
 * sits over its bar; from 640 px it stands to the left.
 */
export function PlanStrip({
  rows,
  today,
  label,
}: {
  rows: StripRow[];
  /** This week, when the plan has one. */
  today?: { clock: WorkflowClock; week: number };
  label: string;
}) {
  const todaySlot = today ? slotOf(today.clock, today.week) + 0.5 : null;
  const marker =
    todaySlot !== null && todaySlot >= 0 && todaySlot <= SLOTS ? (
      <span aria-hidden="true" className="absolute inset-y-[-3px] w-0.5 rounded-full bg-rosewood/70" style={{ left: pct(todaySlot) }} />
    ) : null;
  return (
    <figure className="grid gap-1" aria-label={label}>
      <ol className="grid gap-1.5 sm:gap-1">
        {rows.map((r) => {
          const from = slotOf(r.clock, r.from);
          const to = slotOf(r.clock, r.to) + 1;
          return (
            <li key={r.id} className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
              <p className="flex min-w-0 items-baseline justify-between gap-2 text-13">
                <span className="truncate text-ink">{r.label}</span>
                <span className="figure shrink-0 text-ink-soft">{weeksLabel(r.clock, r.from, r.to)}</span>
              </p>
              <div className="relative h-3 rounded-full bg-ink/8" title={`${day(r.start)} – ${day(r.end)}`}>
                <span
                  className={`absolute inset-y-0 rounded-full ${BAR[r.tone]}`}
                  style={{ left: pct(from), width: `max(6px, ${((to - from) / SLOTS) * 100}%)` }}
                />
                {marker}
                <span className="sr-only">{`${day(r.start)} to ${day(r.end)}`}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <div aria-hidden="true" className="grid gap-x-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <span className="hidden sm:block" />
        <div className="relative h-5">
          {AXIS.map((a, i) => (
            <span
              key={a.label}
              className={`figure absolute top-0.5 text-13 text-ink-soft ${i === AXIS.length - 1 ? "-translate-x-full" : i === 0 ? "" : "-translate-x-1/2"}`}
              style={{ left: pct(i === AXIS.length - 1 ? a.slot + 1 : a.slot) }}
            >
              {a.label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
