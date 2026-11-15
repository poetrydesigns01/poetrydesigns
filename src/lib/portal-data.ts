/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { PersonId, ProjectId } from "./firm-data";
import { workflowTask } from "./workflow-template";

// Seed for the redesigned portal: payment gating, the client's design items, the timeline,
// chat read receipts and the site engineer's tasks. The stages and tasks themselves come
// from Poetry's workflow (workflow-template.ts) and each project's generated plan
// (workflow-plan.ts); this file only lays the facts over them: the versions the client saw,
// the drawings, crews and materials a task needs. Every person, sheet, crew and date is made
// up. Nothing here reads a clock. Derivations are in portal.ts.

// ---- Payment gating ----

/** Days the client has to pay once a demand letter is raised. Sample. */
export const PAYMENT_DAYS = 7;

// ---- Material requests ----

/** A material request must reach procurement at least this many days before it is needed on site. */
export const REQUEST_LEAD_DAYS = 7;

// ---- Timeline ----

/**
 * The construction milestone from which a client change adds its days, by change id.
 * A change approved before the project's plan was generated is already in the plan.
 */
export const changeStartsAt: Record<string, number> = {
  "study-room": 1,
  "terrace-jacuzzi": 6,
  "living-glazing": 10,
};

// ---- Design items ----

/**
 * The client's design items, in the workbook's order: the floor plan drafts, the 3D
 * elevation options, the design and cost approvals, the final estimate, then the selections
 * made during construction.
 */
export type DesignStage = "floor-plan" | "elevation" | "approvals" | "estimate" | "selections";

/** Which template tasks make each stage. Every one is a task the client approves. */
export const DESIGN_STAGES: { id: DesignStage; label: string; tasks: string[] }[] = [
  { id: "floor-plan", label: "Floor plan", tasks: ["pd-draft-1", "pd-draft-2", "pd-draft-3", "pd-draft-final"] },
  { id: "elevation", label: "3D elevation", tasks: ["pd-elev-1", "pd-elev-2", "pd-elev-3", "pd-elev-final"] },
  { id: "approvals", label: "Approvals", tasks: ["fa-pre-structure", "fa-post-structure"] },
  // The BOM is the Project Architect's alone in the workbook; the client approves the final estimation.
  { id: "estimate", label: "Final estimate", tasks: ["fa-estimate"] },
  {
    id: "selections",
    label: "Selections",
    tasks: ["m2-grill", "m4-door-frames", "m6-handrails", "m7-tiles-shutters", "m8-tile-schedule", "m9-switches", "m9-gates"],
  },
];

/** Short titles the client reads, by template task id. The workbook's names stay on the plan. */
export const DESIGN_TITLES: Record<string, string> = {
  "pd-draft-1": "Draft 1",
  "pd-draft-2": "Draft 2",
  "pd-draft-3": "Draft 3",
  "pd-draft-final": "Final draft",
  "pd-elev-1": "Option 1",
  "pd-elev-2": "Option 2",
  "pd-elev-3": "Option 3",
  "pd-elev-final": "Final elevation",
  "fa-pre-structure": "Design & cost, pre-structure",
  "fa-post-structure": "Design & cost, post-structure",
  "fa-bom": "BOM",
  "fa-estimate": "Final estimation",
  "m2-grill": "Window & skylight grill",
  "m4-door-frames": "Door frames",
  "m6-handrails": "Staircase & balcony handrails",
  "m7-tiles-shutters": "Tiles & door shutters",
  "m8-tile-schedule": "Tile schedule",
  "m9-switches": "Switches",
  "m9-gates": "Main gate & wicket gate",
};

/** Sheet numbers, by template task id. Sample. */
export const DESIGN_SHEETS: Record<string, string> = {
  "pd-draft-1": "FP-D1",
  "pd-draft-2": "FP-D2",
  "pd-draft-3": "FP-D3",
  "pd-draft-final": "FP-F",
  "pd-elev-1": "EL-O1",
  "pd-elev-2": "EL-O2",
  "pd-elev-3": "EL-O3",
  "pd-elev-final": "EL-F",
  "fa-pre-structure": "DC-01",
  "fa-post-structure": "DC-02",
  "fa-bom": "BOM-01",
  "fa-estimate": "EST-01",
  "m2-grill": "SL-02",
  "m4-door-frames": "SL-04",
  "m6-handrails": "SL-06",
  "m7-tiles-shutters": "SL-07",
  "m8-tile-schedule": "SL-08",
  "m9-switches": "SL-09A",
  "m9-gates": "SL-09B",
};

export type DesignItemVersionSeed = {
  version: number;
  uploadedAt: string;
  note?: string;
  /** When the client first opened this version. */
  viewedAt?: string;
  status: "waiting" | "approved" | "modify";
  decidedAt?: string;
  comment?: string;
};

export type DesignItemSeed = {
  /** The template task id: "pd-draft-1", "m4-door-frames". Unique within a project. */
  id: string;
  projectId: ProjectId;
  stage: DesignStage;
  title: string;
  sheet: string;
  /** Who prepared it; by default the plan task's assignee. */
  preparedBy?: PersonId;
  /** Oldest first. Empty while the item is not prepared yet. */
  versions: DesignItemVersionSeed[];
};

function item(projectId: ProjectId, id: string, versions: DesignItemVersionSeed[], preparedBy?: PersonId): DesignItemSeed {
  const stage = DESIGN_STAGES.find((s) => s.tasks.includes(id))?.id ?? "selections";
  return { id, projectId, stage, title: DESIGN_TITLES[id] ?? id, sheet: DESIGN_SHEETS[id] ?? id, preparedBy, versions };
}

/** One version approved: uploaded, opened the same evening, approved on `decided`. */
function approved(uploadedAt: string, viewedAt: string, decidedAt: string, comment?: string): DesignItemVersionSeed {
  return { version: 1, uploadedAt, viewedAt, status: "approved", decidedAt, comment };
}

/**
 * Seeded versions. Iyer Residence: every item before construction approved, with the date and
 * time as proof; the window grill (milestone 2) approved on its second version; the door
 * frames (milestone 4) waiting for the client; later selections not prepared yet. Items of
 * other projects not listed here follow their plan (see portal.ts).
 */
export const seedDesignItems: DesignItemSeed[] = [
  item("iyer", "pd-draft-1", [approved("2026-06-02T11:00", "2026-06-02T20:40", "2026-06-04T21:15", "Prayer room to face east.")], "ananya"),
  item(
    "iyer",
    "pd-draft-2",
    [approved("2026-06-09T12:00", "2026-06-09T21:05", "2026-06-11T20:30", "Add a study next to the master bedroom.")],
    "ananya",
  ),
  item("iyer", "pd-draft-3", [approved("2026-06-16T11:30", "2026-06-16T19:50", "2026-06-18T21:00")], "ananya"),
  item("iyer", "pd-draft-final", [approved("2026-06-22T15:00", "2026-06-22T21:10", "2026-06-24T20:45")], "ananya"),
  item("iyer", "pd-elev-1", [approved("2026-06-15T12:00", "2026-06-15T20:30", "2026-06-19T20:10")], "vikram"),
  item("iyer", "pd-elev-2", [approved("2026-06-15T12:00", "2026-06-15T20:35", "2026-06-19T20:12", "This one, with the overhang.")], "vikram"),
  item("iyer", "pd-elev-3", [approved("2026-06-15T12:00", "2026-06-15T20:40", "2026-06-19T20:14")], "vikram"),
  item("iyer", "pd-elev-final", [approved("2026-06-26T11:00", "2026-06-26T20:00", "2026-07-01T21:00", "Approved. We love the overhang.")], "vikram"),
  item("iyer", "fa-pre-structure", [approved("2026-06-29T11:00", "2026-06-29T21:00", "2026-07-02T20:10")], "vikram"),
  item("iyer", "fa-post-structure", [approved("2026-07-03T12:00", "2026-07-03T20:30", "2026-07-06T19:30")], "vikram"),
  item("iyer", "fa-estimate", [approved("2026-07-08T16:00", "2026-07-08T21:15", "2026-07-10T21:00")], "divya"),
  item(
    "iyer",
    "m2-grill",
    [
      {
        version: 1,
        uploadedAt: "2026-09-14T15:00",
        viewedAt: "2026-09-14T21:00",
        status: "modify",
        decidedAt: "2026-09-16T21:20",
        comment: "Simpler bars on the skylight, no scrollwork.",
      },
      {
        version: 2,
        uploadedAt: "2026-09-17T12:00",
        note: "Plain flat bars at 100 mm.",
        viewedAt: "2026-09-17T20:10",
        status: "approved",
        decidedAt: "2026-09-18T20:30",
      },
    ],
    "ananya",
  ),
  item(
    "iyer",
    "m4-door-frames",
    [
      {
        version: 1,
        uploadedAt: "2026-11-06T16:00",
        note: "Teak for the main door, sal wood inside.",
        viewedAt: "2026-11-06T21:30",
        status: "waiting",
      },
    ],
    "ananya",
  ),
  item("iyer", "m6-handrails", [], "ananya"),
  item("iyer", "m7-tiles-shutters", [], "ananya"),
  item("iyer", "m8-tile-schedule", [], "ananya"),
  item("iyer", "m9-switches", [], "ananya"),
  item("iyer", "m9-gates", [], "ananya"),
  // D'Souza Villa, milestone 2: the grill on its second version, with the client.
  item(
    "dsouza",
    "m2-grill",
    [
      {
        version: 1,
        uploadedAt: "2026-10-26T15:00",
        viewedAt: "2026-10-26T21:00",
        status: "modify",
        decidedAt: "2026-10-28T20:00",
        comment: "Fewer bars on the study window.",
      },
      { version: 2, uploadedAt: "2026-11-02T16:00", status: "waiting" },
    ],
    "ananya",
  ),
  // Nair Farmhouse, milestone 8: the tile schedule with the client.
  item(
    "nair",
    "m8-tile-schedule",
    [{ version: 1, uploadedAt: "2026-11-05T15:00", viewedAt: "2026-11-05T20:20", status: "waiting" }],
    "karan",
  ),
];

// ---- Chat read receipts ----

/** When someone last opened a thread before the demo. */
export const seedThreadReads: { projectId: ProjectId; by: PersonId; at: string }[] = [
  { projectId: "iyer", by: "kavya", at: "2026-10-31T10:12" },
  { projectId: "iyer", by: "vikram", at: "2026-11-07T19:50" },
  { projectId: "iyer", by: "meera", at: "2026-11-09T21:40" },
  { projectId: "nair", by: "suresh", at: "2026-11-10T11:05" },
];

// ---- Site tasks: drawings, work orders, materials ----

/** An architect drawing a site task cannot go ahead without. */
export type DrawingSeed = {
  id: string;
  projectId: ProjectId;
  sheet: string;
  title: string;
  by: PersonId;
  neededBy: string;
  receivedAt?: string;
};

export const seedDrawings: DrawingSeed[] = [
  { id: "dr-iyer-a102", projectId: "iyer", sheet: "A-102", title: "First floor plan", by: "ananya", neededBy: "2026-10-24", receivedAt: "2026-07-17T12:00" },
  { id: "dr-iyer-s212", projectId: "iyer", sheet: "S-212", title: "Lintel and sunshade detail, first floor", by: "ananya", neededBy: "2026-11-09" },
  { id: "dr-iyer-a401", projectId: "iyer", sheet: "A-401", title: "Door schedule and frame sizes", by: "ananya", neededBy: "2026-11-18" },
  { id: "dr-iyer-s202", projectId: "iyer", sheet: "S-202", title: "First floor roof slab reinforcement", by: "vikram", neededBy: "2026-11-16", receivedAt: "2026-11-04T11:30" },
  { id: "dr-iyer-e201", projectId: "iyer", sheet: "E-201", title: "Electrical conduit layout, first floor slab", by: "ananya", neededBy: "2026-11-20" },
  { id: "dr-iyer-p201", projectId: "iyer", sheet: "P-201", title: "Plumbing sleeves, first floor slab", by: "ananya", neededBy: "2026-11-20" },
  { id: "dr-nair-a140", projectId: "nair", sheet: "A-140", title: "Plaster bands and drip moulds", by: "ananya", neededBy: "2026-10-05", receivedAt: "2026-09-30T17:20" },
  { id: "dr-nair-a130", projectId: "nair", sheet: "A-130", title: "Bathroom tile elevations", by: "karan", neededBy: "2026-11-16" },
  { id: "dr-nair-a121", projectId: "nair", sheet: "A-121", title: "Floor pattern layout", by: "ananya", neededBy: "2026-11-26", receivedAt: "2026-10-16T15:00" },
  { id: "dr-nair-a150", projectId: "nair", sheet: "A-150", title: "Door schedule", by: "karan", neededBy: "2026-11-24" },
  { id: "dr-dsouza-a101", projectId: "dsouza", sheet: "A-101", title: "Ground floor plan", by: "ananya", neededBy: "2026-10-30", receivedAt: "2026-09-02T12:00" },
  { id: "dr-bhat-s202", projectId: "bhat", sheet: "S-202", title: "First floor roof slab reinforcement", by: "lakshmi", neededBy: "2026-11-05", receivedAt: "2026-10-29T16:00" },
];

export type WorkOrderStatus = "requested" | "booked" | "on-site" | "done";

/** Labour or a service a site task needs: "Masonry crew, 24 days". */
export type WorkOrderSeed = {
  id: string;
  projectId: ProjectId;
  /** The site task: `${projectId}-${templateTaskId}`. */
  taskId: string;
  trade: string;
  crew?: string;
  days: number;
  startOn: string;
  status: WorkOrderStatus;
  requestedAt: string;
  by: PersonId;
};

export const seedWorkOrders: WorkOrderSeed[] = [
  { id: "WO-2026-031", projectId: "nair", taskId: "nair-m8-plastering", trade: "Plastering crew", crew: "Basavaraj and team", days: 40, startOn: "2026-09-28", status: "on-site", requestedAt: "2026-09-20T09:00", by: "suresh" },
  { id: "WO-2026-032", projectId: "nair", taskId: "nair-m8-plastering", trade: "Scaffolding hire", crew: "Sri Ganesh Scaffolds", days: 30, startOn: "2026-10-12", status: "on-site", requestedAt: "2026-10-05T10:30", by: "suresh" },
  { id: "WO-2026-033", projectId: "nair", taskId: "nair-m9-flooring", trade: "Tiling crew", days: 14, startOn: "2026-11-30", status: "requested", requestedAt: "2026-11-09T09:20", by: "suresh" },
  { id: "WO-2026-034", projectId: "nair", taskId: "nair-m9-doors", trade: "Carpenter", days: 6, startOn: "2026-12-14", status: "requested", requestedAt: "2026-11-10T08:40", by: "manjunath" },
  { id: "WO-2026-040", projectId: "iyer", taskId: "iyer-m4-ff-blocks", trade: "Masonry crew", crew: "Mallesh and team", days: 24, startOn: "2026-10-26", status: "on-site", requestedAt: "2026-10-16T09:00", by: "suresh" },
  { id: "WO-2026-041", projectId: "iyer", taskId: "iyer-m4-ff-blocks", trade: "Curing helper", crew: "Ramesh", days: 21, startOn: "2026-10-23", status: "on-site", requestedAt: "2026-10-21T09:00", by: "suresh" },
  { id: "WO-2026-042", projectId: "iyer", taskId: "iyer-m4-door-frames", trade: "Carpenter", days: 3, startOn: "2026-11-19", status: "requested", requestedAt: "2026-11-09T08:30", by: "suresh" },
  { id: "WO-2026-043", projectId: "iyer", taskId: "iyer-m5-ff-slab", trade: "Shuttering crew", crew: "Mallesh and team", days: 6, startOn: "2026-11-23", status: "booked", requestedAt: "2026-11-04T09:30", by: "suresh" },
  { id: "WO-2026-044", projectId: "iyer", taskId: "iyer-m5-ff-slab", trade: "Bar bending crew", days: 5, startOn: "2026-11-26", status: "requested", requestedAt: "2026-11-10T08:10", by: "manjunath" },
  { id: "WO-2026-045", projectId: "iyer", taskId: "iyer-m5-ff-slab", trade: "Pour crew and pump", days: 1, startOn: "2026-12-03", status: "requested", requestedAt: "2026-11-10T08:35", by: "manjunath" },
  { id: "WO-2026-046", projectId: "dsouza", taskId: "dsouza-m2-gf-blocks", trade: "Masonry crew", crew: "Hanumanthu and team", days: 24, startOn: "2026-11-02", status: "on-site", requestedAt: "2026-10-26T09:00", by: "ravi" },
  { id: "WO-2026-047", projectId: "bhat", taskId: "bhat-m5-ff-slab", trade: "Shuttering crew", crew: "Mallesh and team", days: 6, startOn: "2026-11-02", status: "done", requestedAt: "2026-10-27T09:00", by: "ravi" },
  { id: "WO-2026-048", projectId: "bhat", taskId: "bhat-m5-ff-slab", trade: "Pour crew and pump", days: 1, startOn: "2026-11-16", status: "booked", requestedAt: "2026-11-06T09:00", by: "ravi" },
];

/** A material a task will need that has not been requested yet. `material` is a catalogue id. */
export type PlannedMaterial = { material: string; sub: string; qty: number; unit: string; neededBy: string };

/**
 * What a plan task needs on site, laid over the workflow. The task's name, dates, owner and
 * progress come from the plan; `id` is the plan task id, `${projectId}-${templateId}`.
 */
export type SiteTaskSeed = {
  id: string;
  projectId: ProjectId;
  /** The workflow template task: "m4-ff-blocks". */
  templateId: string;
  /** Where on site: "First floor". */
  area?: string;
  /** Optional named steps; `stepsDone` of them are done. */
  steps?: string[];
  stepsDone?: number;
  /** Material requests raised for this task: "MR-2026-0136", or one line, "MR-2026-0140#0140-2". */
  requests: string[];
  /** Materials still to request. */
  materials: PlannedMaterial[];
  workOrders: string[];
  drawings: string[];
};

function siteTask(projectId: ProjectId, templateId: string, rest: Omit<SiteTaskSeed, "id" | "projectId" | "templateId">): SiteTaskSeed {
  return { id: `${projectId}-${templateId}`, projectId, templateId, ...rest };
}

export const seedSiteTasks: SiteTaskSeed[] = [
  // Iyer Residence: milestone 4 under way, milestone 5 next.
  siteTask("iyer", "m4-ff-blocks", {
    area: "First floor",
    requests: ["MR-2026-0138", "MR-2026-0127", "MR-2026-0136"],
    materials: [{ material: "blocks", sub: "6 inch", qty: 1200, unit: "nos", neededBy: "2026-11-16" }],
    workOrders: ["WO-2026-040", "WO-2026-041"],
    drawings: ["dr-iyer-a102", "dr-iyer-s212"],
  }),
  siteTask("iyer", "m4-door-frames", {
    area: "All floors",
    requests: [],
    materials: [],
    workOrders: ["WO-2026-042"],
    drawings: ["dr-iyer-a401"],
  }),
  siteTask("iyer", "m5-ff-slab", {
    area: "First floor roof",
    requests: [],
    materials: [
      { material: "steel", sub: "12 mm", qty: 1400, unit: "kg", neededBy: "2026-11-25" },
      { material: "wire", sub: "18 gauge", qty: 60, unit: "kg", neededBy: "2026-11-25" },
      { material: "conduit", sub: "25 mm", qty: 60, unit: "lengths", neededBy: "2026-11-26" },
      { material: "cement", sub: "OPC 53 grade", qty: 220, unit: "bags", neededBy: "2026-12-01" },
      { material: "aggregate", sub: "20 mm", qty: 900, unit: "cu ft", neededBy: "2026-12-01" },
      { material: "sand", sub: "M-sand for concrete", qty: 700, unit: "cu ft", neededBy: "2026-12-01" },
    ],
    workOrders: ["WO-2026-043", "WO-2026-044", "WO-2026-045"],
    drawings: ["dr-iyer-s202", "dr-iyer-e201", "dr-iyer-p201"],
  }),
  // Nair Farmhouse: milestone 8 under way, milestone 9 next.
  siteTask("nair", "m8-plastering", {
    area: "Internal and external",
    requests: ["MR-2026-0124"],
    materials: [{ material: "cement", sub: "PPC", qty: 180, unit: "bags", neededBy: "2026-11-18" }],
    workOrders: ["WO-2026-031", "WO-2026-032"],
    drawings: ["dr-nair-a140"],
  }),
  siteTask("nair", "m8-tile-schedule", { requests: [], materials: [], workOrders: [], drawings: ["dr-nair-a130"] }),
  siteTask("nair", "m9-flooring", {
    area: "All floors and the pool deck",
    requests: ["MR-2026-0140"],
    materials: [{ material: "tiles", sub: "Vitrified 600 × 600 mm", qty: 240, unit: "sq ft", neededBy: "2026-12-02" }],
    workOrders: ["WO-2026-033"],
    drawings: ["dr-nair-a121", "dr-nair-a130"],
  }),
  siteTask("nair", "m9-doors", { requests: [], materials: [], workOrders: ["WO-2026-034"], drawings: ["dr-nair-a150"] }),
  // D'Souza Villa: milestone 2 under way.
  siteTask("dsouza", "m2-gf-blocks", {
    area: "Ground floor",
    requests: ["MR-2026-0133", "MR-2026-0139"],
    materials: [],
    workOrders: ["WO-2026-046"],
    drawings: ["dr-dsouza-a101"],
  }),
  // Bhat Residence: milestone 5 under way.
  siteTask("bhat", "m5-ff-slab", {
    area: "First floor roof",
    requests: ["MR-2026-0141"],
    materials: [],
    workOrders: ["WO-2026-047", "WO-2026-048"],
    drawings: ["dr-bhat-s202"],
  }),
];

/** A site task's name: the workflow task's name. Ids are `${projectId}-${templateId}`. */
export function siteTaskTitle(id: string): string {
  const seed = seedSiteTasks.find((t) => t.id === id);
  const templateId = seed?.templateId ?? id.replace(/^[a-z]+(-cottage)?-/, "");
  return workflowTask(templateId)?.name ?? id;
}
