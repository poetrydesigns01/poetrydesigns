"use client";

import { useFirm } from "@/lib/demo-store";
import { dayCount, formatShortDate } from "@/lib/format";
import { WORKFLOW_TEMPLATE } from "@/lib/workflow-template";
import type { DesignItemView, PaymentStageView, SiteStageView, TimelineStage, TimelineView, Tone } from "@/lib/portal";

// Everything the client home and timeline read, worked out once from the firm. The client
// only ever sees her own house, so the project is fixed. Weeks and dates come from the plan
// (Poetry's workflow template); nothing here counts calendar weeks itself.

export const PROJECT = "iyer" as const;

/** The one most urgent thing for the client, as the home's next action card shows it. */
export type NextAction = {
  key: string;
  /** The verb line: "Pay instalment 5". */
  title: string;
  /** What it is about: "Unlocks milestone 5". */
  subject: string;
  chip: { tone: Tone; words: string };
  href: string;
  cta: string;
};

/** A task of the milestone in hand, as the home shows it under the house. */
export type ProgressTask = {
  id: string;
  title: string;
  percent: number;
  state: "not-started" | "in-progress" | "done";
  /** A selection the client still has to approve. */
  waitingForClient: boolean;
};

export type Progress = {
  /** The construction milestone in hand (1 to 10), or null before construction and after it. */
  milestone: number | null;
  /** "Milestone 4", or the workflow stage before construction ("Final Approval & Mobilization"). */
  label: string;
  /** Plain words: "First floor block work". */
  stageName: string;
  /** Milestones finished, 0 to 10. */
  done: number;
  /** Whole percent built, each milestone weighted by its weeks on the plan. */
  percent: number;
  /** Where each milestone ends on the thermometer, in percent (the last is 100). */
  ticks: number[];
  /** The milestone in hand is due to start but waits for its instalment. */
  held: boolean;
  /** The instalment it waits for, when held. */
  heldBy: number | null;
  /** The milestone's design and engineering tasks from the workflow. */
  tasks: ProgressTask[];
  /** Today's construction week and the last week on the plan. */
  week: number;
  weeks: number;
};

function paymentChip(stage: PaymentStageView): { tone: Tone; words: string } {
  if (stage.overdueDays > 0) return { tone: "late", words: `Overdue ${dayCount(stage.overdueDays)}` };
  if (stage.state === "due" && stage.dueDate) return { tone: "waiting", words: `Due ${formatShortDate(stage.dueDate)}` };
  return { tone: stage.tone, words: stage.status };
}

function designActions(items: DesignItemView[]): NextAction[] {
  // In the workflow's order: floor plan drafts, elevations, approvals, estimate, then the
  // selections milestone by milestone.
  const waiting = items.filter((i) => i.status === "waiting");
  return waiting.map((item) => ({
    key: `design:${item.id}`,
    title: item.milestone ? `Approve ${item.title.toLowerCase()}` : "Approve design",
    subject: item.milestone ? `Milestone ${item.milestone}` : item.title,
    chip: {
      tone: "waiting",
      words: [item.version ? `v${item.version}` : "", item.neededBy ? `by ${formatShortDate(item.neededBy)}` : ""]
        .filter(Boolean)
        .join(" · "),
    },
    href: "/client/designs",
    cta: "Review",
  }));
}

/** The instalment's subject line: the milestone it opens. */
function unlockWords(p: PaymentStageView): string {
  return p.unlocks ? `Unlocks milestone ${p.unlocks}` : p.name;
}

export function nextActions(
  payments: PaymentStageView[],
  items: DesignItemView[],
  timeline: TimelineView | null,
): NextAction[] {
  const due = payments
    .filter((p) => p.canMarkPaid)
    .sort((a, b) => b.overdueDays - a.overdueDays || a.n - b.n)
    .map<NextAction>((p) => ({
      key: `pay:${p.n}`,
      title: p.n === 0 ? "Pay sign-up" : `Pay instalment ${p.n}`,
      subject: unlockWords(p),
      chip: paymentChip(p),
      href: "/client/payments",
      cta: "Open payment",
    }));
  const overdue = due.filter((a) => a.chip.tone === "late");
  const onTime = due.filter((a) => a.chip.tone !== "late");
  const changes = (timeline?.pending ?? []).map<NextAction>((c) => ({
    key: `change:${c.id}`,
    title: "Decide on change",
    subject: c.title,
    chip: c.days > 0 ? { tone: "late", words: `+${dayCount(c.days)}` } : { tone: "waiting", words: "Waiting" },
    href: "/client/changes",
    cta: "Review change",
  }));
  const letters = payments
    .filter((p) => p.canRequestLetter)
    .map<NextAction>((p) => ({
      key: `letter:${p.n}`,
      title: "Request demand letter",
      subject: `${p.instalmentLabel} · ${p.dueWeekLabel}`,
      chip: { tone: "waiting", words: p.status },
      href: "/client/payments",
      cta: "Open payments",
    }));
  return [...overdue, ...onTime, ...designActions(items), ...changes, ...letters];
}

/** The construction milestones on the plan, in order. */
export function milestoneStages(timeline: TimelineView | null): TimelineStage[] {
  return (timeline?.stages ?? []).filter((s) => s.milestone !== null);
}

function weeksOf(stage: TimelineStage): number {
  return Math.max(1, stage.toWeek - stage.fromWeek + 1);
}

export function progressOf(timeline: TimelineView | null, site: SiteStageView | null): Progress {
  const milestones = milestoneStages(timeline);
  const total = milestones.reduce((sum, s) => sum + weeksOf(s), 0) || 1;
  const built = milestones.reduce((sum, s) => sum + weeksOf(s) * (s.state === "done" ? 1 : s.percent / 100), 0);
  const ticks: number[] = [];
  milestones.reduce((sum, s) => {
    const end = sum + weeksOf(s);
    ticks.push((end / total) * 100);
    return end;
  }, 0);

  // The milestone in hand: the one being built, else the one due to start but held for its
  // instalment, else (before construction) the workflow stage under way.
  const inHand =
    milestones.find((s) => s.state === "current") ?? milestones.find((s) => s.state === "held") ?? null;
  const before = !inHand && milestones.every((s) => s.state !== "done");
  const preStage = before ? (timeline?.stages ?? []).find((s) => s.state === "current" || s.state === "held") : undefined;
  const allDone = milestones.length > 0 && milestones.every((s) => s.state === "done");
  const closing = allDone ? (timeline?.stages ?? []).find((s) => s.phase === "close-out" && s.state !== "done") : undefined;

  const shown = inHand ?? preStage ?? closing ?? null;
  const tasks: ProgressTask[] =
    inHand && site && site.n === inHand.milestone
      ? site.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          percent: t.percent,
          state: t.state,
          waitingForClient: t.waitingForClient,
        }))
      : [];
  // The workbook's tracker runs 48 construction weeks; inspection and handover have no weeks
  // of their own there (the plan's W49 and W50 are a decision to confirm with Poetry), so the
  // client reads "of 48" and the week line hides once building is over.
  const lastWeek = WORKFLOW_TEMPLATE.constructionWeeks;
  const today = Math.max(0, timeline?.todayWeek ?? 0);

  return {
    milestone: inHand?.milestone ?? null,
    label: shown ? shown.name : allDone ? "Handed over" : "Before construction",
    stageName: shown ? shown.short : allDone ? "Your home is ready" : "",
    done: milestones.filter((s) => s.state === "done").length,
    percent: Math.round((built / total) * 100),
    ticks,
    held: inHand?.state === "held",
    heldBy: inHand?.state === "held" ? inHand.milestone : null,
    tasks,
    week: today <= lastWeek ? today : 0,
    weeks: lastWeek,
  };
}

export function useClientHome() {
  const firm = useFirm();
  const payments = firm.payments(PROJECT);
  const designStages = firm.designStages(PROJECT);
  const timeline = firm.timeline(PROJECT);
  const site = firm.siteStage(PROJECT);
  const project = firm.project(PROJECT);
  // Only stages that are open can be decided, in the workflow's order.
  const items = designStages.flatMap((s) => (s.locked ? [] : s.items));

  const progress = progressOf(timeline, site);
  const actions = nextActions(payments, items, timeline);
  const paid = payments.reduce((total, p) => total + p.received, 0);
  const billable = payments.reduce((total, p) => total + p.total, 0);
  const nextPayment = payments.find((p) => p.state !== "paid") ?? null;

  const frontElevation =
    designStages.flatMap((s) => s.items).find((i) => i.id === "pd-elev-final" && i.version !== null) ?? null;

  return {
    firm,
    project,
    payments,
    designStages,
    frontElevation,
    timeline,
    progress,
    actions,
    paid,
    billable,
    nextPayment,
    nextPaymentChip: nextPayment ? paymentChip(nextPayment) : null,
  };
}
