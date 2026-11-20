/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
// Fictional data for the UI/UX demo. Every person, address and amount is made up.
// The payment rows follow Poetry's workflow (workflow-template.ts): the sign-up advance and
// instalments 1 to 10, instalment n opening construction milestone n. This file imports
// nothing, so its dates are written out; they match the plan generated for Iyer Residence
// (pre-construction from 25 May 2026, construction week 1 from 13 Jul 2026).

export const GST_RATE = 0.18;

/** The demo is frozen on this day so screens always tell the same story. */
export const TODAY = "2026-11-11";

export const client = {
  name: "Meera Iyer",
  firstName: "Meera",
  coOwner: "Arjun Iyer",
};

export const project = {
  /** Layout CFS, plot 504, Meera Iyer: projectCode() in workflow-plan.ts gives the same. */
  code: "CFS_504_MI",
  /** The residential layout the plot is in. A sample layout code (CFS comes from Poetry's workflow sheet). */
  layout: "CFS",
  plotNo: "504",
  name: "Iyer Residence",
  category: "City villa",
  address: "Kanakapura Road, Bengaluru 560062",
  plotArea: 2993,
  builtUpArea: 3350,
  ratePerSqFt: 2600,
  agreementSignedOn: "2026-05-25",
  initialEstimate: 8320000,
  /** How far the house is built: 0 plinth, 1 ground floor, 2 first floor, 3 second floor, 4 roof. */
  builtUpTo: 1,
  /** The handover week of the plan: construction week 50, 21 to 27 Jun 2027. */
  handoverOn: "2027-06-27",
};

/** What the site last reported. Sample values. */
export const site = {
  lastUpdatedOn: "2026-11-10",
  lastUpdatedBy: "Suresh Gowda",
  curing: { what: "The slab over the ground floor", startedOn: "2026-10-22", days: 21 },
};

export type Contact = {
  level: string;
  name: string;
  role: string;
  phone: string;
  /** @deprecated No response-time promises are made. Always empty; removed once the client home stops reading it. */
  responds?: string;
};

/** The office line, after the people. */
export const office: Contact = {
  level: "If you still need help",
  name: "Poetry Designs office",
  role: "Director's desk",
  phone: "+91 80 4000 5566",
};

/** As seeded. The client home reads the live team instead (the BD person who holds them, then the Project Head). */
export const contacts: Contact[] = [
  {
    level: "Your point of contact",
    name: "Rohan Menon",
    role: "Client relations",
    phone: "+91 98450 01100",
  },
  {
    level: "If that does not settle it",
    name: "Vikram Desai",
    role: "Project Head",
    phone: "+91 98450 03344",
  },
  office,
];

export type MilestoneStatus = "paid" | "awaiting-approval" | "in-progress" | "upcoming";

export type Milestone = {
  id: number;
  name: string;
  covers: string;
  percent: number;
  /** Amount before GST. */
  amount: number;
  status: MilestoneStatus;
  /**
   * Deprecated: no longer seeded. Row n is instalment n, which falls due by week inside
   * milestone n-1, so a row has no "work completed" date of its own; see `dueReachedOn`.
   * Set only from a stage.done of the milestone the instalment falls inside.
   */
  workCompletedOn?: string;
  /** The Monday the instalment's due week came (the letter went out the same day). */
  dueReachedOn?: string;
  paidOn?: string;
  letterNo?: string;
  letterIssuedOn?: string;
  expected?: string;
  /** "YYYY-MM-DDTHH:mm" when she accepted the stage as finished. */
  acceptedAt?: string;
  /** "YYYY-MM-DDTHH:mm" when the Project Head raised the payment. */
  raisedAt?: string;
  /** Who raised it, by name. */
  raisedBy?: string;
  /** "YYYY-MM-DDTHH:mm" when she approved the payment. */
  approvedAt?: string;
};

// Approved value is 87,10,000, split 5% at sign-up (on the initial estimate) and then
// 15, 15, 10, 10, 10, 8, 8, 8, 8, 3 percent; the shortfall from the study sits in instalment 1.
// Row n is instalment n: it falls due in its week inside milestone n-1 and must be received
// before milestone n starts. Milestone 4 is being built; instalment 5 is raised.
export const milestones: Milestone[] = [
  {
    id: 0,
    name: "Sign-up",
    covers: "Advance on signing the agreement, so design work can begin.",
    percent: 5,
    amount: 416000,
    status: "paid",
    paidOn: "2026-05-27",
  },
  {
    id: 1,
    name: "Footing and plinth",
    covers: "Earthwork & site mobilisation, Footing, Pedestal, Plinth, UG sump",
    percent: 15,
    amount: 1326000,
    status: "paid",
    dueReachedOn: "2026-07-13",
    paidOn: "2026-07-16",
    letterNo: "PD/DL/2026-27/0019",
    letterIssuedOn: "2026-07-13",
    raisedAt: "2026-07-13T10:00",
    raisedBy: "Vikram Desai",
    approvedAt: "2026-07-13T18:40",
  },
  {
    id: 2,
    name: "Ground floor block work",
    covers: "Ground floor block work",
    percent: 15,
    amount: 1306500,
    status: "paid",
    dueReachedOn: "2026-08-31",
    paidOn: "2026-09-07",
    letterNo: "PD/DL/2026-27/0024",
    letterIssuedOn: "2026-08-31",
    raisedAt: "2026-08-31T10:00",
    raisedBy: "Vikram Desai",
    approvedAt: "2026-09-01T21:02",
  },
  {
    id: 3,
    name: "Ground floor roof slab",
    covers: "GF roof slab",
    percent: 10,
    amount: 871000,
    status: "paid",
    dueReachedOn: "2026-09-28",
    paidOn: "2026-10-02",
    letterNo: "PD/DL/2026-27/0027",
    letterIssuedOn: "2026-09-28",
    raisedAt: "2026-09-28T10:30",
    raisedBy: "Vikram Desai",
    approvedAt: "2026-09-28T20:15",
  },
  {
    id: 4,
    name: "First floor block work",
    covers: "FF block work",
    percent: 10,
    amount: 871000,
    status: "paid",
    dueReachedOn: "2026-10-12",
    paidOn: "2026-10-19",
    letterNo: "PD/DL/2026-27/0030",
    letterIssuedOn: "2026-10-12",
    raisedAt: "2026-10-12T11:00",
    raisedBy: "Vikram Desai",
    approvedAt: "2026-10-13T19:40",
  },
  {
    id: 5,
    name: "First floor roof slab",
    covers: "FF roof slab",
    percent: 10,
    amount: 871000,
    status: "awaiting-approval",
    dueReachedOn: "2026-11-09",
    letterNo: "PD/DL/2026-27/0034",
    letterIssuedOn: "2026-11-09",
    raisedAt: "2026-11-09T10:15",
    raisedBy: "Vikram Desai",
  },
  {
    id: 6,
    name: "Second floor block work and roof slab",
    covers: "SF block work, Roof slab",
    percent: 8,
    amount: 696800,
    status: "upcoming",
    expected: "November 2026",
  },
  {
    id: 7,
    name: "Plumbing and electrical",
    covers: "Plumbing, Electrical",
    percent: 8,
    amount: 696800,
    status: "upcoming",
    expected: "December 2026",
  },
  {
    id: 8,
    name: "Plastering",
    covers: "Plastering (internal & external)",
    percent: 8,
    amount: 696800,
    status: "upcoming",
    expected: "January 2027",
  },
  {
    id: 9,
    name: "Flooring and doors",
    covers: "Flooring, Door installation",
    percent: 8,
    amount: 696800,
    status: "upcoming",
    expected: "March 2027",
  },
  {
    id: 10,
    name: "Windows, painting and finishes",
    covers: "Windows installation, Painting, Finishes (sanitaryware & electrical switches), Compound wall",
    percent: 3,
    amount: 261300,
    status: "upcoming",
    expected: "April 2027",
  },
];

export type DesignStatus = "awaiting" | "approved" | "changes-requested";

export type DesignVersion = {
  version: number;
  uploadedOn: string;
  uploadedBy: string;
  note: string;
  status: DesignStatus;
  decidedOn?: string;
  comment?: string;
};

export type Design = {
  id: string;
  title: string;
  kind: "Drawing" | "Specification";
  drawing: "plan" | "elevation" | "spec";
  sheet: string;
  /** Where this design is marked on the drawing of the house. */
  anchor: string;
  /** Decide-by, said as a building event. Only on designs that are waiting. */
  neededBefore?: string;
  /** The date a decision is needed by. Only on designs that are waiting. */
  decideBy?: string;
  /** What a late decision would hold up: "to keep the second floor walls rising on 4 Dec". */
  slips?: string;
  /** The documents in a specification package, in order. */
  documents?: string[];
  versions: DesignVersion[];
};

export const designs: Design[] = [
  {
    id: "terrace-plan",
    title: "Second floor and terrace plan",
    kind: "Drawing",
    drawing: "plan",
    sheet: "A-103",
    anchor: "design:terrace-plan",
    versions: [
      {
        version: 1,
        uploadedOn: "2026-06-16",
        uploadedBy: "Ananya Rao",
        note: "Second floor family room and open terrace.",
        status: "changes-requested",
        decidedOn: "2026-06-18",
        comment: "Please make the family room open onto the terrace with a wider door.",
      },
      {
        version: 2,
        uploadedOn: "2026-06-22",
        uploadedBy: "Ananya Rao",
        note: "Terrace door widened to 3.0 m and the staircase headroom moved to the north side, as you asked.",
        status: "approved",
        decidedOn: "2026-06-24",
      },
    ],
  },
  {
    id: "kitchen-spec",
    title: "Kitchen specification",
    kind: "Specification",
    drawing: "spec",
    sheet: "S-204",
    anchor: "design:kitchen-spec",
    documents: ["Kitchen specification sheet", "Sink and hob data sheet", "Chimney data sheet"],
    versions: [
      {
        version: 1,
        uploadedOn: "2026-07-06",
        uploadedBy: "Ananya Rao",
        note: "Counter, sink, hob, chimney and storage finishes for the kitchen.",
        status: "approved",
        decidedOn: "2026-07-08",
      },
    ],
  },
  {
    id: "front-elevation",
    title: "Front elevation",
    kind: "Drawing",
    drawing: "elevation",
    sheet: "A-201",
    anchor: "design:front-elevation",
    versions: [
      {
        version: 4,
        uploadedOn: "2026-06-26",
        uploadedBy: "Vikram Desai",
        note: "Final elevation with the cantilevered first floor and terrace railing.",
        status: "approved",
        decidedOn: "2026-07-01",
        comment: "Approved. We love the overhang.",
      },
    ],
  },
  {
    id: "first-floor-plan",
    title: "First floor plan",
    kind: "Drawing",
    drawing: "plan",
    sheet: "A-102",
    anchor: "design:first-floor-plan",
    versions: [
      {
        version: 2,
        uploadedOn: "2026-06-16",
        uploadedBy: "Ananya Rao",
        note: "Three bedrooms with the added study next to the master bedroom.",
        status: "approved",
        decidedOn: "2026-06-24",
      },
    ],
  },
  {
    id: "ground-floor-plan",
    title: "Ground floor plan",
    kind: "Drawing",
    drawing: "plan",
    sheet: "A-101",
    anchor: "design:ground-floor-plan",
    versions: [
      {
        version: 3,
        uploadedOn: "2026-06-16",
        uploadedBy: "Ananya Rao",
        note: "Living, dining, kitchen, guest bedroom and the verandah facing the garden.",
        status: "approved",
        decidedOn: "2026-06-24",
      },
    ],
  },
];

/** "declined" is kept for old saved decisions only; the client now asks for changes instead. */
export type ChangeStatus = "pending" | "approved" | "changes-asked" | "declined";

/** A revised specification sheet: one row per item, [what, as revised]. */
export type RevisedSpec = { sheet: string; title: string; rows: [string, string][] };

export type Change = {
  id: string;
  title: string;
  reason: "Added area" | "Beyond the allowance" | "Outside the agreement";
  raisedOn: string;
  /** "YYYY-MM-DDTHH:mm", or a plain date for older changes. */
  raisedAt: string;
  /** Who raised it, by name. */
  raisedBy: string;
  revisedSpec: RevisedSpec;
  summary: string;
  /** How the price was worked out, in words the client can check. */
  working: string;
  /** Cost before GST. */
  cost: number;
  delayDays: number;
  affects: string;
  validUntil?: string;
  status: ChangeStatus;
  decidedOn?: string;
  addendum?: string;
  /** Where this change is marked on the drawing of the house. */
  anchor: string;
  /** Short name used in sentences: "the jacuzzi". */
  short: string;
  /** Which payments the cost is added to, before GST. Must sum to cost. Sample split. */
  lands: { milestoneId: number; amount: number }[];
};

export const changes: Change[] = [
  {
    id: "terrace-jacuzzi",
    title: "Jacuzzi on the terrace",
    reason: "Outside the agreement",
    raisedOn: "2026-11-07",
    raisedAt: "2026-11-07T16:10",
    raisedBy: "Vikram Desai",
    revisedSpec: {
      sheet: "S-311",
      title: "Terrace jacuzzi specification, revised",
      rows: [
        ["Unit", "Acrylic jacuzzi, 2.1 m by 2.1 m, with heater and filter"],
        ["Seats", "Six, two of them loungers"],
        ["Slab", "Terrace slab under the unit thickened to 150 mm, extra 12 mm bars at 150 mm"],
        ["Waterproofing", "Two-coat polyurethane membrane, lapped 300 mm up the parapet"],
        ["Plumbing", "25 mm supply and 75 mm drain lines, run to the rainwater outlet"],
        ["Electrical", "Its own 32 A circuit with an earth leakage breaker"],
      ],
    },
    summary:
      "A six-seater jacuzzi on the second floor terrace. The slab under it needs extra steel, and the area needs its own waterproofing and plumbing lines.",
    working: "Jacuzzi unit and installation ₹1,65,000, slab strengthening ₹45,000, waterproofing and plumbing ₹30,000.",
    cost: 240000,
    delayDays: 12,
    affects: "Second floor block work and roof slab, then Plumbing and electrical",
    validUntil: "2026-11-22",
    status: "pending",
    anchor: "change:terrace-jacuzzi",
    short: "the jacuzzi",
    lands: [
      { milestoneId: 6, amount: 45000 },
      { milestoneId: 7, amount: 195000 },
    ],
  },
  {
    id: "living-glazing",
    title: "Larger living room windows",
    reason: "Beyond the allowance",
    raisedOn: "2026-11-03",
    raisedAt: "2026-11-03T15:30",
    raisedBy: "Vikram Desai",
    revisedSpec: {
      sheet: "W-02",
      title: "Living room window schedule, revised",
      rows: [
        ["Glazed area", "236 sq ft, up from the 180 sq ft allowance"],
        ["Frames", "Powder-coated aluminium, sliding and fixed panels"],
        ["Glass", "6 mm toughened, double glazed"],
        ["Lintel", "One continuous lintel over the garden wall"],
      ],
    },
    summary:
      "The living room windows grow from the agreed glazing allowance of 180 sq ft to 236 sq ft, to open the room to the garden.",
    working: "56 sq ft beyond the allowance × ₹1,500 per sq ft.",
    cost: 84000,
    delayDays: 4,
    affects: "Windows, painting and finishes",
    validUntil: "2026-11-18",
    status: "pending",
    anchor: "change:living-glazing",
    short: "the larger windows",
    lands: [{ milestoneId: 10, amount: 84000 }],
  },
  {
    id: "study-room",
    title: "Study next to the master bedroom",
    reason: "Added area",
    raisedOn: "2026-06-10",
    raisedAt: "2026-06-10T16:00",
    raisedBy: "Vikram Desai",
    revisedSpec: {
      sheet: "Draft 3",
      title: "Floor plan, draft 3",
      rows: [
        ["Study", "150 sq ft next to the master bedroom"],
        ["Built-up area", "3,350 sq ft, up from 3,200 sq ft"],
      ],
    },
    summary: "A study added on the first floor, which increases the built-up area from 3,200 to 3,350 sq ft.",
    working: "150 sq ft added × ₹2,600 per sq ft.",
    cost: 390000,
    delayDays: 9,
    affects: "Floor plan, before construction",
    status: "approved",
    decidedOn: "2026-06-12",
    addendum: "Addendum 1",
    anchor: "change:study-room",
    short: "the study",
    // Already inside the milestone amounts above.
    lands: [],
  },
];

export const credits = {
  preConstruction: { granted: 12, used: 12 },
  construction: { granted: 8, used: 5.5 },
  entries: [
    { date: "2026-11-04", phase: "Construction", topic: "Terrace door width and staircase headroom", with: "Ananya Rao", hours: 1.5 },
    { date: "2026-10-21", phase: "Construction", topic: "Electrical points for the first floor", with: "Vikram Desai", hours: 2 },
    { date: "2026-09-30", phase: "Construction", topic: "Railing height and design for the terrace", with: "Ananya Rao", hours: 1 },
    { date: "2026-09-12", phase: "Construction", topic: "Plumbing layout for the bathrooms", with: "Ananya Rao", hours: 1 },
    { date: "2026-06-30", phase: "Before construction", topic: "Final walkthrough of the elevation", with: "Vikram Desai", hours: 2 },
    { date: "2026-06-10", phase: "Before construction", topic: "Floor plan with the study", with: "Ananya Rao", hours: 3 },
    { date: "2026-06-03", phase: "Before construction", topic: "Floor plan, first draft", with: "Ananya Rao", hours: 3.5 },
    { date: "2026-05-28", phase: "Before construction", topic: "Brief, site visit and soil test", with: "Vikram Desai", hours: 3.5 },
  ],
};

export function withGst(amount: number) {
  const gst = Math.round(amount * GST_RATE);
  return { amount, gst, total: amount + gst };
}

// ---- Staff side ----

/** Kept for older screens. New staff code reads the eight projects in firm-data.ts. */
export const staffProjects = [
  { id: "iyer", name: "Iyer Residence", place: "Kanakapura Road" },
  { id: "nair", name: "Nair Farmhouse", place: "Devanahalli" },
  { id: "dsouza", name: "D'Souza Villa", place: "Sarjapur Road" },
];

export const catalogue = [
  { material: "Cement", unit: "bags", grades: ["OPC 43 grade", "OPC 53 grade", "PPC"] },
  { material: "Steel (TMT bars)", unit: "kg", grades: ["8 mm", "10 mm", "12 mm", "16 mm", "20 mm"] },
  { material: "Sand", unit: "cu ft", grades: ["M-sand (concrete)", "P-sand (plastering)"] },
  { material: "Aggregate", unit: "cu ft", grades: ["12 mm", "20 mm", "40 mm"] },
  { material: "Solid blocks", unit: "nos", grades: ["4 inch", "6 inch", "8 inch"] },
  { material: "Binding wire", unit: "kg", grades: ["18 gauge"] },
];

export type TaskStatus = "in-progress" | "planned" | "submitted" | "revision" | "accepted";

export type Task = {
  id: string;
  title: string;
  project: string;
  deliverable: string;
  assignedBy: string;
  assignedOn: string;
  due: string;
  dueLabel: string;
  status: TaskStatus;
  loggedHours: number;
  note?: string;
};

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Window detail for the ground-floor bedroom",
    project: "D'Souza Villa",
    deliverable: "PDF and source drawing",
    assignedBy: "Vikram Desai",
    assignedOn: "2026-11-09",
    due: "2026-11-11",
    dueLabel: "Today, 6:00 pm",
    status: "in-progress",
    loggedHours: 2,
  },
  {
    id: "t2",
    title: "Kitchen specification, second version",
    project: "Iyer Residence",
    deliverable: "Specification sheet (PDF)",
    assignedBy: "Vikram Desai",
    assignedOn: "2026-11-10",
    due: "2026-11-13",
    dueLabel: "Fri 13 Nov, 12:00 pm",
    status: "planned",
    loggedHours: 0,
  },
  {
    id: "t3",
    title: "Staircase railing detail",
    project: "Iyer Residence",
    deliverable: "PDF drawing",
    assignedBy: "Vikram Desai",
    assignedOn: "2026-11-04",
    due: "2026-11-10",
    dueLabel: "Tue 10 Nov, 6:00 pm",
    status: "revision",
    loggedHours: 3.5,
    note: "Baluster spacing is over 100 mm near the landing. Please tighten it and resubmit.",
  },
  {
    id: "t4",
    title: "Compound wall elevation",
    project: "Nair Farmhouse",
    deliverable: "PDF drawing",
    assignedBy: "Vikram Desai",
    assignedOn: "2026-11-05",
    due: "2026-11-10",
    dueLabel: "Tue 10 Nov, 6:00 pm",
    status: "submitted",
    loggedHours: 4,
  },
  {
    id: "t5",
    title: "Second floor and terrace plan, second version",
    project: "Iyer Residence",
    deliverable: "PDF drawing",
    assignedBy: "Vikram Desai",
    assignedOn: "2026-11-02",
    due: "2026-11-09",
    dueLabel: "Mon 9 Nov, 6:00 pm",
    status: "accepted",
    loggedHours: 6,
  },
];
