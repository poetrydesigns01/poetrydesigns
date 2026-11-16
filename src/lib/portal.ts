/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { TODAY } from "./demo-data";
import type { ProjectView, RequestView } from "./firm";
import type { CatalogueItem, FirmEvent, Person, PersonId, Post, ProjectId, Receipt } from "./firm-data";
import { addDays, datePart, daysBetween } from "./format";
import {
  changeStartsAt,
  DESIGN_STAGES,
  PAYMENT_DAYS,
  REQUEST_LEAD_DAYS,
  seedDesignItems,
  seedDrawings,
  seedSiteTasks,
  seedThreadReads,
  seedWorkOrders,
  siteTaskTitle,
  DESIGN_SHEETS,
  DESIGN_TITLES,
  type DesignItemSeed,
  type DesignItemVersionSeed,
  type DesignStage,
  type WorkOrderStatus,
} from "./portal-data";
import type { ProjectedChange } from "./projection";
import {
  constructionWeekOf,
  mondayOf,
  preWeekOf,
  weekEnd,
  weekStart,
  type PlanStageState, type PlanStageView, type PlanTaskView, type PlanView } from "./workflow-plan";
import {
  WORKFLOW_TEMPLATE,
  fallsInMilestone,
  instalmentOf,
  milestoneStage,
  workflowStage,
  type WorkflowClock,
  type WorkflowStageId,
  type WorkflowTrack,
} from "./workflow-template";

// The redesigned portal's derivations: payment gating, stage-wise design items, the
// timeline, chat ticks and site tasks. Pure: worked out from the seed in portal-data.ts,
// each project's plan (workflow-plan.ts), the firm's views and the events recorded in this
// tab. deriveFirm calls derivePortal and puts the results on the Firm; screens read them
// through useFirm().

/** The colour family a status chip takes. See glass-chip in globals.css. */
export type Tone = "done" | "waiting" | "late" | "locked" | "progress";

// ---- Payment gating ----

/**
 * locked: the previous instalment is not received yet.
 * open: unlocked, its due week not reached. in-progress: the milestone it falls inside is being built.
 * work-done: its due week is reached (or that milestone is done), no demand letter yet; the client may request it.
 * due: demand letter raised, waiting for the client. client-paid: the client marked it paid.
 * paid: finance confirmed the money in full. Milestone n cannot start until instalment n is paid.
 */
export type PaymentState = "locked" | "open" | "in-progress" | "work-done" | "due" | "client-paid" | "paid";

export type PaymentStageView = {
  projectId: ProjectId;
  /** 0 is the sign-up advance; 1 to 10 the instalments. */
  n: number;
  /** "Sign-up", "Stage 3". */
  label: string;
  /** "Sign-up", "Instalment 3". */
  instalmentLabel: string;
  /** The construction milestone it opens: "First floor roof slab". */
  name: string;
  /** Before GST. */
  amount: number;
  gst: number;
  /** With GST. */
  total: number;
  /** With GST, received so far. */
  received: number;
  outstanding: number;
  state: PaymentState;
  /** "Locked", "Demand letter raised", "Payment made", "Payment received", ... */
  status: string;
  tone: Tone;
  /** How far the work before its due point has got. */
  work: "not-started" | "in-progress" | "done";
  /**
   * When the milestone the instalment falls inside was finished, if it was by the time the
   * letter was raised (or by today, before a letter). Instalments fall due by week, so this is
   * often empty: the letter then shows no work-done line.
   */
  workDoneAt?: string;
  /** The week it falls due in: construction week (pre-construction week for the sign-up). */
  dueWeek: number;
  dueClock: WorkflowClock;
  /** "Week 18", or "Week 1 before construction" for the sign-up. */
  dueWeekLabel: string;
  /** Monday of the due week, as planned. */
  plannedDueDate: string;
  /** plannedDueDate plus the days client changes added. */
  expectedDueDate: string;
  /** Same as expectedDueDate (kept for older screens). */
  plannedDate: string;
  /** The construction milestone it falls due inside; 0 when before construction. */
  milestone: number;
  /** "Milestone 4", or "Final Approval & Mobilization" / "Sign-up" before construction. */
  milestoneName: string;
  /** The construction milestone that cannot start until it is received; null for the sign-up. */
  unlocks: number | null;
  /** Letter date plus PAYMENT_DAYS; null until a letter is raised. */
  dueDate: string | null;
  /** Days past dueDate while the client has not paid. */
  overdueDays: number;
  letterNo?: string;
  letterRequestedAt?: string;
  letterRaisedAt?: string;
  clientPaidAt?: string;
  clientRef?: string;
  receivedAt?: string;
  locked: boolean;
  /** The instalment that must be received first, when locked. */
  blockedBy: number | null;
  /** Client: may ask for the demand letter. */
  canRequestLetter: boolean;
  /** Staff: may raise the demand letter (payment.raised). */
  canRaiseLetter: boolean;
  /** Client: may mark the payment made. */
  canMarkPaid: boolean;
  /** Finance: may record the money in (receipt.recorded). */
  canConfirm: boolean;
};

// ---- Timeline ----

export type TimelineChange = {
  id: string;
  title: string;
  days: number;
  /** The construction milestone it adds its days from. */
  n: number;
  approvedAt?: string;
  /** Approved before construction began, so the plan already holds its days. */
  inPlan?: boolean;
};

export type TimelineRow = {
  /** 0 is everything before construction (sign-up to project initiation); 1 to 10 the milestones. */
  n: number;
  name: string;
  /** "Milestone 4" or "Before construction". */
  label: string;
  fromWeek: number;
  toWeek: number;
  plannedStart: string;
  /** As first planned, before client changes. */
  plannedDate: string;
  expectedStart: string;
  /** Where it stands now: the finish date when done, else planned plus every day added. */
  expectedDate: string;
  doneOn?: string;
  /** Days added by approved client changes, up to and including this milestone. */
  extraDays: number;
  /** Other slippage carried from the last finished milestone. */
  otherDays: number;
  /** The client changes that add days from this milestone on. */
  changes: TimelineChange[];
  state: "done" | "current" | "upcoming";
  /** Due to start but its instalment is not received. */
  held: boolean;
  /** Its instalment is not received yet. */
  locked: boolean;
  percent: number;
};

/** One stage of the workflow on the weekly plan. */
export type TimelineStage = {
  id: WorkflowStageId;
  milestone: number | null;
  name: string;
  short: string;
  phase: "pre-construction" | "construction" | "close-out";
  clock: WorkflowClock;
  fromWeek: number;
  toWeek: number;
  plannedStart: string;
  plannedEnd: string;
  expectedStart: string;
  expectedEnd: string;
  extraDays: number;
  state: PlanStageState;
  locked: boolean;
  percent: number;
  doneOn?: string;
};

export type TimelineWeek = {
  clock: WorkflowClock;
  week: number;
  /** "P3" before construction, "W18" during it. */
  label: string;
  start: string;
  end: string;
  /** The demo's today falls in it. */
  current: boolean;
};

export type TimelineInstalment = {
  n: number;
  label: string;
  clock: WorkflowClock;
  week: number;
  plannedDate: string;
  expectedDate: string;
  /** The milestone it falls inside (0 before construction). */
  milestone: number;
  unlocks: number | null;
  /** Its share of the contract value, as the workflow sets it. */
  percent: number;
  /**
   * Its expected due week on its clock: the planned week, moved by any days approved client
   * changes added. Every week label on the plan uses this, so label, bar and pin agree.
   */
  expectedWeek: number;
  /** Monday and Sunday of the expected due week: where its bar on the plan ends. */
  dueStart: string;
  dueEnd: string;
  /**
   * The project has reached its expected due week (or the money is already asked for or in). Until
   * then the plan draws it as a red bar from construction week 1, as Poetry's schedule
   * sheet does; once reached it is drawn plainly ("free").
   */
  reached: boolean;
  state: PaymentState;
  status: string;
  tone: Tone;
};

export type TimelineView = {
  projectId: ProjectId;
  code: string;
  /** Monday of pre-construction week 1 and of construction week 1. */
  preStart: string;
  constructionStart: string;
  /** Before construction (n 0), then milestones 1 to 10. */
  rows: TimelineRow[];
  /** Every workflow stage, sign-up to handover. */
  stages: TimelineStage[];
  /** Pre-construction weeks 1 to 7, then construction weeks 1 to 50 (pre week 8 is construction week 1). */
  weeks: TimelineWeek[];
  instalments: TimelineInstalment[];
  /** Today's construction week (0 or less before construction). */
  todayWeek: number;
  /** Total days added by approved client changes. */
  extraDays: number;
  handoverPlanned: string;
  handoverExpected: string;
  /** Approved client changes that added days. */
  changes: TimelineChange[];
  /** Approved before construction began; already in the plan. */
  inPlan: TimelineChange[];
  /** Changes waiting for the client and the days each would add. */
  pending: TimelineChange[];
};

// ---- Design stage items ----

export type DesignItemStatus = "not-uploaded" | "waiting" | "approved" | "modify";

export type DesignItemVersionView = {
  version: number;
  uploadedAt: string;
  note?: string;
  viewedAt?: string;
  status: Exclude<DesignItemStatus, "not-uploaded">;
  decidedAt?: string;
  comment?: string;
};

export type DesignItemView = {
  /** The workflow template task id: "pd-draft-1", "m4-door-frames". */
  id: string;
  projectId: ProjectId;
  /** The plan task: `${projectId}-${id}`. */
  taskId: string;
  stage: DesignStage;
  stageLabel: string;
  /** The construction milestone a selection belongs to; null before construction. */
  milestone: number | null;
  title: string;
  /** As the workbook names the task. */
  workflowName: string;
  sheet: string;
  preparedBy: PersonId;
  preparedByName: string;
  /** The plan task's planned end: when the client's decision is needed. */
  neededBy: string | null;
  /** The newest version, or null before the first upload. */
  version: number | null;
  uploadedAt?: string;
  viewedAt?: string;
  viewed: boolean;
  status: DesignItemStatus;
  /** "Waiting", "Approved", "Modify requested", "Not uploaded". */
  statusWords: string;
  tone: Tone;
  decidedAt?: string;
  comment?: string;
  note?: string;
  /** Oldest first. */
  versions: DesignItemVersionView[];
};

export type DesignStageView = {
  stage: DesignStage;
  label: string;
  items: DesignItemView[];
  status: "approved" | "waiting" | "not-started";
  approved: number;
  total: number;
  /** The stage before it is not fully approved and nothing here is uploaded yet. */
  locked: boolean;
};

// ---- Chat ----

export type Tick = "sent" | "delivered" | "read";

export type ChatPost = Post & {
  side: "client" | "team" | "system";
  name: string;
  first: string;
  /** Only on people's own posts (side client or team). */
  ticks: Tick | null;
  /** A system note as the person who did it reads it: "You marked Instalment 3 paid, ...". */
  selfText?: string;
};

// ---- Site tasks ----

export type MaterialStatus = "to-request" | "in-procurement" | "po-sent" | "delivered";

export type TaskMaterialView = {
  key: string;
  /** "Steel (TMT bars), 12 mm, 850 kg". */
  label: string;
  material: string;
  sub: string;
  qty: number;
  unit: string;
  status: MaterialStatus;
  /** "To request", "In procurement", "PO sent", "Delivered". */
  statusWords: string;
  tone: Tone;
  requestNo?: string;
  poNos: string[];
  vendor?: string;
  neededBy: string;
  /** neededBy minus REQUEST_LEAD_DAYS. */
  requestBy: string;
  /** Still to request and past its request-by date, or raised with less than the lead time. */
  short: boolean;
  /** Days left to request it (negative once past). Only meaningful while to-request. */
  daysToRequest: number;
};

export type WorkOrderView = {
  id: string;
  projectId: ProjectId;
  taskId: string;
  taskTitle: string;
  trade: string;
  crew?: string;
  days: number;
  startOn: string;
  status: WorkOrderStatus;
  /** "Requested", "Crew booked", "On site", "Done". */
  statusWords: string;
  tone: Tone;
  requestedAt: string;
  by: PersonId;
};

export type TaskDrawingView = {
  id: string;
  projectId: ProjectId;
  sheet: string;
  title: string;
  by: PersonId;
  byName: string;
  neededBy: string;
  status: "received" | "awaited";
  receivedAt?: string;
  /** Days past neededBy while awaited. */
  daysLate: number;
  tone: Tone;
  /** The tasks that need it. */
  taskIds: string[];
};

export type TaskBlocker = { kind: "drawing" | "material" | "client" | "payment"; label: string; days: number };

export type SiteTaskView = {
  /** The plan task id: `${projectId}-${templateId}`. */
  id: string;
  projectId: ProjectId;
  /** The workflow template task: "m4-ff-blocks". */
  templateId: string;
  /** The construction milestone. */
  n: number;
  title: string;
  track: WorkflowTrack;
  /** The person the plan gives it to. */
  assignee: PersonId | null;
  assigneeName: string;
  area?: string;
  plannedStart: string;
  plannedEnd: string;
  percent: number;
  steps?: string[];
  stepsDone?: number;
  state: "not-started" | "in-progress" | "done";
  /** Its milestone's instalment is not received, so it cannot start. */
  locked: boolean;
  /** Past its planned end and not finished. */
  late: boolean;
  /** A design task the client still has to approve. */
  waitingForClient: boolean;
  materials: TaskMaterialView[];
  workOrders: WorkOrderView[];
  drawings: TaskDrawingView[];
  blockers: TaskBlocker[];
  lastUpdate?: { at: string; by: PersonId; note?: string };
};

export type SiteMilestoneView = {
  projectId: ProjectId;
  /** The construction milestone, 1 to 10. */
  n: number;
  /** "Milestone 5". */
  name: string;
  /** "First floor roof slab". */
  short: string;
  plannedStart: string;
  plannedEnd: string;
  /** Its own instalment (n) is not received. */
  locked: boolean;
  /** The instalment that must be received first, when locked (the same n). */
  blockedBy: number | null;
  /** Average of the tasks' progress. */
  percent: number;
  /** Design and engineering tasks of the milestone, from the workflow. */
  tasks: SiteTaskView[];
};

export type SiteStageView = SiteMilestoneView & {
  /** The milestone after it, as upcoming work, or null after milestone 10. */
  next: SiteMilestoneView | null;
};

/** Whether a material request is early enough: raised at least REQUEST_LEAD_DAYS before it is needed. */
export function checkLeadTime(
  neededBy: string,
  raisedOn: string = TODAY,
): { ok: boolean; days: number; earliestNeededBy: string; requestBy: string } {
  const days = daysBetween(datePart(raisedOn), neededBy);
  return {
    ok: days >= REQUEST_LEAD_DAYS,
    days,
    earliestNeededBy: addDays(datePart(raisedOn), REQUEST_LEAD_DAYS),
    requestBy: addDays(neededBy, -REQUEST_LEAD_DAYS),
  };
}

// ---- Design item versions (also read by firm.ts for the plan) ----

/** A design item's versions: the seed's, or the plan's when it has no seed, with this tab's uploads, views and decisions. */
export function designVersions(
  projectId: ProjectId,
  id: string,
  base: DesignItemVersionSeed[],
  events: FirmEvent[],
): DesignItemVersionView[] {
  const versions: DesignItemVersionView[] = base.map((v) => ({ ...v }));
  for (const e of events) {
    if (e.kind === "design.uploaded" && e.projectId === projectId && e.designId === id) {
      if (versions.some((v) => v.version === e.version)) continue;
      versions.push({ version: e.version, uploadedAt: e.at, note: e.note || undefined, status: "waiting" });
    } else if (e.kind === "design.viewed" && e.projectId === projectId && e.designId === id) {
      const v = versions.find((x) => x.version === e.version);
      if (v && !v.viewedAt) v.viewedAt = e.at;
    } else if (e.kind === "design.decided" && e.projectId === projectId && e.designId === id) {
      const v = versions.find((x) => x.version === e.version) ?? versions[versions.length - 1];
      if (!v) continue;
      v.status = e.status === "approved" ? "approved" : e.status === "changes-requested" ? "modify" : "waiting";
      v.decidedAt = e.at;
      v.comment = e.comment ?? v.comment;
      // Deciding means it was opened.
      if (!v.viewedAt) v.viewedAt = e.at;
    }
  }
  return versions;
}

/** The seeded design item of a project, if any. */
export function designSeedOf(projectId: ProjectId, id: string): DesignItemSeed | undefined {
  return seedDesignItems.find((d) => d.projectId === projectId && d.id === id);
}

/** Where a seeded design item stands, as a plan task: approved is done, anything uploaded is in progress. */
export function seededDesignState(
  projectId: ProjectId,
  id: string,
  events: FirmEvent[],
): { state: "done" | "in-progress" | "not-started"; doneOn?: string; startedOn?: string } | null {
  const seed = designSeedOf(projectId, id);
  if (!seed) return null;
  const versions = designVersions(projectId, id, seed.versions, events);
  const latest = versions[versions.length - 1];
  if (!latest) return { state: "not-started" };
  const startedOn = datePart(versions[0].uploadedAt);
  if (latest.status === "approved") return { state: "done", startedOn, doneOn: datePart(latest.decidedAt ?? latest.uploadedAt) };
  return { state: "in-progress", startedOn };
}

// ---- The derivation ----

export type PortalInput = {
  events: FirmEvent[];
  projects: ProjectView[];
  requests: RequestView[];
  receipts: Receipt[];
  people: Person[];
  catalogue: CatalogueItem[];
  /** Every thread post, any order. */
  posts: Post[];
  /** Iyer's changes as the client has decided them. */
  changes: ProjectedChange[];
  /** Each project's plan as it stands. */
  plans: Map<ProjectId, PlanView>;
};

export type Portal = {
  payments: Map<ProjectId, PaymentStageView[]>;
  timelines: Map<ProjectId, TimelineView>;
  designStages: Map<ProjectId, DesignStageView[]>;
  chats: Map<ProjectId, ChatPost[]>;
  sites: Map<ProjectId, SiteStageView>;
  workOrders: WorkOrderView[];
  drawings: TaskDrawingView[];
  nextWorkOrderNo: string;
};

const CLIENT_IDS = new Set<PersonId>(["meera", "arjun"]);

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function later(a: string, b: string): string {
  return a > b ? a : b;
}

export function derivePortal(input: PortalInput): Portal {
  const { events, projects, requests, receipts, people, plans } = input;
  const of = <K extends FirmEvent["kind"]>(kind: K) =>
    events.filter((e): e is Extract<FirmEvent, { kind: K }> => e.kind === kind);
  const personOf = (id: PersonId) => people.find((p) => p.id === id);
  const nameOf = (id: PersonId) => personOf(id)?.name ?? id;
  const catalogueName = (id: string) => input.catalogue.find((c) => c.id === id)?.name ?? id;

  // ---- Client changes: the days each adds, from the milestone it starts at ----
  const changesOf = (p: ProjectView, plan: PlanView) => {
    const approved: TimelineChange[] = [];
    const inPlan: TimelineChange[] = [];
    const pending: TimelineChange[] = [];
    if (p.id !== "iyer") return { approved, inPlan, pending };
    for (const c of input.changes) {
      const approvedAt = c.status === "approved" ? (c.decidedOn ?? c.raisedOn) : undefined;
      const change: TimelineChange = {
        id: c.id,
        title: c.title,
        days: c.delayDays,
        n: changeStartsAt[c.id] ?? c.lands[0]?.milestoneId ?? 10,
        approvedAt,
      };
      if (c.status === "approved" && c.delayDays > 0) {
        // A change approved before construction began is in the construction schedule already.
        if (approvedAt && datePart(approvedAt) < plan.constructionStart) inPlan.push({ ...change, inPlan: true });
        else approved.push(change);
      } else if (c.status === "pending") pending.push(change);
    }
    return { approved, inPlan, pending };
  };

  // ---- Timeline ----
  const timelines = new Map<ProjectId, TimelineView>();
  const extraOf = new Map<ProjectId, (milestone: number | null, close?: boolean) => number>();
  for (const p of projects) {
    const plan = plans.get(p.id);
    if (!plan) continue;
    const { approved, inPlan, pending } = changesOf(p, plan);
    const extra = (milestone: number | null, close = false) =>
      sum(approved.filter((c) => close || (milestone !== null && c.n <= milestone)).map((c) => c.days));
    extraOf.set(p.id, extra);

    // Slippage carries forward from the last finished stage.
    let slip = 0;
    const stages: TimelineStage[] = plan.stages.map((s) => {
      const added = extra(s.milestone, s.phase === "close-out");
      const plannedWithExtra = addDays(s.plannedEnd, added);
      if (s.state === "done" && s.doneOn) slip = Math.max(0, daysBetween(plannedWithExtra, s.doneOn));
      const expectedEnd = s.state === "done" && s.doneOn ? s.doneOn : addDays(plannedWithExtra, slip);
      const expectedStart = s.state === "done" || s.state === "current" ? (s.startedOn ?? s.plannedStart) : addDays(s.plannedStart, added + slip);
      return {
        id: s.id,
        milestone: s.milestone,
        name: s.name,
        short: s.short,
        phase: s.phase,
        clock: s.clock,
        fromWeek: s.fromWeek,
        toWeek: s.toWeek,
        plannedStart: s.plannedStart,
        plannedEnd: s.plannedEnd,
        expectedStart,
        expectedEnd: later(expectedEnd, expectedStart),
        extraDays: added,
        state: s.state,
        locked: s.locked,
        percent: s.percent,
        doneOn: s.doneOn,
      };
    });

    const pre = stages.filter((s) => s.phase === "pre-construction");
    const preLast = pre[pre.length - 1];
    const preDone = pre.every((s) => s.state === "done");
    const rows: TimelineRow[] = [
      {
        n: 0,
        name: "Design and approvals",
        label: "Before construction",
        fromWeek: 1,
        toWeek: WORKFLOW_TEMPLATE.preWeeks,
        plannedStart: pre[0].plannedStart,
        plannedDate: preLast.plannedEnd,
        expectedStart: pre[0].expectedStart,
        expectedDate: preDone ? (pre.map((s) => s.doneOn ?? s.plannedEnd).sort().pop() ?? preLast.plannedEnd) : preLast.expectedEnd,
        doneOn: preDone ? pre.map((s) => s.doneOn ?? s.plannedEnd).sort().pop() : undefined,
        extraDays: 0,
        otherDays: 0,
        changes: [],
        state: preDone ? "done" : pre.some((s) => s.state !== "upcoming") ? "current" : "upcoming",
        held: false,
        locked: false,
        percent: Math.round(sum(pre.map((s) => s.percent)) / pre.length),
      },
      ...stages
        .filter((s) => s.milestone !== null)
        .map((s): TimelineRow => {
          const n = s.milestone ?? 0;
          const plannedWithExtra = addDays(s.plannedEnd, s.extraDays);
          return {
            n,
            name: s.short,
            label: s.name,
            fromWeek: s.fromWeek,
            toWeek: s.toWeek,
            plannedStart: s.plannedStart,
            plannedDate: s.plannedEnd,
            expectedStart: s.expectedStart,
            expectedDate: s.expectedEnd,
            doneOn: s.doneOn,
            extraDays: s.extraDays,
            otherDays: Math.max(0, daysBetween(plannedWithExtra, s.expectedEnd)),
            changes: approved.filter((c) => c.n === n),
            state: s.state === "done" ? "done" : s.state === "current" ? "current" : "upcoming",
            held: s.state === "held",
            locked: s.locked,
            percent: s.percent,
          };
        }),
    ];

    const weeks: TimelineWeek[] = [];
    const isNow = (start: string, end: string) => start <= TODAY && TODAY <= end;
    for (let w = 1; w < WORKFLOW_TEMPLATE.overlap.pre; w++) {
      const start = weekStart(plan, "pre", w);
      const end = weekEnd(plan, "pre", w);
      weeks.push({ clock: "pre", week: w, label: `P${w}`, start, end, current: isNow(start, end) });
    }
    const lastWeek = Math.max(...WORKFLOW_TEMPLATE.stages.filter((s) => s.clock === "construction").map((s) => s.to));
    for (let w = 1; w <= lastWeek; w++) {
      const start = weekStart(plan, "construction", w);
      const end = weekEnd(plan, "construction", w);
      weeks.push({ clock: "construction", week: w, label: `W${w}`, start, end, current: isNow(start, end) });
    }

    const handover = stages[stages.length - 1];
    timelines.set(p.id, {
      projectId: p.id,
      code: p.code,
      preStart: plan.preStart,
      constructionStart: plan.constructionStart,
      rows,
      stages,
      weeks,
      instalments: [],
      todayWeek: plan.todayWeek,
      extraDays: sum(approved.map((c) => c.days)),
      handoverPlanned: handover.plannedEnd,
      handoverExpected: handover.expectedEnd,
      changes: approved,
      inPlan,
      pending,
    });
  }

  // ---- Payment gating ----
  const payments = new Map<ProjectId, PaymentStageView[]>();
  for (const p of projects) {
    const plan = plans.get(p.id);
    const extra = extraOf.get(p.id);
    const list: PaymentStageView[] = [];
    for (const m of p.milestones) {
      const previous = list[list.length - 1];
      const mine = receipts.filter((r) => r.projectId === p.id && r.n === m.n);
      const raisedEvent = of("payment.raised").find((e) => e.projectId === p.id && e.n === m.n);
      const raised = ["raised", "approved", "part-paid", "paid"].includes(m.state) || !!raisedEvent;
      const paidEvent = [...of("payment.client-paid")].reverse().find((e) => e.projectId === p.id && e.n === m.n);
      // An approval made on the older screens counts as the client saying it is paid.
      const approvedEvent = of("payment.approved").find((e) => e.projectId === p.id && e.n === m.n);
      const clientPaidAt =
        paidEvent?.at ?? approvedEvent?.at ?? (["approved", "part-paid"].includes(m.state) ? m.approvedAt : undefined);
      const requested = of("letter.requested").find((e) => e.projectId === p.id && e.n === m.n);
      const received = m.received;
      const paid = m.total > 0 && received >= m.total;
      const lastReceipt = mine[mine.length - 1];
      const receivedAt = paid
        ? (of("receipt.recorded").filter((e) => e.receipt.projectId === p.id && e.receipt.n === m.n).pop()?.at ??
          lastReceipt?.on ??
          m.paidOn)
        : undefined;
      const work: PaymentStageView["work"] =
        m.state === "done" || raised || paid ? "done" : m.state === "under-way" ? "in-progress" : "not-started";
      const locked = !raised && !paid && m.n > 0 && !!previous && previous.state !== "paid";

      let state: PaymentState;
      if (paid) state = "paid";
      else if (raised) state = clientPaidAt ? "client-paid" : "due";
      else if (locked) state = "locked";
      else if (work === "done") state = "work-done";
      else if (work === "in-progress") state = "in-progress";
      else state = "open";

      const letterRaisedAt = m.raisedAt ?? raisedEvent?.at;
      const dueDate = raised && letterRaisedAt ? addDays(datePart(letterRaisedAt), PAYMENT_DAYS) : null;
      const overdueDays = state === "due" && dueDate ? Math.max(0, daysBetween(dueDate, TODAY)) : 0;
      const status =
        state === "paid"
          ? "Payment received"
          : state === "client-paid"
            ? "Payment made"
            : state === "due"
              ? overdueDays > 0
                ? `Overdue ${overdueDays} ${overdueDays === 1 ? "day" : "days"}`
                : "Demand letter raised"
              : state === "work-done"
                ? requested
                  ? "Letter requested"
                  : "Due now"
                : state === "in-progress"
                  ? "Coming up"
                  : state === "locked"
                    ? "Locked"
                    : "Not due yet";
      const tone: Tone =
        state === "paid"
          ? "done"
          : state === "due"
            ? overdueDays > 0
              ? "late"
              : "done"
            : state === "client-paid" || state === "work-done"
              ? "waiting"
              : state === "locked"
                ? "locked"
                : "progress";

      const inst = instalmentOf(m.n);
      const fallsIn = fallsInMilestone(m.n);
      const plannedDueDate = plan && inst ? weekStart(plan, inst.clock, inst.week) : (p.signedOn ?? TODAY);
      const expectedDueDate = addDays(plannedDueDate, extra ? extra(fallsIn || null) : 0);
      const unlocks = inst?.unlocks ?? null;
      list.push({
        projectId: p.id,
        n: m.n,
        label: m.n === 0 ? "Sign-up" : `Stage ${m.n}`,
        instalmentLabel: inst?.label ?? (m.n === 0 ? "Sign-up" : `Instalment ${m.n}`),
        name: m.name,
        amount: m.amount,
        gst: m.total - m.amount,
        total: m.total,
        received,
        outstanding: Math.max(0, m.total - received),
        state,
        status,
        tone,
        work,
        workDoneAt:
          m.fallsInDoneOn && m.fallsInDoneOn <= (letterRaisedAt ? datePart(letterRaisedAt) : TODAY) ? m.fallsInDoneOn : undefined,
        dueWeek: inst?.week ?? 1,
        dueClock: inst?.clock ?? "pre",
        // The week the instalment is now expected in: a client change can move it later.
        dueWeekLabel:
          inst?.clock === "construction"
            ? `Week ${plan ? Math.max(inst.week, constructionWeekOf(plan, expectedDueDate)) : inst.week}`
            : `Week ${inst?.week ?? 1} before construction`,
        plannedDueDate,
        expectedDueDate,
        plannedDate: expectedDueDate,
        milestone: fallsIn,
        milestoneName: fallsIn > 0 ? `Milestone ${fallsIn}` : inst ? workflowStage(inst.fallsIn).name : "Sign-up",
        unlocks,
        dueDate,
        overdueDays,
        letterNo: m.letterNo,
        letterRequestedAt: requested?.at,
        letterRaisedAt,
        clientPaidAt,
        clientRef: paidEvent?.ref,
        receivedAt,
        locked: state === "locked",
        blockedBy: state === "locked" && previous ? previous.n : null,
        canRequestLetter: state === "work-done" && !requested,
        canRaiseLetter: state === "work-done",
        canMarkPaid: state === "due",
        canConfirm: state === "due" || state === "client-paid",
      });
    }
    payments.set(p.id, list);
    const timeline = timelines.get(p.id);
    if (timeline && plan) {
      timeline.instalments = list.map((s) => {
        // Client changes add whole days, so the expected date can fall mid-week; the bar,
        // the pin, the week label and "reached" all follow the week that date falls in.
        const dueStart = mondayOf(s.expectedDueDate);
        const expectedWeek =
          s.dueClock === "construction" ? constructionWeekOf(plan, dueStart) : preWeekOf(plan, dueStart);
        return {
          n: s.n,
          label: s.instalmentLabel,
          clock: s.dueClock,
          week: s.dueWeek,
          expectedWeek,
          plannedDate: s.plannedDueDate,
          expectedDate: s.expectedDueDate,
          milestone: s.milestone,
          unlocks: s.unlocks,
          percent: instalmentOf(s.n)?.percent ?? 0,
          dueStart,
          dueEnd: addDays(dueStart, 6),
          reached:
            TODAY >= dueStart ||
            s.state === "work-done" ||
            s.state === "due" ||
            s.state === "client-paid" ||
            s.state === "paid",
          state: s.state,
          status: s.status,
          tone: s.tone,
        };
      });
    }
  }

  // ---- Design stage items ----
  const designStages = new Map<ProjectId, DesignStageView[]>();
  for (const p of projects) {
    const plan = plans.get(p.id);
    if (!plan) continue;
    const stages: DesignStageView[] = [];
    for (const s of DESIGN_STAGES) {
      const items: DesignItemView[] = s.tasks.map((id) => {
        const task = plan.tasks.find((t) => t.templateId === id) as PlanTaskView | undefined;
        const seed = designSeedOf(p.id, id);
        // Without a seed, an item follows its plan task: done is approved, under way is waiting.
        const base: DesignItemVersionSeed[] = seed
          ? seed.versions
          : task && task.state === "done"
            ? [
                {
                  version: 1,
                  uploadedAt: `${addDays(task.doneOn ?? task.plannedEnd, -3)}T11:00`,
                  viewedAt: `${addDays(task.doneOn ?? task.plannedEnd, -3)}T20:00`,
                  status: "approved",
                  decidedAt: `${task.doneOn ?? task.plannedEnd}T20:00`,
                },
              ]
            : [];
        const versions = designVersions(p.id, id, base, events);
        const latest = versions[versions.length - 1];
        const status: DesignItemStatus = latest ? latest.status : "not-uploaded";
        const preparedBy = seed?.preparedBy ?? task?.assignee ?? p.team.head;
        return {
          id,
          projectId: p.id,
          taskId: `${p.id}-${id}`,
          stage: s.id,
          stageLabel: s.label,
          milestone: task?.milestone ?? null,
          title: DESIGN_TITLES[id] ?? task?.name ?? id,
          workflowName: task?.name ?? id,
          sheet: DESIGN_SHEETS[id] ?? id,
          preparedBy,
          preparedByName: nameOf(preparedBy),
          neededBy: task?.plannedEnd ?? null,
          version: latest?.version ?? null,
          uploadedAt: latest?.uploadedAt,
          viewedAt: latest?.viewedAt,
          viewed: !!latest?.viewedAt,
          status,
          statusWords:
            status === "approved"
              ? "Approved"
              : status === "modify"
                ? "Modify requested"
                : status === "waiting"
                  ? "Waiting"
                  : "Not uploaded",
          tone: status === "approved" ? "done" : status === "modify" ? "progress" : status === "waiting" ? "waiting" : "locked",
          decidedAt: latest?.decidedAt,
          comment: latest?.comment,
          note: latest?.note,
          versions,
        };
      });
      const approvedCount = items.filter((i) => i.status === "approved").length;
      const previous = stages[stages.length - 1];
      const anyUp = items.some((i) => i.status !== "not-uploaded");
      stages.push({
        stage: s.id,
        label: s.label,
        items,
        status: items.length > 0 && approvedCount === items.length ? "approved" : anyUp ? "waiting" : "not-started",
        approved: approvedCount,
        total: items.length,
        // Stage by stage: nothing in a stage can be decided until every item before it is approved.
        locked: !!previous && previous.status !== "approved",
      });
    }
    designStages.set(p.id, stages);
  }

  // ---- Chat ----
  const chats = new Map<ProjectId, ChatPost[]>();
  const reads = [
    ...seedThreadReads,
    ...of("thread.read").map((e) => ({ projectId: e.projectId, by: e.by, at: e.at })),
  ];
  const sideOf = (id: PersonId): "client" | "team" => (CLIENT_IDS.has(id) ? "client" : "team");
  const byProject = new Map<ProjectId, Post[]>();
  for (const post of input.posts) byProject.set(post.projectId, [...(byProject.get(post.projectId) ?? []), post]);
  for (const [projectId, list] of byProject) {
    const oldestFirst = [...list].sort((a, b) => a.at.localeCompare(b.at));
    const readsHere = reads.filter((r) => r.projectId === projectId);
    // Any act by the other side after a post means it reached them.
    const activity = (side: "client" | "team") => [
      ...readsHere.filter((r) => sideOf(r.by) === side).map((r) => r.at),
      ...events.filter((e) => sideOf(e.by) === side).map((e) => e.at),
    ];
    const clientActs = activity("client");
    const teamActs = activity("team");
    const clientReads = readsHere.filter((r) => sideOf(r.by) === "client").map((r) => r.at);
    const teamReads = readsHere.filter((r) => sideOf(r.by) === "team").map((r) => r.at);
    chats.set(
      projectId,
      oldestFirst.map((post) => {
        const person = personOf(post.by);
        const side: ChatPost["side"] = post.kind !== "post" ? "system" : sideOf(post.by);
        let ticks: Tick | null = null;
        if (side !== "system") {
          const otherReads = side === "client" ? teamReads : clientReads;
          const otherActs = side === "client" ? teamActs : clientActs;
          ticks = otherReads.some((at) => at >= post.at)
            ? "read"
            : otherActs.some((at) => at > post.at) || datePart(post.at) < TODAY
              ? "delivered"
              : "sent";
        }
        const name = person?.name ?? post.by;
        const selfText =
          side === "system" && post.text.startsWith(`${name} `) ? `You ${post.text.slice(name.length + 1)}` : undefined;
        return { ...post, side, name, first: person?.first ?? post.by, ticks, selfText };
      }),
    );
  }

  // ---- Site tasks ----
  const requestByNo = (no: string) => requests.find((r) => r.no === no);
  const drawingViews: TaskDrawingView[] = seedDrawings.map((d) => {
    const sent = of("drawing.sent").find((e) => e.projectId === d.projectId && e.drawingId === d.id);
    const receivedAt = d.receivedAt ?? sent?.at;
    const daysLate = receivedAt ? 0 : Math.max(0, daysBetween(d.neededBy, TODAY));
    return {
      id: d.id,
      projectId: d.projectId,
      sheet: d.sheet,
      title: d.title,
      by: d.by,
      byName: nameOf(d.by),
      neededBy: d.neededBy,
      status: receivedAt ? "received" : "awaited",
      receivedAt,
      daysLate,
      tone: receivedAt ? "done" : daysLate > 0 ? "late" : "waiting",
      taskIds: seedSiteTasks.filter((t) => t.drawings.includes(d.id)).map((t) => t.id),
    };
  });

  const WORK_WORDS: Record<WorkOrderStatus, string> = {
    requested: "Requested",
    booked: "Crew booked",
    "on-site": "On site",
    done: "Done",
  };
  const WORK_TONE: Record<WorkOrderStatus, Tone> = { requested: "waiting", booked: "progress", "on-site": "progress", done: "done" };
  const firstWorkOrder = Math.max(30, ...seedWorkOrders.map((w) => Number(w.id.slice(-3)))) + 1;
  const workOrders: WorkOrderView[] = [
    ...seedWorkOrders.map((w) => ({ ...w })),
    ...of("work-order.requested").map((e, i) => ({
      id: `WO-2026-${String(firstWorkOrder + i).padStart(3, "0")}`,
      projectId: e.projectId,
      taskId: e.taskId,
      trade: e.trade,
      crew: undefined as string | undefined,
      days: e.days,
      startOn: e.startOn,
      status: "requested" as WorkOrderStatus,
      requestedAt: e.at,
      by: e.by,
    })),
  ].map((w) => {
    const booked = of("work-order.booked").find((e) => e.workOrderId === w.id);
    const status: WorkOrderStatus = booked && w.status === "requested" ? "booked" : w.status;
    return {
      ...w,
      crew: booked?.crew ?? w.crew,
      status,
      statusWords: WORK_WORDS[status],
      tone: WORK_TONE[status],
      taskTitle: siteTaskTitle(w.taskId),
    };
  });

  const materialFrom = (r: RequestView): TaskMaterialView[] =>
    r.lines.map((line) => {
      const pos = r.pos.filter((po) => po.lines.some((l) => l.lineId === line.id));
      const status: MaterialStatus = r.queued
        ? "to-request"
        : r.status === "Delivered"
          ? "delivered"
          : pos.length > 0
            ? "po-sent"
            : "in-procurement";
      const lead = checkLeadTime(r.neededBy, r.at);
      return {
        key: `${r.no}:${line.id}`,
        label: `${catalogueName(line.material)}, ${line.sub}, ${line.qty.toLocaleString("en-IN")} ${line.unit}`,
        material: line.material,
        sub: line.sub,
        qty: line.qty,
        unit: line.unit,
        status,
        statusWords:
          status === "delivered" ? "Delivered" : status === "po-sent" ? "PO sent" : status === "to-request" ? "Not sent" : "In procurement",
        tone: status === "delivered" ? "done" : status === "po-sent" ? "progress" : "waiting",
        requestNo: r.no,
        poNos: pos.map((po) => po.no),
        vendor: pos[pos.length - 1]?.vendor,
        neededBy: r.neededBy,
        requestBy: lead.requestBy,
        short: !lead.ok,
        daysToRequest: 0,
      };
    });

  const progressOf = (taskId: string) => [...of("site-task.progress")].reverse().find((e) => e.taskId === taskId);

  const siteTaskOf = (p: ProjectView, task: PlanTaskView, design: DesignItemView | undefined): SiteTaskView => {
    const seed = seedSiteTasks.find((t) => t.id === task.id);
    const refs = seed?.requests ?? [];
    // "MR-2026-0140#0140-2" links one line of a request; a bare number links every line.
    const linked = [
      ...refs.flatMap((ref) => {
        const [no, lineId] = ref.split("#");
        const r = requestByNo(no);
        if (!r) return [];
        return materialFrom(r).filter((m) => !lineId || m.key === `${no}:${lineId}`);
      }),
      ...requests.filter((r) => r.taskId === task.id && !refs.some((ref) => ref.split("#")[0] === r.no)).flatMap(materialFrom),
    ];
    // A request raised for this task in the demo takes the planned line it matches.
    const requestedHere = requests.filter((r) => r.taskId === task.id).flatMap((r) => r.lines);
    const planned: TaskMaterialView[] = (seed?.materials ?? [])
      .filter((m) => !requestedHere.some((l) => l.material === m.material && l.sub === m.sub))
      .map((m) => {
        const lead = checkLeadTime(m.neededBy);
        return {
          key: `${task.id}:${m.material}:${m.sub}`,
          label: `${catalogueName(m.material)}, ${m.sub}, ${m.qty.toLocaleString("en-IN")} ${m.unit}`,
          material: m.material,
          sub: m.sub,
          qty: m.qty,
          unit: m.unit,
          status: "to-request",
          statusWords: "To request",
          tone: lead.ok ? "locked" : "late",
          poNos: [],
          neededBy: m.neededBy,
          requestBy: lead.requestBy,
          short: !lead.ok,
          daysToRequest: daysBetween(TODAY, lead.requestBy),
        };
      });
    const materials = [...linked, ...planned];
    const mineWork = workOrders.filter((w) => w.taskId === task.id);
    const drawings = drawingViews.filter((d) => seed?.drawings.includes(d.id));
    const update = progressOf(task.id);
    const waitingForClient = !!design && design.status !== "approved";
    const blockers: TaskBlocker[] = [
      ...(waitingForClient && design && design.status !== "not-uploaded"
        ? [{ kind: "client" as const, label: `${design.title} with the client`, days: 0 }]
        : []),
      ...drawings
        .filter((d) => d.status === "awaited" && d.daysLate > 0)
        .map((d) => ({ kind: "drawing" as const, label: `${d.sheet} late`, days: d.daysLate })),
      ...materials
        .filter((m) =>
          m.status === "to-request" ? m.daysToRequest < 0 : m.status !== "delivered" && daysBetween(m.neededBy, TODAY) > 0,
        )
        .map((m) => ({
          kind: "material" as const,
          label: `${catalogueName(m.material)} ${m.status === "to-request" ? "to request" : "late"}`,
          days: m.status === "to-request" ? -m.daysToRequest : daysBetween(m.neededBy, TODAY),
        })),
    ];
    const percent = task.percent;
    return {
      id: task.id,
      projectId: p.id,
      templateId: task.templateId,
      n: task.milestone ?? 0,
      title: task.name,
      track: task.track,
      assignee: task.assignee,
      assigneeName: task.assignee ? nameOf(task.assignee) : "",
      area: seed?.area,
      plannedStart: task.plannedStart,
      plannedEnd: task.plannedEnd,
      percent,
      steps: seed?.steps,
      stepsDone: update?.stepsDone ?? seed?.stepsDone,
      state: task.state === "done" ? "done" : percent > 0 || task.state === "in-progress" ? "in-progress" : "not-started",
      locked: task.state === "locked",
      late: task.late,
      waitingForClient,
      materials,
      workOrders: mineWork,
      drawings,
      blockers,
      lastUpdate: update ? { at: update.at, by: update.by, note: update.note } : undefined,
    };
  };

  const sites = new Map<ProjectId, SiteStageView>();
  for (const p of projects) {
    const plan = plans.get(p.id);
    if (!plan || plan.currentMilestone === null || p.phase !== "building") continue;
    const items = designStages.get(p.id)?.flatMap((s) => s.items) ?? [];
    const milestoneView = (stage: PlanStageView): SiteMilestoneView => {
      const n = stage.milestone ?? 0;
      const tasks = stage.tasks
        .filter((t) => t.track === "engineering" || t.track === "design")
        .map((t) => siteTaskOf(p, t, items.find((i) => i.id === t.templateId)));
      const stageInfo = milestoneStage(n);
      return {
        projectId: p.id,
        n,
        name: stage.name,
        short: stageInfo?.short ?? stage.short,
        plannedStart: stage.plannedStart,
        plannedEnd: stage.plannedEnd,
        locked: stage.locked,
        blockedBy: stage.locked ? n : null,
        percent: tasks.length > 0 ? Math.round(sum(tasks.map((t) => t.percent)) / tasks.length) : 0,
        tasks,
      };
    };
    const current = plan.stages.find((s) => s.milestone === plan.currentMilestone);
    if (!current) continue;
    const nextStage = plan.stages.find((s) => s.milestone === (plan.currentMilestone ?? 0) + 1);
    sites.set(p.id, { ...milestoneView(current), next: nextStage ? milestoneView(nextStage) : null });
  }

  return {
    payments,
    timelines,
    designStages,
    chats,
    sites,
    workOrders,
    drawings: drawingViews,
    nextWorkOrderNo: `WO-2026-${String(firstWorkOrder + of("work-order.requested").length).padStart(3, "0")}`,
  };
}
