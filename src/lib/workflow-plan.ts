import { addDays, daysBetween } from "./format";
import {
  WORKFLOW_TEMPLATE,
  workflowStage,
  workingRoles,
  type WorkflowClock,
  type WorkflowRole,
  type WorkflowStageId,
  type WorkflowTrack,
} from "./workflow-template";
import type { CategoryId, PersonId, ProjectId } from "./firm-data";

// A project's plan: the workflow template's tasks with dates worked out from a start date
// and a person given to each by role from the project team. Pure: nothing here reads a
// clock. The admin generates a plan (event plan.generated) and re-allocates a task (event
// plan.task-assigned); firm.ts applies both and portal.ts works out where each task stands.

// ---- Project codes ----

/**
 * Category codes for project codes. Sample: the workbook shows only "CFS_501_NK" (category
 * code, running number, client initials). The real codes per category are to be confirmed
 * by Poetry.
 */
export const CATEGORY_CODES: Record<CategoryId, string> = {
  "city-villa": "CFS",
  farmhouse: "FHS",
  eco: "ECO",
  "cement-blocks": "CBS",
};

/** "CFS_504_MI": category code, running number, the first client's initials. Format to be confirmed. */
export function projectCode(category: CategoryId, number: number, clientName: string): string {
  const initials = clientName
    .replace(/[^A-Za-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join("")
    .slice(0, 3);
  return `${CATEGORY_CODES[category]}_${number}_${initials || "XX"}`;
}

// ---- Weeks and dates ----

export type PlanAnchors = {
  /** Monday of pre-construction week 1 (the sign-up week). */
  preStart: string;
  /** Monday of construction week 1. By default pre-construction week 8. */
  constructionStart: string;
};

/** Construction week 1 when the plan gives none: pre-construction week 8, as the tracker overlaps them. */
export function defaultConstructionStart(preStart: string): string {
  return addDays(preStart, (WORKFLOW_TEMPLATE.overlap.pre - 1) * 7);
}

/** The Monday of a week on a clock. */
export function weekStart(anchors: PlanAnchors, clock: WorkflowClock, week: number): string {
  return addDays(clock === "pre" ? anchors.preStart : anchors.constructionStart, (week - 1) * 7);
}

/** The Sunday that ends a week on a clock. */
export function weekEnd(anchors: PlanAnchors, clock: WorkflowClock, week: number): string {
  return addDays(weekStart(anchors, clock, week), 6);
}

/** The construction week a date falls in (1 on construction start; 0 or less before it). */
export function constructionWeekOf(anchors: PlanAnchors, date: string): number {
  return Math.floor(daysBetween(anchors.constructionStart, date) / 7) + 1;
}

/** The pre-construction week a date falls in (1 on the sign-up week). */
export function preWeekOf(anchors: PlanAnchors, date: string): number {
  return Math.floor(daysBetween(anchors.preStart, date) / 7) + 1;
}

/** The Monday on or before a date. */
export function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  // 1970-01-05 was a Monday; plain day arithmetic, no clock.
  const day = Math.round(Date.UTC(y, m - 1, d) / 86400000);
  const offset = (((day - 4) % 7) + 7) % 7;
  return addDays(date, -offset);
}

// ---- The plan ----

/** The people a plan gives work to, by role. */
export type PlanTeam = {
  /** The client's portal person, when the client signs in (Iyer only). */
  client: PersonId | null;
  business: PersonId;
  finance: PersonId;
  /** The Project Architect (the project head): approvals and estimates. */
  architect: PersonId;
  /** The architect who draws: design-track tasks. Usually the junior on the team. */
  designer: PersonId;
  site: PersonId;
};

export type PlanTask = {
  /** `${projectId}-${templateId}`. */
  id: string;
  projectId: ProjectId;
  templateId: string;
  stage: WorkflowStageId;
  /** 1 to 10 inside a construction milestone, else null. */
  milestone: number | null;
  name: string;
  track: WorkflowTrack;
  /** Who manages it in the portal (the template's `portal` when set, else the workbook's manager). */
  manager: WorkflowRole;
  support: WorkflowRole[];
  /** The workbook's task manager and supporting team, as the track map names them. */
  workbookManager: WorkflowRole;
  workbookSupport: WorkflowRole[];
  clientApproves: boolean;
  instalment?: number;
  group?: string;
  clock: WorkflowClock;
  fromWeek: number;
  toWeek: number;
  /** Monday of the first planned week. */
  plannedStart: string;
  /** Sunday of the last planned week. */
  plannedEnd: string;
  /** The person given the task: by role from the team, or as the admin re-allocated it. */
  assignee: PersonId | null;
  supportPeople: PersonId[];
};

export type ProjectPlan = PlanAnchors & {
  projectId: ProjectId;
  code: string;
  generatedAt: string;
  generatedBy: PersonId;
  tasks: PlanTask[];
};

/** The person a role falls to on a team; design-track architect work goes to the designer. */
export function personForRole(team: PlanTeam, role: WorkflowRole, track: WorkflowTrack): PersonId | null {
  if (role === "client") return team.client;
  if (role === "architect") return track === "design" ? team.designer : team.architect;
  return team[role];
}

/** A project's tasks from the template, dated from its start and given to its team by role. */
export function generatePlan(input: {
  projectId: ProjectId;
  code: string;
  preStart: string;
  constructionStart?: string;
  team: PlanTeam;
  generatedAt: string;
  generatedBy: PersonId;
  /** Re-allocations: template task id to person. */
  assigned?: Record<string, PersonId>;
}): ProjectPlan {
  const anchors: PlanAnchors = {
    preStart: input.preStart,
    constructionStart: input.constructionStart ?? defaultConstructionStart(input.preStart),
  };
  const tasks: PlanTask[] = [];
  for (const stage of WORKFLOW_TEMPLATE.stages) {
    for (const t of stage.tasks) {
      // A payment task sits in the week its instalment falls due; every other task spans its stage.
      const instalment =
        t.instalment === undefined ? undefined : WORKFLOW_TEMPLATE.instalments.find((i) => i.n === t.instalment);
      const clock = instalment?.clock ?? stage.clock;
      const fromWeek = instalment?.week ?? stage.from;
      const toWeek = instalment?.week ?? stage.to;
      const roles = workingRoles(t);
      tasks.push({
        id: `${input.projectId}-${t.id}`,
        projectId: input.projectId,
        templateId: t.id,
        stage: stage.id,
        milestone: stage.milestone,
        name: t.name,
        track: t.track,
        manager: roles.manager,
        support: roles.support,
        workbookManager: t.manager,
        workbookSupport: t.support,
        clientApproves: t.clientApproves,
        instalment: t.instalment,
        group: t.group,
        clock,
        fromWeek,
        toWeek,
        plannedStart: weekStart(anchors, clock, fromWeek),
        plannedEnd: weekEnd(anchors, clock, toWeek),
        assignee: input.assigned?.[t.id] ?? personForRole(input.team, roles.manager, t.track),
        supportPeople: roles.support
          .map((role) => personForRole(input.team, role, t.track))
          .filter((p): p is PersonId => p !== null),
      });
    }
  }
  return {
    ...anchors,
    projectId: input.projectId,
    code: input.code,
    generatedAt: input.generatedAt,
    generatedBy: input.generatedBy,
    tasks,
  };
}

/** Planned start and end of a stage. */
export function stageDates(anchors: PlanAnchors, id: WorkflowStageId): { start: string; end: string } {
  const stage = workflowStage(id);
  return { start: weekStart(anchors, stage.clock, stage.from), end: weekEnd(anchors, stage.clock, stage.to) };
}

/** Planned date an instalment falls due: the Monday of its week. */
export function instalmentDate(anchors: PlanAnchors, n: number): string {
  const i = WORKFLOW_TEMPLATE.instalments.find((x) => x.n === n);
  return i ? weekStart(anchors, i.clock, i.week) : anchors.preStart;
}

// ---- Seeds: where a project stands ----

/**
 * How far a seeded project has got. Every task of `doneThrough` and the stages before it is
 * finished (on its planned end shifted by `slipDays`, or on the date in `tasks`). Tasks of
 * later stages are at the percent in `tasks`, else not started. Payment tasks and client
 * approvals follow the money and the design items, not this.
 */
export type PlanProgressSeed = {
  doneThrough: WorkflowStageId | null;
  /** Days the finished work ran behind plan. */
  slipDays?: number;
  tasks?: Record<string, { percent?: number; startedOn?: string; doneOn?: string }>;
};

export type PlanSeed = {
  /** Monday of the sign-up week. */
  preStart: string;
  /** Monday of construction week 1; by default pre-construction week 8. */
  constructionStart?: string;
  generatedAt: string;
  generatedBy: PersonId;
  /** Running number in the project code. */
  codeNumber: number;
  progress: PlanProgressSeed;
  /** Re-allocations made before the demo: template task id to person. */
  assigned?: Record<string, PersonId>;
};

/** The order of the stages, for "done through" comparisons. */
export function stageIndex(id: WorkflowStageId): number {
  return WORKFLOW_TEMPLATE.stages.findIndex((s) => s.id === id);
}

// ---- Where a plan stands ----

/** locked: a construction task whose milestone's instalment is not received yet. */
export type PlanTaskState = "done" | "in-progress" | "not-started" | "locked";

export type PlanTaskView = PlanTask & {
  state: PlanTaskState;
  percent: number;
  startedOn?: string;
  doneOn?: string;
  /** Past its planned end and not finished. */
  late: boolean;
  /** Days past its planned end while not finished, else 0. */
  daysLate: number;
};

/**
 * done: every task finished. current: work started and not finished. held: a construction
 * milestone whose instalment is not received, with nothing started on site. upcoming: not started.
 */
export type PlanStageState = "done" | "current" | "held" | "upcoming";

export type PlanStageView = {
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
  state: PlanStageState;
  startedOn?: string;
  doneOn?: string;
  /** Average of the stage's work tasks (payment tasks left out); 0 for a construction milestone until work on site begins. */
  percent: number;
  /** The instalment that must be received before it starts (milestones 1 to 10). */
  instalment: number | null;
  /** A construction milestone whose instalment is not received yet. */
  locked: boolean;
  /** Milestones 1 to 9: the week the tracker marks for the engineer's check, the week before the next instalment (to confirm with Poetry). */
  checkWeek: number | null;
  /** Monday of `checkWeek`. */
  checkDate: string | null;
  tasks: PlanTaskView[];
};

export type PlanView = Omit<ProjectPlan, "tasks"> & {
  tasks: PlanTaskView[];
  stages: PlanStageView[];
  /** The construction milestone being built (or held), or null before construction and after it. */
  currentMilestone: number | null;
  /** The stage in hand: the first one under way, else the first not done. */
  currentStage: WorkflowStageId | null;
  /** Construction week of `today` (0 or less before construction). */
  todayWeek: number;
  /** Pre-construction week of `today`. */
  todayPreWeek: number;
};

export type PlanFacts = {
  today: string;
  /** When instalment n (0 is the sign-up) was received in full, or null. */
  paidOn: (n: number) => string | null;
  /** When the site marked construction milestone n done (event stage.done), or null. */
  stageDoneOn: (milestone: number) => string | null;
  /** The newest site update on a plan task (event site-task.progress), or null. */
  taskUpdate: (planTaskId: string) => { percent: number; at: string } | null;
  /** A client design item's standing, when the project has one for the task. */
  designOf: (templateId: string) => { state: "done" | "in-progress" | "not-started"; doneOn?: string; startedOn?: string } | null;
};

/** Every task's state, every stage's state and the milestone in hand. Pure. */
export function planProgress(plan: ProjectPlan, progress: PlanProgressSeed | undefined, facts: PlanFacts): PlanView {
  const doneUpTo = progress?.doneThrough ? stageIndex(progress.doneThrough) : -1;
  const slip = progress?.slipDays ?? 0;
  const tasks: PlanTaskView[] = plan.tasks.map((t) => {
    const seed = progress?.tasks?.[t.templateId];
    const view = (state: PlanTaskState, percent: number, startedOn?: string, doneOn?: string): PlanTaskView => {
      const daysLate = state !== "done" ? Math.max(0, daysBetween(t.plannedEnd, facts.today)) : 0;
      return { ...t, state, percent, startedOn, doneOn, late: daysLate > 0, daysLate };
    };
    if (t.instalment !== undefined) {
      const paid = facts.paidOn(t.instalment);
      if (paid) return view("done", 100, t.plannedStart, paid);
      return view(daysBetween(t.plannedStart, facts.today) >= 0 ? "in-progress" : "not-started", 0);
    }
    const design = t.clientApproves ? facts.designOf(t.templateId) : null;
    if (design) {
      const percent = design.state === "done" ? 100 : design.state === "in-progress" ? 50 : 0;
      return view(design.state, percent, design.startedOn, design.doneOn);
    }
    const stageDone = t.milestone !== null ? facts.stageDoneOn(t.milestone) : null;
    if (stageDone) return view("done", 100, seed?.startedOn ?? t.plannedStart, stageDone);
    if (seed?.doneOn) return view("done", 100, seed.startedOn ?? t.plannedStart, seed.doneOn);
    if (stageIndex(t.stage) <= doneUpTo) return view("done", 100, t.plannedStart, addDays(t.plannedEnd, slip));
    const update = facts.taskUpdate(t.id);
    const percent = Math.max(0, Math.min(100, update?.percent ?? seed?.percent ?? 0));
    if (percent >= 100) {
      return view("done", 100, seed?.startedOn ?? t.plannedStart, update ? update.at.slice(0, 10) : t.plannedEnd);
    }
    const gateOpen = t.milestone === null || !!facts.paidOn(t.milestone);
    if (!gateOpen) return view("locked", percent);
    const startedOn = percent > 0 ? (seed?.startedOn ?? update?.at.slice(0, 10)) : undefined;
    return view(percent > 0 ? "in-progress" : "not-started", percent, startedOn);
  });

  const done = new Map<number, boolean>();
  const stages: PlanStageView[] = WORKFLOW_TEMPLATE.stages.map((s) => {
    const mine = tasks.filter((t) => t.stage === s.id);
    const work = mine.filter((t) => t.track !== "payment");
    const counted = work.length > 0 ? work : mine;
    const allDone = mine.length > 0 && mine.every((t) => t.state === "done");
    const started = mine.some((t) => t.state === "done" || t.state === "in-progress");
    // Only work on site makes a construction milestone under way or opens its lock: a drawing
    // or selection may be prepared ahead of its milestone while the instalment is unpaid.
    const siteWork = s.milestone !== null ? work.filter((t) => t.track === "engineering") : work;
    const workStarted = siteWork.some((t) => t.state === "done" || t.percent > 0);
    const startedOn = (s.milestone !== null && !allDone ? siteWork : mine)
      .map((t) => t.startedOn)
      .filter((d): d is string => !!d)
      .sort()[0];
    const doneOn = allDone
      ? mine
          .map((t) => t.doneOn ?? t.plannedEnd)
          .sort()
          .pop()
      : undefined;
    const instalment = s.milestone;
    const gateOpen = instalment === null || !!facts.paidOn(instalment);
    const dates = stageDates(plan, s.id);
    let state: PlanStageState = allDone ? "done" : started ? "current" : "upcoming";
    // A construction milestone counts as under way only once work on site has begun.
    if (s.milestone !== null && state === "current" && !workStarted) state = "upcoming";
    const locked = s.milestone !== null && !allDone && !gateOpen && !workStarted;
    // Held: due to start (the one before is done, or its planned start has come) but its instalment is not in.
    // Milestone 1 follows project initiation (kept as milestone 0 here).
    const previous = s.milestone !== null ? done.get(s.milestone - 1) : false;
    if (locked && (previous || daysBetween(dates.start, facts.today) >= 0)) state = "held";
    if (s.milestone !== null) done.set(s.milestone, allDone);
    if (s.id === "initiation") done.set(0, allDone);
    return {
      id: s.id,
      milestone: s.milestone,
      name: s.name,
      short: s.short,
      phase: s.phase,
      clock: s.clock,
      fromWeek: s.from,
      toWeek: s.to,
      plannedStart: dates.start,
      plannedEnd: dates.end,
      state,
      startedOn,
      doneOn,
      // A construction milestone shows no progress until work on site begins, so a drawing
      // prepared ahead does not count as building.
      percent:
        s.milestone !== null && !allDone && !workStarted
          ? 0
          : Math.round(counted.reduce((total, t) => total + t.percent, 0) / Math.max(1, counted.length)),
      instalment,
      locked,
      checkWeek: s.checkWeek ?? null,
      checkDate: s.checkWeek ? weekStart(plan, s.clock, s.checkWeek) : null,
      tasks: mine,
    };
  });

  const milestones = stages.filter((s) => s.milestone !== null);
  const building = milestones.find((s) => s.state === "current");
  // Between milestones, the one in hand is the first not done, held or not.
  const firstOpen = milestones.find((s) => s.state !== "done");
  const preDone = stages.filter((s) => s.phase === "pre-construction").every((s) => s.state === "done");
  const currentMilestone = building?.milestone ?? (preDone && firstOpen ? firstOpen.milestone : null);
  const currentStage = (stages.find((s) => s.state === "current") ?? stages.find((s) => s.state !== "done"))?.id ?? null;
  return {
    ...plan,
    tasks,
    stages,
    currentMilestone,
    currentStage,
    todayWeek: constructionWeekOf(plan, facts.today),
    todayPreWeek: preWeekOf(plan, facts.today),
  };
}
