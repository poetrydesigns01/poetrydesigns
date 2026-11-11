// Fictional data for the UI/UX demo. Every person, address and amount is made up.
// Milestone names are placeholders until Poetry sends the real list per category.

export const GST_RATE = 0.18;

/** The demo is frozen on this day so screens always tell the same story. */
export const TODAY = "2026-11-11";

export const client = {
  name: "Meera Iyer",
  firstName: "Meera",
  coOwner: "Arjun Iyer",
};

export const project = {
  code: "PD-CV-2026-014",
  name: "Iyer Residence",
  category: "City villa",
  address: "Plot 47, Lakeside Layout, Kanakapura Road, Bengaluru 560062",
  plotArea: 2993,
  builtUpArea: 3350,
  ratePerSqFt: 2600,
  agreementSignedOn: "2026-01-12",
  initialEstimate: 8320000,
  /** How far the house is built: 0 plinth, 1 ground floor, 2 first floor, 3 second floor, 4 roof. */
  builtUpTo: 2,
};

export const contacts = [
  {
    level: "Your point of contact",
    name: "Kavya Reddy",
    role: "Client relations",
    phone: "+91 98450 01122",
    responds: "Replies within one working day",
  },
  {
    level: "If that doesn't resolve it",
    name: "Vikram Desai",
    role: "Project head",
    phone: "+91 98450 03344",
    responds: "Replies within two working days",
  },
  {
    level: "Final escalation",
    name: "Poetry Designs office",
    role: "Director's desk",
    phone: "+91 80 4000 5566",
    responds: "Replies within three working days",
  },
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
  workCompletedOn?: string;
  paidOn?: string;
  letterNo?: string;
  letterIssuedOn?: string;
  expected?: string;
};

// Approved value is 87,10,000. The advance stays at 5% of the initial estimate;
// the shortfall from the later addendum sits in milestone 1.
export const milestones: Milestone[] = [
  {
    id: 0,
    name: "Sign-up",
    covers: "Advance on signing the agreement, so design work can begin.",
    percent: 5,
    amount: 416000,
    status: "paid",
    paidOn: "2026-01-14",
  },
  {
    id: 1,
    name: "Foundation and plinth footing",
    covers: "Excavation, footings, plinth beam and backfilling up to plinth level.",
    percent: 15,
    amount: 1326000,
    status: "paid",
    workCompletedOn: "2026-05-22",
    paidOn: "2026-06-02",
    letterNo: "PD/DL/2026-27/0019",
    letterIssuedOn: "2026-05-25",
  },
  {
    id: 2,
    name: "Ground floor structure",
    covers: "Columns, walls, lintels and the roof slab over the ground floor.",
    percent: 15,
    amount: 1306500,
    status: "paid",
    workCompletedOn: "2026-08-18",
    paidOn: "2026-08-29",
    letterNo: "PD/DL/2026-27/0027",
    letterIssuedOn: "2026-08-20",
  },
  {
    id: 3,
    name: "First floor structure",
    covers: "Columns, walls, lintels and the roof slab over the first floor.",
    percent: 10,
    amount: 871000,
    status: "awaiting-approval",
    workCompletedOn: "2026-11-06",
    letterNo: "PD/DL/2026-27/0034",
  },
  {
    id: 4,
    name: "Second floor and roof slab",
    covers: "Second floor structure, terrace slab, parapet and the staircase headroom.",
    percent: 10,
    amount: 871000,
    status: "in-progress",
    expected: "January 2027",
  },
  {
    id: 5,
    name: "Brickwork and plastering",
    covers: "Internal partition walls, internal and external plastering.",
    percent: 10,
    amount: 871000,
    status: "upcoming",
    expected: "March 2027",
  },
  {
    id: 6,
    name: "Electrical and plumbing",
    covers: "Conduits, wiring, water supply and drainage lines, waterproofing of wet areas.",
    percent: 8,
    amount: 696800,
    status: "upcoming",
    expected: "April 2027",
  },
  {
    id: 7,
    name: "Flooring and tiling",
    covers: "Floor finishes, wall tiling in kitchen and bathrooms, staircase cladding.",
    percent: 8,
    amount: 696800,
    status: "upcoming",
    expected: "June 2027",
  },
  {
    id: 8,
    name: "Doors, windows and joinery",
    covers: "Door frames and shutters, windows and glazing, railings and built-in joinery.",
    percent: 8,
    amount: 696800,
    status: "upcoming",
    expected: "July 2027",
  },
  {
    id: 9,
    name: "Painting and finishing",
    covers: "Putty, primer and paint, fixtures, fittings and external finishes.",
    percent: 8,
    amount: 696800,
    status: "upcoming",
    expected: "August 2027",
  },
  {
    id: 10,
    name: "Handover",
    covers: "Final cleaning, snag list closure and handing over the keys.",
    percent: 3,
    amount: 261300,
    status: "upcoming",
    expected: "September 2027",
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
  versions: DesignVersion[];
};

export const designs: Design[] = [
  {
    id: "terrace-plan",
    title: "Second floor and terrace plan",
    kind: "Drawing",
    drawing: "plan",
    sheet: "A-103",
    versions: [
      {
        version: 1,
        uploadedOn: "2026-10-24",
        uploadedBy: "Ananya Rao",
        note: "First layout for the second floor family room and open terrace.",
        status: "changes-requested",
        decidedOn: "2026-10-30",
        comment:
          "Please make the family room open onto the terrace with a wider door, and keep the staircase headroom away from the seating side.",
      },
      {
        version: 2,
        uploadedOn: "2026-11-09",
        uploadedBy: "Ananya Rao",
        note: "Terrace door widened to 3.0 m and the staircase headroom moved to the north side, as you asked.",
        status: "awaiting",
      },
    ],
  },
  {
    id: "kitchen-spec",
    title: "Kitchen specification",
    kind: "Specification",
    drawing: "spec",
    sheet: "S-204",
    versions: [
      {
        version: 1,
        uploadedOn: "2026-11-05",
        uploadedBy: "Ananya Rao",
        note: "Counter, sink, hob, chimney and storage finishes for the kitchen.",
        status: "awaiting",
      },
    ],
  },
  {
    id: "front-elevation",
    title: "Front elevation",
    kind: "Drawing",
    drawing: "elevation",
    sheet: "A-201",
    versions: [
      {
        version: 4,
        uploadedOn: "2026-03-16",
        uploadedBy: "Vikram Desai",
        note: "Final elevation with the cantilevered first floor and terrace railing.",
        status: "approved",
        decidedOn: "2026-03-20",
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
    versions: [
      {
        version: 2,
        uploadedOn: "2026-02-26",
        uploadedBy: "Ananya Rao",
        note: "Three bedrooms with the added study next to the master bedroom.",
        status: "approved",
        decidedOn: "2026-03-02",
      },
    ],
  },
  {
    id: "ground-floor-plan",
    title: "Ground floor plan",
    kind: "Drawing",
    drawing: "plan",
    sheet: "A-101",
    versions: [
      {
        version: 3,
        uploadedOn: "2026-02-10",
        uploadedBy: "Ananya Rao",
        note: "Living, dining, kitchen, guest bedroom and the verandah facing the garden.",
        status: "approved",
        decidedOn: "2026-02-14",
      },
    ],
  },
];

export type ChangeStatus = "pending" | "approved" | "declined";

export type Change = {
  id: string;
  title: string;
  reason: "Added area" | "Beyond the allowance" | "Outside the agreement";
  raisedOn: string;
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
};

export const changes: Change[] = [
  {
    id: "terrace-jacuzzi",
    title: "Jacuzzi on the terrace",
    reason: "Outside the agreement",
    raisedOn: "2026-11-07",
    summary:
      "A six-seater jacuzzi on the second floor terrace. The slab under it needs extra steel, and the area needs its own waterproofing and plumbing lines.",
    working: "Jacuzzi unit and installation ₹1,65,000, slab strengthening ₹45,000, waterproofing and plumbing ₹30,000.",
    cost: 240000,
    delayDays: 12,
    affects: "Second floor and roof slab, then Electrical and plumbing",
    validUntil: "2026-11-22",
    status: "pending",
  },
  {
    id: "living-glazing",
    title: "Larger living room windows",
    reason: "Beyond the allowance",
    raisedOn: "2026-11-03",
    summary:
      "The living room windows grow from the agreed glazing allowance of 180 sq ft to 236 sq ft, to open the room to the garden.",
    working: "56 sq ft beyond the allowance × ₹1,500 per sq ft.",
    cost: 84000,
    delayDays: 4,
    affects: "Doors, windows and joinery",
    validUntil: "2026-11-18",
    status: "pending",
  },
  {
    id: "study-room",
    title: "Study next to the master bedroom",
    reason: "Added area",
    raisedOn: "2026-02-20",
    summary: "A study added on the first floor, which increases the built-up area from 3,200 to 3,350 sq ft.",
    working: "150 sq ft added × ₹2,600 per sq ft.",
    cost: 390000,
    delayDays: 9,
    affects: "First floor structure",
    status: "approved",
    decidedOn: "2026-03-28",
    addendum: "Addendum 1",
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
    { date: "2026-03-18", phase: "Before construction", topic: "Final walkthrough of the elevation", with: "Vikram Desai", hours: 2 },
    { date: "2026-02-24", phase: "Before construction", topic: "First floor layout with the study", with: "Ananya Rao", hours: 3 },
    { date: "2026-02-06", phase: "Before construction", topic: "Ground floor plan, third revision", with: "Ananya Rao", hours: 3.5 },
    { date: "2026-01-22", phase: "Before construction", topic: "Brief, site visit and first concepts", with: "Vikram Desai", hours: 3.5 },
  ],
};

export function withGst(amount: number) {
  const gst = Math.round(amount * GST_RATE);
  return { amount, gst, total: amount + gst };
}

// ---- Staff side ----

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
