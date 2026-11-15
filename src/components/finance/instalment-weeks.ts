import { TODAY } from "@/lib/demo-data";
import { addDays, formatShortDate } from "@/lib/format";
import type { PaymentStageView } from "@/lib/portal";
import { mondayOf } from "@/lib/workflow-plan";

// Accounts & Finance works to the instalment weeks of each project's plan (the workbook's
// "Project Schedule & Tracker": instalment 1 in construction week 1, then weeks 8, 12, 14,
// 18, 20, 25, 27, 36 and 41). These helpers only sort the firm's payment stages into
// calendar weeks from today, so one board can show every project side by side; the due
// dates themselves come from the plan (PaymentStageView.expectedDueDate).

export type LaneId = "overdue" | "this" | `w${number}`;

export type WeekLane = {
  id: LaneId;
  /** "Overdue", "This week", "16 Nov". */
  label: string;
  /** Monday of the week; null for overdue. */
  start: string | null;
  items: PaymentStageView[];
  /** With GST, still to come. */
  total: number;
};

/** Monday of the demo's week. */
export const THIS_MONDAY = mondayOf(TODAY);

/** Not received in full yet. */
export function unpaid(stages: PaymentStageView[]): PaymentStageView[] {
  return stages.filter((s) => s.state !== "paid");
}

/** Overdue: a letter past its due date, or a due week gone with no letter raised. */
export function isOverdue(s: PaymentStageView): boolean {
  if (s.state === "due") return s.overdueDays > 0;
  if (s.state === "work-done") return s.expectedDueDate < THIS_MONDAY;
  return false;
}

/**
 * The Monday of the week an unpaid instalment belongs to on the board. Anything finance can
 * act on now (a letter to raise, money to confirm) or whose week has gone is this week.
 */
export function weekOf(s: PaymentStageView): string {
  if (s.state === "work-done" || s.state === "client-paid") return THIS_MONDAY;
  const monday = mondayOf(s.expectedDueDate);
  return monday < THIS_MONDAY ? THIS_MONDAY : monday;
}

/** Overdue, this week and the next `ahead` weeks; `later` counts what falls after. */
export function weekLanes(stages: PaymentStageView[], ahead = 4): { overdue: WeekLane; lanes: WeekLane[]; later: number } {
  const open = unpaid(stages);
  const overdueItems = open.filter(isOverdue).sort((a, b) => b.overdueDays - a.overdueDays);
  const rest = open.filter((s) => !isOverdue(s));
  const lanes: WeekLane[] = [];
  for (let i = 0; i <= ahead; i++) {
    const start = addDays(THIS_MONDAY, i * 7);
    const items = rest.filter((s) => weekOf(s) === start).sort(byAction);
    lanes.push({
      id: i === 0 ? "this" : `w${i}`,
      label: i === 0 ? "This week" : i === 1 ? "Next week" : formatShortDate(start),
      start,
      items,
      total: sum(items),
    });
  }
  const last = addDays(THIS_MONDAY, ahead * 7);
  const later = rest.filter((s) => weekOf(s) > last).length;
  return {
    overdue: { id: "overdue", label: "Overdue", start: null, items: overdueItems, total: sum(overdueItems) },
    lanes,
    later,
  };
}

/** What finance acts on first: money to confirm, then letters to raise, then letters out, then the rest. */
const ACTION_ORDER: Record<PaymentStageView["state"], number> = {
  "client-paid": 0,
  "work-done": 1,
  due: 2,
  "in-progress": 3,
  open: 4,
  locked: 5,
  paid: 6,
};

export function byAction(a: PaymentStageView, b: PaymentStageView): number {
  return ACTION_ORDER[a.state] - ACTION_ORDER[b.state] || a.expectedDueDate.localeCompare(b.expectedDueDate);
}

export function sum(list: PaymentStageView[]): number {
  return list.reduce((t, s) => t + s.outstanding, 0);
}

/** "Inst 5", or "Sign-up". */
export function instShort(s: PaymentStageView): string {
  return s.n === 0 ? "Sign-up" : `Inst ${s.n}`;
}

/** "W18", the project's own week on its tracker; "P1" before construction. */
export function weekShort(s: PaymentStageView): string {
  return `${s.dueClock === "construction" ? "W" : "P"}${s.dueWeek}`;
}
