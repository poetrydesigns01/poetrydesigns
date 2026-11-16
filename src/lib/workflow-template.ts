/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
// Poetry Designs' project workflow, as their "Project Workflow Template" workbook lays it out:
// the "Project Track map" sheet gives the stages, tasks, task managers and supporting teams,
// and the "Project Schedule & Tracker" sheet gives the weeks (8 pre-construction weeks, then
// 48 construction weeks) and the week each instalment falls in. Nothing here reads a clock;
// project plans are generated from it in workflow-plan.ts.
//
// Decisions where the workbook is silent (also listed in the notes for screen work):
// - Instalment k+1 falls due in its week inside milestone k; milestone k+1 cannot start
//   until instalment k+1 is received. Instalment 1 (mobilisation advance) falls in
//   construction week 1 and gates milestone 1.
// - The agreed split is kept: sign-up 5%, then instalments 15, 15, 10, 10, 10, 8, 8, 8, 8, 3
//   (all before 18% GST).
// - Inspection & Audit and Handover carry no weeks in the tracker; each is given one week
//   after construction week 48 (weeks 49 and 50).
// - Rows with both a DESIGN and an ENGINEERING task share one manager pair in the track map,
//   and the template keeps the workbook's pair on both: the Project Engineer manages the
//   Project Initiation drawings, the milestone 1 MEP drawings (the Project Architect
//   supporting) and the selections of milestones 2 to 9 (no architect named). To confirm
//   with Poetry: in the portal the drawing or selection itself is prepared and uploaded by
//   the architect, with the engineer supporting (`portal` on the task). Plans give the work
//   by `portal`; the workflow screen shows the workbook's owners.
// - The tracker marks one week inside milestones 1 to 9, the week before each instalment
//   (construction weeks 7, 11, 13, 17, 19, 24, 26, 35 and 40), and fills the Project
//   Engineer's team row there. Read as the engineer's check of the work before Accounts &
//   Finance raises the instalment: to confirm with Poetry. Kept as `checkWeek` on the stage.
// - "Plumbing finals" is a tracker row across the build with no task in the track map; it is
//   kept as a track (WORKFLOW_TRACKS), not as a task.

/** Who does a task: the client, the business team, accounts and finance, the project architect or the project engineer. */
export type WorkflowRole = "client" | "business" | "finance" | "architect" | "site";

/** design: drawings and selections. engineering: work on site. payment: money in. approval: sign-offs. */
export type WorkflowTrack = "design" | "engineering" | "payment" | "approval";

/** The week counter a stage runs on: the 8 pre-construction weeks or the construction weeks. */
export type WorkflowClock = "pre" | "construction";

export type WorkflowPhase = "pre-construction" | "construction" | "close-out";

export type WorkflowStageId =
  | "sign-up"
  | "planning-design"
  | "final-approval"
  | "initiation"
  | "m1"
  | "m2"
  | "m3"
  | "m4"
  | "m5"
  | "m6"
  | "m7"
  | "m8"
  | "m9"
  | "m10"
  | "inspection"
  | "handover";

export type WorkflowTask = {
  /** Stable across projects: a project plan task is `${projectId}-${id}`. */
  id: string;
  /** As the workbook names it. */
  name: string;
  track: WorkflowTrack;
  /** The task manager. */
  manager: WorkflowRole;
  /** The supporting team, in the workbook's order. */
  support: WorkflowRole[];
  /** The client signs it off (a design item, a selection, a cost approval). */
  clientApproves: boolean;
  /** Payment tasks: 0 is the sign-up advance, 1 to 10 the instalments. */
  instalment?: number;
  /** The heading it sits under in the track map, when it has one: "MEP", "Technical drawings & documentation". */
  group?: string;
  /**
   * Who does it in the portal, when that differs from the workbook's manager and support:
   * the architect prepares and uploads the drawings and selections the workbook gives the
   * Project Engineer. A decision to confirm with Poetry; `manager` and `support` stay the workbook's.
   */
  portal?: { manager: WorkflowRole; support: WorkflowRole[] };
};

export type WorkflowStage = {
  id: WorkflowStageId;
  /** 1 to 10 for the construction milestones, else null. */
  milestone: number | null;
  /** "Milestone 4", "Planning & Design". */
  name: string;
  /** The work in plain words, from the stage's tasks: "First floor block work". */
  short: string;
  phase: WorkflowPhase;
  clock: WorkflowClock;
  /** Planned weeks on `clock`, both ends included. */
  from: number;
  to: number;
  /**
   * Milestones 1 to 9: the week the tracker marks inside the milestone, the week before its
   * instalment falls due. Read as the Project Engineer's check of the work; to confirm with Poetry.
   */
  checkWeek?: number;
  tasks: WorkflowTask[];
};

export type WorkflowInstalment = {
  /** 0 is the sign-up advance; 1 to 10 the instalments. */
  n: number;
  /** "Sign-up", "Instalment 3". */
  label: string;
  /** Of the contract value, before GST. */
  percent: number;
  clock: WorkflowClock;
  /** The week it falls due in, on `clock`. */
  week: number;
  /** The stage whose weeks it falls inside. */
  fallsIn: WorkflowStageId;
  /** The construction milestone that cannot start until it is received; null for the sign-up. */
  unlocks: number | null;
  /** The payment task in the template. */
  taskId: string;
};

export type WorkflowTemplate = {
  id: string;
  name: string;
  /** The tracker's example code: layout CFS, plot 501, customer initials NK. See projectCode() in workflow-plan.ts. */
  sampleCode: string;
  preWeeks: number;
  constructionWeeks: number;
  /** Pre-construction week 8 (Project Initiation) is construction week 1. */
  overlap: { pre: number; construction: number };
  gstRate: number;
  stages: WorkflowStage[];
  instalments: WorkflowInstalment[];
};

const A = "architect" as const;
const B = "business" as const;
const F = "finance" as const;
const S = "site" as const;

function task(
  id: string,
  name: string,
  track: WorkflowTrack,
  manager: WorkflowRole,
  support: WorkflowRole[],
  extra: Partial<Pick<WorkflowTask, "clientApproves" | "instalment" | "group" | "portal">> = {},
): WorkflowTask {
  return { id, name, track, manager, support, clientApproves: false, ...extra };
}

/** A payment task: "Receipt of Milestone 4", managed by Accounts & Finance. */
function receipt(n: number): WorkflowTask {
  return task(`m${n}-receipt`, `Receipt of Milestone ${n}`, "payment", F, [], { instalment: n });
}

/**
 * A drawing or client selection the workbook gives the Project Engineer (`support`: the
 * Project Architect for initiation and milestone 1, nobody for milestones 2 to 9). In the
 * portal the architect prepares it with the engineer supporting; see `portal`.
 */
function selection(
  id: string,
  name: string,
  opts: { clientApproves?: boolean; support?: WorkflowRole[]; group?: string } = {},
): WorkflowTask {
  return task(id, name, "design", S, opts.support ?? [], {
    clientApproves: opts.clientApproves ?? true,
    group: opts.group,
    portal: { manager: A, support: [S] },
  });
}

const DRAWINGS = "Technical drawings & documentation";

/** Site work, managed by the Project Engineer. */
function work(id: string, name: string, support: WorkflowRole[] = [A]): WorkflowTask {
  return task(id, name, "engineering", S, support);
}

export const WORKFLOW_TEMPLATE: WorkflowTemplate = {
  id: "poetry-workflow-v1",
  name: "Project workflow",
  sampleCode: "CFS_501_NK",
  preWeeks: 8,
  constructionWeeks: 48,
  overlap: { pre: 8, construction: 1 },
  gstRate: 0.18,
  stages: [
    {
      id: "sign-up",
      milestone: null,
      name: "Sign-up",
      short: "Sign-up",
      phase: "pre-construction",
      clock: "pre",
      from: 1,
      to: 1,
      tasks: [task("su-advance", "Sign-up (5% advance received)", "payment", F, [B], { instalment: 0 })],
    },
    {
      id: "planning-design",
      milestone: null,
      name: "Planning & Design",
      short: "Floor plans and elevations",
      phase: "pre-construction",
      clock: "pre",
      from: 2,
      to: 5,
      tasks: [
        task("pd-soil-test", "Soil test & site plans", "design", A, []),
        task("pd-brief", "Design brief", "design", A, [B]),
        task("pd-draft-1", "Draft 1 - Floor plan", "design", A, [B], { clientApproves: true, group: "Floor plan" }),
        task("pd-draft-2", "Draft 2 - Floor plan", "design", A, [B], { clientApproves: true, group: "Floor plan" }),
        task("pd-draft-3", "Draft 3 - Floor plan", "design", A, [B], { clientApproves: true, group: "Floor plan" }),
        task("pd-draft-final", "Final draft - Floor plan", "design", A, [B], { clientApproves: true, group: "Floor plan" }),
        task("pd-3d", "3D elevation", "design", A, [B], { group: "3D elevation" }),
        task("pd-elev-1", "Opt 1 - Elevation", "design", A, [B], { clientApproves: true, group: "3D elevation" }),
        task("pd-elev-2", "Opt 2 - Elevation", "design", A, [B], { clientApproves: true, group: "3D elevation" }),
        task("pd-elev-3", "Opt 3 - Elevation", "design", A, [B], { clientApproves: true, group: "3D elevation" }),
        task("pd-elev-final", "3D final elevation", "design", A, [B], { clientApproves: true, group: "3D elevation" }),
      ],
    },
    {
      id: "final-approval",
      milestone: null,
      name: "Final Approval & Mobilization",
      short: "Design and cost approval",
      phase: "pre-construction",
      clock: "pre",
      from: 5,
      to: 7,
      tasks: [
        task("fa-pre-structure", "Design & cost approval - Pre structure", "approval", A, [B], { clientApproves: true }),
        task("fa-post-structure", "Design & cost approval - Post structure", "approval", A, [], { clientApproves: true }),
        task("fa-bom", "BOM", "approval", A, []),
        task("fa-estimate", "Final estimation", "approval", F, [B], { clientApproves: true }),
        task("fa-advance", "Receipt of mobilization advance (Milestone 1)", "payment", F, [B], { instalment: 1 }),
      ],
    },
    {
      id: "initiation",
      milestone: null,
      name: "Project Initiation",
      short: "Technical drawings",
      phase: "pre-construction",
      clock: "pre",
      from: 8,
      to: 8,
      tasks: [
        selection("pi-floor-plans", "Floor plans", { clientApproves: false, support: [A], group: DRAWINGS }),
        selection("pi-elevations", "Elevations", { clientApproves: false, support: [A], group: DRAWINGS }),
        selection("pi-sections", "Sections", { clientApproves: false, support: [A], group: DRAWINGS }),
        selection("pi-structural", "Structural details", { clientApproves: false, support: [A], group: DRAWINGS }),
        selection("pi-schedule", "Project schedule", { clientApproves: false, support: [A], group: DRAWINGS }),
        work("pi-verify", "Drawing verifications & approval"),
      ],
    },
    {
      id: "m1",
      milestone: 1,
      name: "Milestone 1",
      short: "Footing and plinth",
      phase: "construction",
      clock: "construction",
      from: 2,
      to: 9,
      checkWeek: 7,
      tasks: [
        selection("m1-mep", "Electrical & plumbing drawings", { clientApproves: false, support: [A], group: "MEP" }),
        work("m1-earthwork", "Earthwork & site mobilisation"),
        work("m1-footing", "Footing"),
        work("m1-pedestal", "Pedestal"),
        work("m1-plinth", "Plinth"),
        work("m1-sump", "UG sump"),
      ],
    },
    {
      id: "m2",
      milestone: 2,
      name: "Milestone 2",
      short: "Ground floor block work",
      phase: "construction",
      clock: "construction",
      from: 10,
      to: 13,
      checkWeek: 11,
      tasks: [receipt(2), selection("m2-grill", "Window & skylight grill"), work("m2-gf-blocks", "Ground floor block work", [])],
    },
    {
      id: "m3",
      milestone: 3,
      name: "Milestone 3",
      short: "Ground floor roof slab",
      phase: "construction",
      clock: "construction",
      from: 13,
      to: 15,
      checkWeek: 13,
      tasks: [receipt(3), work("m3-gf-slab", "GF roof slab", [])],
    },
    {
      id: "m4",
      milestone: 4,
      name: "Milestone 4",
      short: "First floor block work",
      phase: "construction",
      clock: "construction",
      from: 16,
      to: 19,
      checkWeek: 17,
      tasks: [receipt(4), selection("m4-door-frames", "Door frames"), work("m4-ff-blocks", "FF block work", [])],
    },
    {
      id: "m5",
      milestone: 5,
      name: "Milestone 5",
      short: "First floor roof slab",
      phase: "construction",
      clock: "construction",
      from: 19,
      to: 21,
      checkWeek: 19,
      tasks: [receipt(5), work("m5-ff-slab", "FF roof slab", [])],
    },
    {
      id: "m6",
      milestone: 6,
      name: "Milestone 6",
      short: "Second floor block work and roof slab",
      phase: "construction",
      clock: "construction",
      from: 22,
      to: 26,
      checkWeek: 24,
      tasks: [
        receipt(6),
        selection("m6-handrails", "Staircase & balcony handrails"),
        work("m6-sf-blocks", "SF block work", []),
        work("m6-roof-slab", "Roof slab", []),
      ],
    },
    {
      id: "m7",
      milestone: 7,
      name: "Milestone 7",
      short: "Plumbing and electrical",
      phase: "construction",
      clock: "construction",
      from: 26,
      to: 28,
      checkWeek: 26,
      tasks: [
        receipt(7),
        selection("m7-tiles-shutters", "Selection of tiles & door shutters"),
        work("m7-plumbing", "Plumbing", []),
        work("m7-electrical", "Electrical", []),
      ],
    },
    {
      id: "m8",
      milestone: 8,
      name: "Milestone 8",
      short: "Plastering",
      phase: "construction",
      clock: "construction",
      from: 29,
      to: 37,
      checkWeek: 35,
      tasks: [
        receipt(8),
        selection("m8-tile-schedule", "Tile schedule for flooring and bathroom"),
        work("m8-plastering", "Plastering (internal & external)", []),
      ],
    },
    {
      id: "m9",
      milestone: 9,
      name: "Milestone 9",
      short: "Flooring and doors",
      phase: "construction",
      clock: "construction",
      from: 38,
      to: 42,
      checkWeek: 40,
      tasks: [
        receipt(9),
        selection("m9-switches", "Switch - selection and finalising"),
        selection("m9-gates", "Main gate & wicket gate design finalisation"),
        work("m9-flooring", "Flooring", []),
        work("m9-doors", "Door installation", []),
      ],
    },
    {
      id: "m10",
      milestone: 10,
      name: "Milestone 10",
      short: "Windows, painting and finishes",
      phase: "construction",
      clock: "construction",
      from: 43,
      to: 48,
      tasks: [
        receipt(10),
        work("m10-windows", "Windows installation", []),
        work("m10-painting", "Painting", []),
        work("m10-finishes", "Finishes (sanitaryware & electrical switches)", []),
        work("m10-compound", "Compound wall", []),
      ],
    },
    {
      id: "inspection",
      milestone: null,
      name: "Inspection & Audit",
      short: "Final inspection",
      phase: "close-out",
      clock: "construction",
      from: 49,
      to: 49,
      tasks: [task("in-final", "Final inspection", "approval", S, [A, B])],
    },
    {
      id: "handover",
      milestone: null,
      name: "Handover",
      short: "Handover",
      phase: "close-out",
      clock: "construction",
      from: 50,
      to: 50,
      tasks: [task("ho-noc", "NOC", "approval", S, [A, B])],
    },
  ],
  instalments: [
    { n: 0, label: "Sign-up", percent: 5, clock: "pre", week: 1, fallsIn: "sign-up", unlocks: null, taskId: "su-advance" },
    { n: 1, label: "Instalment 1", percent: 15, clock: "construction", week: 1, fallsIn: "initiation", unlocks: 1, taskId: "fa-advance" },
    { n: 2, label: "Instalment 2", percent: 15, clock: "construction", week: 8, fallsIn: "m1", unlocks: 2, taskId: "m2-receipt" },
    { n: 3, label: "Instalment 3", percent: 10, clock: "construction", week: 12, fallsIn: "m2", unlocks: 3, taskId: "m3-receipt" },
    { n: 4, label: "Instalment 4", percent: 10, clock: "construction", week: 14, fallsIn: "m3", unlocks: 4, taskId: "m4-receipt" },
    { n: 5, label: "Instalment 5", percent: 10, clock: "construction", week: 18, fallsIn: "m4", unlocks: 5, taskId: "m5-receipt" },
    { n: 6, label: "Instalment 6", percent: 8, clock: "construction", week: 20, fallsIn: "m5", unlocks: 6, taskId: "m6-receipt" },
    { n: 7, label: "Instalment 7", percent: 8, clock: "construction", week: 25, fallsIn: "m6", unlocks: 7, taskId: "m7-receipt" },
    { n: 8, label: "Instalment 8", percent: 8, clock: "construction", week: 27, fallsIn: "m7", unlocks: 8, taskId: "m8-receipt" },
    { n: 9, label: "Instalment 9", percent: 8, clock: "construction", week: 36, fallsIn: "m8", unlocks: 9, taskId: "m9-receipt" },
    { n: 10, label: "Instalment 10", percent: 3, clock: "construction", week: 41, fallsIn: "m9", unlocks: 10, taskId: "m10-receipt" },
  ],
};

/** Tracker rows that run across the build with no task of their own. */
export const WORKFLOW_TRACKS: { id: string; name: string; clock: WorkflowClock; from: number; to: number }[] = [
  { id: "plumbing-finals", name: "Plumbing finals", clock: "construction", from: 1, to: 48 },
];

/** Every task in order, with its stage. */
export const WORKFLOW_TASKS: (WorkflowTask & { stage: WorkflowStageId })[] = WORKFLOW_TEMPLATE.stages.flatMap((s) =>
  s.tasks.map((t) => ({ ...t, stage: s.id })),
);

export function workflowStage(id: WorkflowStageId): WorkflowStage {
  const stage = WORKFLOW_TEMPLATE.stages.find((s) => s.id === id);
  if (!stage) throw new Error(`No workflow stage ${id}`);
  return stage;
}

/** The stage of construction milestone n (1 to 10). */
export function milestoneStage(n: number): WorkflowStage | undefined {
  return WORKFLOW_TEMPLATE.stages.find((s) => s.milestone === n);
}

export function workflowTask(id: string): (WorkflowTask & { stage: WorkflowStageId }) | undefined {
  return WORKFLOW_TASKS.find((t) => t.id === id);
}

export function instalmentOf(n: number): WorkflowInstalment | undefined {
  return WORKFLOW_TEMPLATE.instalments.find((i) => i.n === n);
}

/** The milestone an instalment falls inside: 0 while it falls before construction. */
export function fallsInMilestone(n: number): number {
  const i = instalmentOf(n);
  return i ? (workflowStage(i.fallsIn).milestone ?? 0) : 0;
}

/** Who does a task in the portal: `portal` when set, else the workbook's manager and support. */
export function workingRoles(t: WorkflowTask): { manager: WorkflowRole; support: WorkflowRole[] } {
  return t.portal ?? { manager: t.manager, support: t.support };
}

/** The week the tracker marks inside milestone n (1 to 9) for the engineer's check, or null. */
export function checkWeekOf(milestone: number): number | null {
  return milestoneStage(milestone)?.checkWeek ?? null;
}

/** A role in plain words, as the workbook names the teams. */
export const ROLE_WORDS: Record<WorkflowRole, string> = {
  client: "Client",
  business: "Business team",
  finance: "Accounts & Finance",
  architect: "Project Architect",
  site: "Project Engineer",
};

export const TRACK_WORDS: Record<WorkflowTrack, string> = {
  design: "Design",
  engineering: "Engineering",
  payment: "Payment",
  approval: "Approval",
};
