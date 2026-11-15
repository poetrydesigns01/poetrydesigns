/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import {
  credits as iyerCredits,
  milestones as iyerMilestones,
  project as iyerProject,
  tasks as ananyaTasks,
  type ChangeStatus,
  type DesignStatus,
  type Milestone,
  type Task,
} from "./demo-data";
import type { StoreyGroup } from "./projection";
import { projectCode, type PlanSeed } from "./workflow-plan";
import { milestoneStage, WORKFLOW_TEMPLATE } from "./workflow-template";

// Fictional data for the whole firm: eight projects, fifteen people, their requests,
// orders, bills, tasks and records. Every person, address, GSTIN, phone and amount is
// made up. Iyer Residence is built from demo-data.ts so Meera's figures are the same
// on every screen. Nothing here reads a clock.

// ---- People ----

export type PersonId =
  | "meera"
  | "arjun"
  | "rohan"
  | "kavya"
  | "vikram"
  | "lakshmi"
  | "ananya"
  | "karan"
  | "suresh"
  | "manjunath"
  | "ravi"
  | "prakash"
  | "imran"
  | "divya"
  | "shalini"
  // People added by the admin during the demo.
  | `new-${string}`;

export type StaffRole = "bd" | "architect" | "site" | "finance" | "admin";

export type Person = {
  id: PersonId;
  name: string;
  first: string;
  role: "client" | StaffRole;
  /** Shown under the name. */
  title: string;
  /** The admin sets it. */
  senior: boolean;
  /** The senior they work under. */
  lead?: PersonId;
  phone: string;
  email: string;
  /** "Procurement", "Studio", ... */
  teams: string[];
  /** Delegated access. */
  access: "finance"[];
  active: boolean;
};

export const people: Person[] = [
  {
    id: "meera",
    name: "Meera Iyer",
    first: "Meera",
    role: "client",
    title: "Homeowner",
    senior: false,
    phone: "+91 98450 02211",
    email: "meera.iyer@example.com",
    teams: [],
    access: [],
    active: true,
  },
  {
    id: "arjun",
    name: "Arjun Iyer",
    first: "Arjun",
    role: "client",
    title: "Co-owner",
    senior: false,
    phone: "+91 98450 02212",
    email: "arjun.iyer@example.com",
    teams: [],
    access: [],
    active: true,
  },
  {
    id: "rohan",
    name: "Rohan Menon",
    first: "Rohan",
    role: "bd",
    title: "Business development",
    senior: true,
    phone: "+91 98450 01100",
    email: "rohan@poetry.example.com",
    teams: ["Business development"],
    access: [],
    active: true,
  },
  {
    id: "kavya",
    name: "Kavya Reddy",
    first: "Kavya",
    role: "bd",
    title: "Client relations, point of contact",
    senior: false,
    lead: "rohan",
    phone: "+91 98450 01122",
    email: "kavya@poetry.example.com",
    teams: ["Business development"],
    access: [],
    active: true,
  },
  {
    id: "vikram",
    name: "Vikram Desai",
    first: "Vikram",
    role: "architect",
    title: "Senior architect",
    senior: true,
    phone: "+91 98450 03344",
    email: "vikram@poetry.example.com",
    teams: ["Studio"],
    access: [],
    active: true,
  },
  {
    id: "lakshmi",
    name: "Lakshmi Narayan",
    first: "Lakshmi",
    role: "architect",
    title: "Senior architect",
    senior: true,
    phone: "+91 98450 03355",
    email: "lakshmi@poetry.example.com",
    teams: ["Studio"],
    access: [],
    active: true,
  },
  {
    id: "ananya",
    name: "Ananya Rao",
    first: "Ananya",
    role: "architect",
    title: "Junior architect",
    senior: false,
    lead: "vikram",
    phone: "+91 98450 03366",
    email: "ananya@poetry.example.com",
    teams: ["Studio"],
    access: [],
    active: true,
  },
  {
    id: "karan",
    name: "Karan Joshi",
    first: "Karan",
    role: "architect",
    title: "Junior architect",
    senior: false,
    lead: "vikram",
    phone: "+91 98450 03377",
    email: "karan@poetry.example.com",
    teams: ["Studio"],
    access: [],
    active: true,
  },
  {
    id: "suresh",
    name: "Suresh Gowda",
    first: "Suresh",
    role: "site",
    title: "Senior site engineer",
    senior: true,
    phone: "+91 98450 04411",
    email: "suresh@poetry.example.com",
    teams: ["Site"],
    access: [],
    active: true,
  },
  {
    id: "manjunath",
    name: "Manjunath K",
    first: "Manjunath",
    role: "site",
    title: "Junior site engineer",
    senior: false,
    lead: "suresh",
    phone: "+91 98450 04422",
    email: "manjunath@poetry.example.com",
    teams: ["Site"],
    access: [],
    active: true,
  },
  {
    id: "ravi",
    name: "Ravi Kumar",
    first: "Ravi",
    role: "site",
    title: "Site engineer",
    senior: true,
    phone: "+91 98450 04433",
    email: "ravi@poetry.example.com",
    teams: ["Site"],
    access: [],
    active: true,
  },
  {
    id: "prakash",
    name: "Prakash Hegde",
    first: "Prakash",
    role: "finance",
    title: "Procurement lead",
    senior: true,
    phone: "+91 98450 05511",
    email: "prakash@poetry.example.com",
    teams: ["Procurement"],
    access: [],
    active: true,
  },
  {
    id: "imran",
    name: "Imran Pasha",
    first: "Imran",
    role: "finance",
    title: "Procurement, Devanahalli sites",
    senior: false,
    lead: "prakash",
    phone: "+91 98450 05522",
    email: "imran@poetry.example.com",
    teams: ["Procurement"],
    access: [],
    active: true,
  },
  {
    id: "divya",
    name: "Divya Shenoy",
    first: "Divya",
    role: "finance",
    title: "Accountant",
    senior: false,
    lead: "prakash",
    phone: "+91 98450 05533",
    email: "divya@poetry.example.com",
    teams: ["Procurement", "Accounts"],
    access: ["finance"],
    active: true,
  },
  {
    id: "shalini",
    name: "Shalini Murthy",
    first: "Shalini",
    role: "admin",
    title: "Operations head",
    senior: true,
    phone: "+91 98450 06611",
    email: "shalini@poetry.example.com",
    teams: ["Admin"],
    access: [],
    active: true,
  },
];

/** When Divya was given finance access, for the people page and the log. */
export const DIVYA_ACCESS_AT = "2026-11-03T15:00";

/** The people a staff role can be viewed as in the demo. BD is always Rohan, admin always Shalini. */
export const ROLE_PEOPLE: Record<StaffRole, PersonId[]> = {
  bd: ["rohan"],
  architect: ["vikram", "ananya"],
  site: ["suresh", "manjunath"],
  finance: ["prakash", "divya"],
  admin: ["shalini"],
};

// ---- Category templates (sample, to be confirmed by Poetry) ----

export type CategoryId = "city-villa" | "farmhouse" | "eco" | "cement-blocks";

export type TemplateMilestone = { n: number; name: string; covers: string; percent: number };

export type Template = {
  id: CategoryId;
  name: string;
  ratePerSqFt: number;
  signUpPercent: 5;
  /** n 1 to 10; the percents total 95. */
  milestones: TemplateMilestone[];
  partB: { id: string; name: string; formula: string; perimeterRate?: number; fixed?: number }[];
  /** Set when the template borrows another's split. */
  note?: string;
};

const PART_B: Template["partB"] = [
  {
    id: "compound",
    name: "Compound wall, gate and setback works",
    formula: "perimeter × ₹2,000 + ₹3,00,000",
    perimeterRate: 2000,
    fixed: 300000,
  },
  { id: "sump", name: "Underground sump", formula: "₹1,50,000", fixed: 150000 },
  { id: "pool", name: "Swimming pool", formula: "Priced for each project" },
  { id: "landscape", name: "Landscape", formula: "Priced for each project" },
];

// Every category follows Poetry's one workflow (workflow-template.ts): ten construction
// milestones, each opened by its instalment, at the agreed split.
const workflowMilestones: TemplateMilestone[] = WORKFLOW_TEMPLATE.instalments
  .filter((i) => i.n > 0)
  .map((i) => {
    const stage = milestoneStage(i.n);
    return {
      n: i.n,
      name: stage?.short ?? `Milestone ${i.n}`,
      covers: (stage?.tasks ?? [])
        .filter((t) => t.track === "engineering")
        .map((t) => t.name)
        .join(", "),
      percent: i.percent,
    };
  });
const cityVillaMilestones = workflowMilestones;
const farmhouseMilestones = workflowMilestones;


export const templates: Template[] = [
  { id: "city-villa", name: "City villa", ratePerSqFt: 2600, signUpPercent: 5, milestones: cityVillaMilestones, partB: PART_B },
  { id: "farmhouse", name: "Farmhouse", ratePerSqFt: 2400, signUpPercent: 5, milestones: farmhouseMilestones, partB: PART_B },
  {
    id: "eco",
    name: "Eco-friendly home",
    ratePerSqFt: 2800,
    signUpPercent: 5,
    milestones: cityVillaMilestones,
    partB: PART_B,
  },
  {
    id: "cement-blocks",
    name: "Cement block home",
    ratePerSqFt: 2200,
    signUpPercent: 5,
    milestones: cityVillaMilestones,
    partB: PART_B,
  },
];

export function templateOf(id: CategoryId): Template {
  return templates.find((template) => template.id === id) ?? templates[0];
}

// ---- Material catalogue ----

export type CatalogueUnit = "bags" | "kg" | "cu ft" | "nos" | "sq ft" | "lengths";
export type CatalogueItem = { id: string; name: string; unit: CatalogueUnit; subs: string[]; usual?: string };

export const firmCatalogue: CatalogueItem[] = [
  { id: "cement", name: "Cement", unit: "bags", subs: ["OPC 43 grade", "OPC 53 grade", "PPC"], usual: "OPC 53 grade" },
  {
    id: "steel",
    name: "Steel (TMT bars)",
    unit: "kg",
    subs: ["8 mm", "10 mm", "12 mm", "16 mm", "20 mm"],
    usual: "12 mm",
  },
  {
    id: "sand",
    name: "Sand",
    unit: "cu ft",
    subs: ["M-sand for concrete", "P-sand for plastering"],
    usual: "M-sand for concrete",
  },
  { id: "aggregate", name: "Aggregate", unit: "cu ft", subs: ["12 mm", "20 mm", "40 mm"], usual: "20 mm" },
  { id: "blocks", name: "Solid blocks", unit: "nos", subs: ["4 inch", "6 inch", "8 inch"], usual: "6 inch" },
  { id: "wire", name: "Binding wire", unit: "kg", subs: ["18 gauge"], usual: "18 gauge" },
  {
    id: "tiles",
    name: "Tiles",
    unit: "sq ft",
    subs: ["Vitrified 600 × 600 mm", "Vitrified 800 × 800 mm", "Anti-skid 300 × 300 mm"],
    usual: "Vitrified 600 × 600 mm",
  },
  { id: "conduit", name: "PVC conduit", unit: "lengths", subs: ["20 mm", "25 mm"], usual: "25 mm" },
];

/** How much one glyph in a material stack stands for, by unit. */
export const GLYPH_SCALE: Record<CatalogueUnit, { per: number; glyph: string }> = {
  bags: { per: 10, glyph: "bags" },
  kg: { per: 100, glyph: "bar bundle" },
  "cu ft": { per: 100, glyph: "heap" },
  nos: { per: 500, glyph: "pallet" },
  "sq ft": { per: 200, glyph: "tile crate" },
  lengths: { per: 20, glyph: "bundle" },
};

// ---- Vendors (GSTIN, phone and area are sample) ----

export type Vendor = {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  area: string;
  /** Last rates, before GST. A linked PO moves the rate for its material and size. */
  rates: { material: string; sub: string; rate: number; unit: string; on: string }[];
  /** Set once the admin deletes the vendor: kept as a struck line, never offered again. */
  deleted?: { at: string; by: PersonId; reason: string };
};

export const vendors: Vendor[] = [
  {
    id: "v01",
    name: "Sri Lakshmi Steels",
    gstin: "29AAKFS1234L1Z5",
    phone: "+91 98860 11001",
    area: "Yelahanka",
    rates: [
      { material: "steel", sub: "12 mm", rate: 68, unit: "kg", on: "2026-11-05" },
      { material: "wire", sub: "18 gauge", rate: 85, unit: "kg", on: "2026-11-05" },
    ],
  },
  {
    id: "v02",
    name: "Karnataka Steel Traders",
    gstin: "29AACFK5678M1Z2",
    phone: "+91 98860 11002",
    area: "Peenya",
    rates: [{ material: "steel", sub: "12 mm", rate: 69.5, unit: "kg", on: "2026-10-14" }],
  },
  {
    id: "v03",
    name: "Bharat Cement Traders",
    gstin: "29ABDFB2468C1Z9",
    phone: "+91 98860 11003",
    area: "Kanakapura Road",
    rates: [
      { material: "cement", sub: "OPC 53 grade", rate: 390, unit: "bag", on: "2026-11-05" },
      { material: "cement", sub: "OPC 43 grade", rate: 370, unit: "bag", on: "2026-11-05" },
    ],
  },
  {
    id: "v04",
    name: "Ganesh Building Materials",
    gstin: "29AAGFG1357G1Z4",
    phone: "+91 98860 11004",
    area: "Devanahalli",
    rates: [
      { material: "aggregate", sub: "20 mm", rate: 58, unit: "cu ft", on: "2026-10-30" },
      { material: "sand", sub: "M-sand for concrete", rate: 65, unit: "cu ft", on: "2026-10-30" },
      { material: "cement", sub: "OPC 53 grade", rate: 395, unit: "bag", on: "2026-10-02" },
    ],
  },
  {
    id: "v05",
    name: "Kaveri Sand Suppliers",
    gstin: "29AAHFK9753K1Z1",
    phone: "+91 98860 11005",
    area: "Hosur Road",
    rates: [
      { material: "sand", sub: "M-sand for concrete", rate: 60, unit: "cu ft", on: "2026-10-28" },
      { material: "sand", sub: "P-sand for plastering", rate: 68, unit: "cu ft", on: "2026-10-28" },
    ],
  },
  {
    id: "v06",
    name: "Hosur Concrete Blocks",
    gstin: "29AAIFH8642H1Z7",
    phone: "+91 98860 11006",
    area: "Hosur",
    rates: [
      { material: "blocks", sub: "4 inch", rate: 40, unit: "each", on: "2026-11-01" },
      { material: "blocks", sub: "6 inch", rate: 48, unit: "each", on: "2026-09-12" },
      { material: "blocks", sub: "8 inch", rate: 56, unit: "each", on: "2026-09-12" },
    ],
  },
  {
    id: "v07",
    name: "Tile Mart Bengaluru",
    gstin: "29AAJFT7531T1Z3",
    phone: "+91 98860 11007",
    area: "Hebbal",
    rates: [
      { material: "tiles", sub: "Vitrified 800 × 800 mm", rate: 60, unit: "sq ft", on: "2026-10-30" },
      { material: "tiles", sub: "Vitrified 600 × 600 mm", rate: 62, unit: "sq ft", on: "2026-09-30" },
      { material: "tiles", sub: "Anti-skid 300 × 300 mm", rate: 58, unit: "sq ft", on: "2026-09-30" },
    ],
  },
  {
    id: "v08",
    name: "Volt Electricals",
    gstin: "29AAKFV6420V1Z6",
    phone: "+91 98860 11008",
    area: "SP Road",
    rates: [
      { material: "conduit", sub: "25 mm", rate: 145, unit: "length", on: "2026-09-18" },
      { material: "conduit", sub: "20 mm", rate: 118, unit: "length", on: "2026-09-18" },
    ],
  },
];

// ---- Projects ----

export type ProjectId = "iyer" | "iyer-cottage" | "nair" | "dsouza" | "bhat" | "fernandes" | "sharma" | "kulkarni";

/**
 * A payment row's money state. Row 0 is the sign-up advance; row n (1 to 10) is instalment n,
 * which falls due inside milestone n-1 and must be received before milestone n starts.
 * done: its due week is reached, the letter is not raised yet. under-way: the milestone it
 * falls inside is being built. to-come: neither.
 */
export type MilestoneState = "paid" | "part-paid" | "approved" | "raised" | "done" | "under-way" | "to-come";

export type PhotoKind = "slab-pour" | "shuttering" | "curing" | "columns" | "blocks" | "tiles" | "steel" | "sand";

export type MilestoneSeed = {
  n: number;
  /** The construction milestone the row opens ("First floor block work"); "Sign-up" for n 0. */
  name: string;
  covers: string;
  percent: number;
  /** Before GST. */
  amount: number;
  state: MilestoneState;
  /** When the instalment's due point was reached. A plain date, or "YYYY-MM-DDTHH:mm". */
  doneOn?: string;
  doneBy?: PersonId;
  acceptedAt?: string;
  raisedAt?: string;
  raisedBy?: PersonId;
  approvedAt?: string;
  letterNo?: string;
  paidOn?: string;
  /** A month, "January 2027". Older screens only; the plan gives the dates now. */
  expected?: string;
  startedOn?: string;
  /** What the site says about the work, when it bears on the next step: "the tiling finished on 10 Nov". */
  siteNote?: string;
  siteNoteOn?: string;
  photos?: PhotoKind[];
};

export type ProjectSeed = {
  id: ProjectId;
  /** CFS_501_NK shape: category code, running number, client initials. Empty until a workspace is opened. */
  code: string;
  name: string;
  category: CategoryId;
  place: string;
  address: string;
  maps: string;
  lat: number;
  lng: number;
  clients: string[];
  clientEmail: string;
  clientSignedInOn?: string;
  invitedAt?: string;
  builtUpArea: number;
  ratePerSqFt: number;
  plotPerimeter: number;
  signedOn?: string;
  onboardedOn?: string;
  onboardedBy: PersonId;
  /** Before GST, as signed. */
  originalValue: number;
  /** Approved before the demo. */
  revisions: { id: string; label: string; amount: number; days: number; approvedAt: string }[];
  team: { poc: PersonId; head: PersonId; architects: PersonId[]; engineers: PersonId[]; procurement: PersonId[] };
  /** BD's note to the Project Head. */
  handoff: string;
  phase: "draft" | "invited" | "in-design" | "building" | "handed-over";
  /** 11 rows, n 0 to 10 (sign-up and instalments 1 to 10); empty for a draft. */
  milestones: MilestoneSeed[];
  /** Bills entered before the demo, by milestone, before GST. */
  billsBefore: Record<number, number>;
  handedOverOn?: string;
  /** Why the figures look the way they do, in one sentence, when that matters. */
  costNote?: string;
  /** The project plan generated from the workflow template, and how far it has got. */
  plan?: PlanSeed;
};

function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/** Payment rows for a category at a contract value (the sign-up and instalments 1 to 10), with the given facts laid over them. */
function schedule(
  category: CategoryId,
  value: number,
  facts: Record<number, Partial<MilestoneSeed> & { state: MilestoneState }>,
): MilestoneSeed[] {
  const rows: TemplateMilestone[] = [
    { n: 0, name: "Sign-up", covers: "Advance on signing the agreement, so design work can begin.", percent: 5 },
    ...templateOf(category).milestones,
  ];
  return rows.map((row) => ({
    ...row,
    amount: Math.round((value * row.percent) / 100),
    ...(facts[row.n] ?? { state: "to-come" }),
  }));
}

/** Instalments received in full, each a few days after its due week began. */
function paidRows(dates: Record<number, [due: string, paid: string]>): Record<number, Partial<MilestoneSeed> & { state: MilestoneState }> {
  const facts: Record<number, Partial<MilestoneSeed> & { state: MilestoneState }> = {};
  for (const [n, [due, paid]] of Object.entries(dates)) facts[Number(n)] = { state: "paid", doneOn: due, paidOn: paid };
  return facts;
}

const IYER_STATE: Record<Milestone["status"], MilestoneState> = {
  paid: "paid",
  "awaiting-approval": "raised",
  "in-progress": "under-way",
  upcoming: "to-come",
};

// Iyer Residence is the detail in demo-data.ts, so its rows are copied, not recomputed.
const iyerRows: MilestoneSeed[] = iyerMilestones.map((m) => ({
  n: m.id,
  name: m.name,
  covers: m.covers,
  percent: m.percent,
  amount: m.amount,
  state: IYER_STATE[m.status],
  // The due point: the instalment's week came. Nobody marked a stage done for it.
  doneOn: m.dueReachedOn,
  acceptedAt: m.acceptedAt,
  raisedAt: m.raisedAt,
  raisedBy: m.raisedBy ? "vikram" : undefined,
  approvedAt: m.approvedAt,
  letterNo: m.letterNo,
  paidOn: m.paidOn,
}));

/** Running numbers in the project codes, in signing order. Sample, to be confirmed. */
const CODE_NUMBERS: Record<ProjectId, number> = {
  fernandes: 501,
  nair: 502,
  bhat: 503,
  iyer: 504,
  dsouza: 505,
  "iyer-cottage": 506,
  sharma: 507,
  kulkarni: 508,
};

export const projects: ProjectSeed[] = [
  {
    id: "iyer",
    code: iyerProject.code,
    name: iyerProject.name,
    category: "city-villa",
    place: "Kanakapura Road",
    address: iyerProject.address,
    maps: mapsLink(12.8452, 77.54),
    lat: 12.8452,
    lng: 77.54,
    clients: ["Meera Iyer", "Arjun Iyer"],
    clientEmail: "meera.iyer@example.com",
    clientSignedInOn: "2026-05-26",
    invitedAt: "2026-05-25T11:30",
    builtUpArea: iyerProject.builtUpArea,
    ratePerSqFt: iyerProject.ratePerSqFt,
    plotPerimeter: 228,
    signedOn: iyerProject.agreementSignedOn,
    onboardedOn: "2026-05-25",
    onboardedBy: "rohan",
    originalValue: iyerProject.initialEstimate,
    revisions: [
      {
        id: "CR-2026-005",
        label: "Addendum 1, study next to the master bedroom",
        amount: 390000,
        days: 9,
        approvedAt: "2026-06-12T20:05",
      },
    ],
    team: { poc: "kavya", head: "vikram", architects: ["ananya"], engineers: ["suresh", "manjunath"], procurement: ["prakash"] },
    handoff: "Meera and Arjun live in Dubai until March 2027. Calls after 7 pm. They want the prayer room facing east.",
    phase: "building",
    milestones: iyerRows,
    billsBefore: { 0: 310000, 1: 1090000, 2: 1085000, 3: 488200, 4: 0 },
    // Construction milestone 4 (first floor block work) under way; instalment 5 raised.
    plan: {
      preStart: "2026-05-25",
      constructionStart: "2026-07-13",
      generatedAt: "2026-05-25T12:10",
      generatedBy: "shalini",
      codeNumber: CODE_NUMBERS.iyer,
      progress: {
        doneThrough: "m3",
        tasks: { "m4-ff-blocks": { percent: 60, startedOn: "2026-10-26" } },
      },
    },
  },
  {
    id: "iyer-cottage",
    code: projectCode("farmhouse", CODE_NUMBERS["iyer-cottage"], "Meera Iyer"),
    name: "Iyer Farm Cottage",
    category: "farmhouse",
    place: "Chikkaballapur",
    address: "Survey 112, Nandi Hills Road, Chikkaballapur 562101",
    maps: mapsLink(13.428, 77.727),
    lat: 13.428,
    lng: 77.727,
    clients: ["Meera Iyer", "Arjun Iyer"],
    clientEmail: "meera.iyer@example.com",
    clientSignedInOn: "2026-10-03",
    invitedAt: "2026-10-02T12:00",
    builtUpArea: 1800,
    ratePerSqFt: 2400,
    plotPerimeter: 420,
    signedOn: "2026-10-02",
    onboardedOn: "2026-10-02",
    onboardedBy: "rohan",
    originalValue: 4320000,
    revisions: [],
    team: { poc: "kavya", head: "lakshmi", architects: ["karan"], engineers: [], procurement: ["prakash"] },
    handoff: "Same family as Iyer Residence. They want a deep verandah and a rainwater tank.",
    phase: "in-design",
    milestones: schedule("farmhouse", 4320000, { 0: { state: "paid", paidOn: "2026-10-06" } }),
    // Itemised in `cottageBills`.
    billsBefore: {},
    // Final approval: the estimate is with the client.
    plan: {
      preStart: "2026-09-28",
      generatedAt: "2026-10-02T12:30",
      generatedBy: "shalini",
      codeNumber: CODE_NUMBERS["iyer-cottage"],
      progress: { doneThrough: "planning-design", tasks: { "fa-bom": { percent: 100, doneOn: "2026-11-06" } } },
    },
  },
  {
    id: "nair",
    code: projectCode("farmhouse", CODE_NUMBERS.nair, "Anil Nair"),
    name: "Nair Farmhouse",
    category: "farmhouse",
    place: "Devanahalli",
    address: "Survey 48/2, Avathi village, Devanahalli 562110",
    maps: mapsLink(13.246, 77.712),
    lat: 13.246,
    lng: 77.712,
    clients: ["Anil Nair", "Priya Nair"],
    clientEmail: "anil.nair@example.com",
    clientSignedInOn: "2026-01-27",
    invitedAt: "2026-01-26T12:00",
    builtUpArea: 4200,
    ratePerSqFt: 2400,
    plotPerimeter: 610,
    signedOn: "2026-01-26",
    onboardedOn: "2026-01-26",
    onboardedBy: "rohan",
    originalValue: 10080000,
    revisions: [],
    team: {
      poc: "kavya",
      head: "vikram",
      architects: ["ananya", "karan"],
      engineers: ["suresh", "manjunath"],
      procurement: ["imran", "prakash"],
    },
    handoff: "Priya decides finishes and Anil decides money. Their bank releases in two parts per stage.",
    phase: "building",
    // Construction milestone 8 (plastering) under way; instalment 9 falls due next week.
    milestones: schedule("farmhouse", 10080000, {
      0: { state: "paid", paidOn: "2026-01-28" },
      ...paidRows({
        1: ["2026-03-16", "2026-03-19"],
        2: ["2026-05-04", "2026-05-12"],
        3: ["2026-06-01", "2026-06-05"],
        4: ["2026-06-15", "2026-06-24"],
        5: ["2026-07-13", "2026-07-17"],
        6: ["2026-07-27", "2026-08-05"],
        7: ["2026-08-31", "2026-09-04"],
        8: ["2026-09-14", "2026-09-24"],
      }),
    }),
    billsBefore: { 0: 410000, 1: 960000, 2: 1040000, 3: 1230000, 4: 810000, 5: 750000, 6: 690000, 7: 640000, 8: 420000 },
    plan: {
      preStart: "2026-01-26",
      constructionStart: "2026-03-16",
      generatedAt: "2026-01-26T12:30",
      generatedBy: "shalini",
      codeNumber: CODE_NUMBERS.nair,
      progress: {
        doneThrough: "m7",
        tasks: { "m8-plastering": { percent: 75, startedOn: "2026-09-28" } },
      },
    },
  },
  {
    id: "dsouza",
    code: projectCode("city-villa", CODE_NUMBERS.dsouza, "Ryan D'Souza"),
    name: "D'Souza Villa",
    category: "city-villa",
    place: "Sarjapur Road",
    address: "Plot 12, Green Glen Layout, Sarjapur Road, Bengaluru 560035",
    maps: mapsLink(12.901, 77.687),
    lat: 12.901,
    lng: 77.687,
    clients: ["Ryan D'Souza", "Leah D'Souza"],
    clientEmail: "ryan.dsouza@example.com",
    clientSignedInOn: "2026-07-14",
    invitedAt: "2026-07-13T12:00",
    builtUpArea: 2950,
    ratePerSqFt: 2600,
    plotPerimeter: 220,
    signedOn: "2026-07-13",
    onboardedOn: "2026-07-13",
    onboardedBy: "rohan",
    originalValue: 7670000,
    revisions: [],
    team: { poc: "kavya", head: "lakshmi", architects: ["ananya", "karan"], engineers: ["ravi"], procurement: ["prakash"] },
    handoff: "Leah works from home and wants the study away from the road.",
    phase: "building",
    // Construction milestone 2 (ground floor block work) under way.
    milestones: schedule("city-villa", 7670000, {
      0: { state: "paid", paidOn: "2026-07-15" },
      1: {
        state: "paid",
        doneOn: "2026-08-31",
        raisedAt: "2026-08-31T11:00",
        raisedBy: "lakshmi",
        approvedAt: "2026-09-01T20:00",
        letterNo: "PD/DL/2026-27/0026",
        paidOn: "2026-09-03",
      },
      2: { state: "paid", doneOn: "2026-10-19", paidOn: "2026-10-27" },
    }),
    billsBefore: { 0: 290000, 1: 920000 },
    plan: {
      preStart: "2026-07-13",
      generatedAt: "2026-07-13T12:30",
      generatedBy: "shalini",
      codeNumber: CODE_NUMBERS.dsouza,
      progress: { doneThrough: "m1", tasks: { "m2-gf-blocks": { percent: 40, startedOn: "2026-11-02" } } },
    },
  },
  {
    id: "bhat",
    code: projectCode("city-villa", CODE_NUMBERS.bhat, "Sunil Bhat"),
    name: "Bhat Residence",
    category: "city-villa",
    place: "Jayanagar",
    address: "No. 18, 4th Cross, Jayanagar 4th Block, Bengaluru 560011",
    maps: mapsLink(12.925, 77.584),
    lat: 12.925,
    lng: 77.584,
    clients: ["Sunil Bhat", "Kavitha Bhat"],
    clientEmail: "sunil.bhat@example.com",
    clientSignedInOn: "2026-05-12",
    invitedAt: "2026-05-11T12:00",
    builtUpArea: 2700,
    ratePerSqFt: 2600,
    plotPerimeter: 210,
    signedOn: "2026-05-11",
    onboardedOn: "2026-05-11",
    onboardedBy: "rohan",
    originalValue: 7020000,
    revisions: [],
    team: { poc: "kavya", head: "lakshmi", architects: ["karan"], engineers: ["ravi"], procurement: ["prakash"] },
    handoff: "Loaded at launch.",
    phase: "building",
    // Construction milestone 5 (first floor roof slab) under way; instalment 6 part paid by the bank.
    milestones: schedule("city-villa", 7020000, {
      0: { state: "paid", paidOn: "2026-05-13" },
      ...paidRows({
        1: ["2026-06-29", "2026-07-02"],
        2: ["2026-08-17", "2026-08-25"],
        3: ["2026-09-14", "2026-09-18"],
        4: ["2026-09-28", "2026-10-06"],
        5: ["2026-10-26", "2026-10-30"],
      }),
      6: {
        state: "part-paid",
        doneOn: "2026-11-09",
        raisedAt: "2026-11-09T09:30",
        raisedBy: "lakshmi",
        approvedAt: "2026-11-09T19:30",
        letterNo: "PD/DL/2026-27/0033",
      },
    }),
    billsBefore: { 0: 320000, 1: 1060000, 2: 1040000, 3: 760000, 4: 740000, 5: 720000 },
    costNote: "Granite and extra steel were bought outside the estimate without a cost revision.",
    plan: {
      preStart: "2026-05-11",
      generatedAt: "2026-05-11T12:30",
      generatedBy: "shalini",
      codeNumber: CODE_NUMBERS.bhat,
      progress: { doneThrough: "m4", tasks: { "m5-ff-slab": { percent: 50, startedOn: "2026-11-02" } } },
    },
  },
  {
    id: "fernandes",
    code: projectCode("city-villa", CODE_NUMBERS.fernandes, "Neil Fernandes"),
    name: "Fernandes Villa",
    category: "city-villa",
    place: "Whitefield",
    address: "Plot 6, Palm Meadows Road, Whitefield, Bengaluru 560066",
    maps: mapsLink(12.97, 77.75),
    lat: 12.97,
    lng: 77.75,
    clients: ["Neil Fernandes"],
    clientEmail: "neil.fernandes@example.com",
    clientSignedInOn: "2025-07-15",
    invitedAt: "2025-07-14T12:00",
    builtUpArea: 3050,
    ratePerSqFt: 2600,
    plotPerimeter: 232,
    signedOn: "2025-07-14",
    onboardedOn: "2025-07-14",
    onboardedBy: "rohan",
    originalValue: 7930000,
    revisions: [],
    team: { poc: "kavya", head: "vikram", architects: ["ananya"], engineers: ["suresh"], procurement: ["prakash"] },
    handoff: "Loaded at launch.",
    phase: "handed-over",
    milestones: schedule("city-villa", 7930000, {
      0: { state: "paid", paidOn: "2025-07-16" },
      ...paidRows({
        1: ["2025-09-01", "2025-09-05"],
        2: ["2025-10-20", "2025-10-24"],
        3: ["2025-11-17", "2025-11-21"],
        4: ["2025-12-01", "2025-12-05"],
        5: ["2025-12-29", "2026-01-02"],
        6: ["2026-01-12", "2026-01-16"],
        7: ["2026-02-16", "2026-02-20"],
        8: ["2026-03-02", "2026-03-06"],
        9: ["2026-05-04", "2026-05-08"],
        10: ["2026-06-08", "2026-06-12"],
      }),
    }),
    billsBefore: {
      0: 320000,
      1: 930000,
      2: 910000,
      3: 620000,
      4: 610000,
      5: 605000,
      6: 510000,
      7: 520000,
      8: 530000,
      9: 515000,
      10: 115400,
    },
    handedOverOn: "2026-08-14",
    plan: {
      preStart: "2025-07-14",
      generatedAt: "2025-07-14T12:30",
      generatedBy: "shalini",
      codeNumber: CODE_NUMBERS.fernandes,
      progress: { doneThrough: "handover", tasks: { "ho-noc": { percent: 100, doneOn: "2026-08-14" } } },
    },
  },
  {
    id: "sharma",
    code: projectCode("cement-blocks", CODE_NUMBERS.sharma, "Rakesh Sharma"),
    name: "Sharma Villa",
    category: "cement-blocks",
    place: "Electronic City",
    address: "Plot 31, Neeladri Nagar, Electronic City, Bengaluru 560100",
    maps: mapsLink(12.845, 77.66),
    lat: 12.845,
    lng: 77.66,
    clients: ["Rakesh Sharma"],
    clientEmail: "rakesh.sharma@example.com",
    invitedAt: "2026-11-07T11:20",
    builtUpArea: 2600,
    ratePerSqFt: 2200,
    plotPerimeter: 214,
    signedOn: "2026-11-06",
    onboardedOn: "2026-11-07T11:20",
    onboardedBy: "rohan",
    originalValue: 5720000,
    revisions: [],
    team: { poc: "kavya", head: "lakshmi", architects: ["karan"], engineers: [], procurement: ["prakash"] },
    handoff: "Rakesh wants the design fast; he has a plan approval appointment in December.",
    phase: "invited",
    milestones: schedule("cement-blocks", 5720000, { 0: { state: "paid", paidOn: "2026-11-06" } }),
    billsBefore: {},
    plan: {
      preStart: "2026-11-02",
      generatedAt: "2026-11-07T11:30",
      generatedBy: "shalini",
      codeNumber: CODE_NUMBERS.sharma,
      progress: { doneThrough: "sign-up", tasks: { "pd-soil-test": { percent: 30, startedOn: "2026-11-09" } } },
    },
  },
  {
    id: "kulkarni",
    code: "",
    name: "Kulkarni Eco Home",
    category: "eco",
    place: "Hesaraghatta",
    address: "Survey 23, Hesaraghatta Main Road, Bengaluru 560088",
    maps: mapsLink(13.139, 77.487),
    lat: 13.139,
    lng: 77.487,
    clients: ["Aditi Kulkarni", "Mohan Kulkarni"],
    clientEmail: "aditi.kulkarni@example.com",
    builtUpArea: 2400,
    ratePerSqFt: 2800,
    plotPerimeter: 260,
    onboardedBy: "rohan",
    originalValue: 6720000,
    revisions: [],
    team: { poc: "kavya", head: "lakshmi", architects: [], engineers: [], procurement: ["prakash"] },
    handoff: "",
    phase: "draft",
    milestones: [],
    billsBefore: {},
  },
];

/** The code given to Kulkarni Eco Home when its workspace is opened. Format to be confirmed. */
export const KULKARNI_CODE = projectCode("eco", CODE_NUMBERS.kulkarni, "Aditi Kulkarni");

// ---- Money ----

export type Receipt = {
  id: string;
  projectId: ProjectId;
  n: number;
  /** With GST. */
  amount: number;
  source: "bank" | "client";
  reference: string;
  on: string;
  by: PersonId;
};

/** Receipts written down item by item. Every other paid milestone gets one "Earlier payment". */
export const seedReceipts: Receipt[] = [
  { id: "r-iyer-0", projectId: "iyer", n: 0, amount: 490880, source: "client", reference: "UTR ...2214", on: "2026-05-27", by: "divya" },
  { id: "r-iyer-1a", projectId: "iyer", n: 1, amount: 1300000, source: "bank", reference: "UTR ...8812", on: "2026-07-16", by: "divya" },
  { id: "r-iyer-1b", projectId: "iyer", n: 1, amount: 264680, source: "client", reference: "UTR ...8830", on: "2026-07-16", by: "divya" },
  { id: "r-iyer-2a", projectId: "iyer", n: 2, amount: 1300000, source: "bank", reference: "UTR ...0417", on: "2026-09-07", by: "divya" },
  { id: "r-iyer-2b", projectId: "iyer", n: 2, amount: 241670, source: "client", reference: "UTR ...0433", on: "2026-09-07", by: "divya" },
  { id: "r-bhat-6a", projectId: "bhat", n: 6, amount: 590000, source: "bank", reference: "UTR ...6120", on: "2026-11-10", by: "divya" },
];

/** Bills entered before the demo, one row per milestone. */
export const EARLIER_BILLS = "Earlier bills, entered before 1 Nov 2026";

export type BillSeed = {
  id: string;
  projectId: ProjectId;
  n: number;
  vendorId?: string;
  /** For bills that name a supplier outside the vendor list. */
  vendorName?: string;
  poNo?: string;
  billNo: string;
  /** Before GST. */
  amount: number;
  gst: number;
  on: string;
  enteredBy?: PersonId;
  enteredAt?: string;
  label: string;
};

export const seedBills: BillSeed[] = [
  {
    id: "b-cottage-soil",
    projectId: "iyer-cottage",
    n: 0,
    vendorName: "Geo Soil Labs",
    billNo: "GSL/0921",
    amount: 45000,
    gst: 8100,
    on: "2026-10-12",
    label: "Soil test, Geo Soil Labs",
  },
  {
    id: "b-cottage-survey",
    projectId: "iyer-cottage",
    n: 0,
    vendorName: "Survey Point",
    billNo: "SP/1044",
    amount: 40000,
    gst: 7200,
    on: "2026-10-14",
    label: "Plot survey, Survey Point",
  },
  {
    id: "b-bct-1126",
    projectId: "iyer",
    n: 4,
    vendorId: "v03",
    poNo: "PO-2026-0421",
    billNo: "BCT/1126",
    amount: 46800,
    gst: 8424,
    on: "2026-11-08",
    enteredBy: "divya",
    enteredAt: "2026-11-08T12:10",
    label: "Cement, Bharat Cement Traders",
  },
];

// ---- Material requests and POs ----

export type RequestLine = {
  id: string;
  /** Catalogue id: "cement". */
  material: string;
  sub: string;
  qty: number;
  unit: string;
  /**
   * @deprecated Only the architect recommends changes now, so a site line is never flagged
   * as outside the estimate. Kept so older saved requests still read; it has no effect.
   */
  outsideEstimate?: boolean;
  /** A short note on the line: "for the pool deck". */
  note?: string;
};

export type RequestSeed = {
  no: string;
  projectId: ProjectId;
  n: number;
  by: PersonId;
  at: string;
  neededBy: string;
  lines: RequestLine[];
  seenAt?: string;
  seenBy?: PersonId;
  deliveredAt?: string;
  deliveredBy?: PersonId;
  /** The site task the material is for (see portal-data.ts). */
  taskId?: string;
};

export type PoLine = { lineId: string; qty: number; rate: number; gstPercent: number };

export type PoSeed = {
  no: string;
  requestNo: string;
  projectId: ProjectId;
  n: number;
  vendorId: string;
  at: string;
  by: PersonId;
  lines: PoLine[];
  file: string;
  billNo?: string;
  /** The day the vendor's bill reached the office, so it can be entered. */
  billIn?: string;
};

export const seedRequests: RequestSeed[] = [
  {
    no: "MR-2026-0124",
    projectId: "nair",
    n: 8,
    by: "suresh",
    at: "2026-10-28T08:20",
    neededBy: "2026-11-03",
    lines: [
      { id: "0124-1", material: "aggregate", sub: "20 mm", qty: 1000, unit: "cu ft", outsideEstimate: false },
      { id: "0124-2", material: "sand", sub: "P-sand for plastering", qty: 800, unit: "cu ft", outsideEstimate: false },
    ],
    seenAt: "2026-10-28T11:00",
    seenBy: "prakash",
    deliveredAt: "2026-11-04T09:30",
    deliveredBy: "suresh",
  },
  {
    no: "MR-2026-0127",
    projectId: "iyer",
    n: 4,
    by: "suresh",
    at: "2026-10-27T08:05",
    neededBy: "2026-10-30",
    lines: [{ id: "0127-1", material: "sand", sub: "M-sand for concrete", qty: 1960, unit: "cu ft", outsideEstimate: false }],
    seenAt: "2026-10-27T09:40",
    seenBy: "prakash",
    deliveredAt: "2026-10-30T16:00",
    deliveredBy: "suresh",
  },
  {
    no: "MR-2026-0130",
    projectId: "bhat",
    n: 7,
    by: "ravi",
    at: "2026-10-29T09:10",
    neededBy: "2026-11-20",
    lines: [
      { id: "0130-1", material: "tiles", sub: "Vitrified 800 × 800 mm", qty: 2500, unit: "sq ft", outsideEstimate: false },
    ],
    seenAt: "2026-10-29T14:00",
    seenBy: "prakash",
  },
  {
    no: "MR-2026-0133",
    projectId: "dsouza",
    n: 2,
    by: "ravi",
    at: "2026-10-31T08:45",
    neededBy: "2026-11-06",
    lines: [{ id: "0133-1", material: "blocks", sub: "4 inch", qty: 2375, unit: "nos", outsideEstimate: false }],
    seenAt: "2026-10-31T12:30",
    seenBy: "prakash",
    deliveredAt: "2026-11-06T10:15",
    deliveredBy: "ravi",
  },
  {
    no: "MR-2026-0136",
    projectId: "iyer",
    n: 4,
    by: "suresh",
    at: "2026-11-02T08:10",
    neededBy: "2026-11-09",
    lines: [
      { id: "0136-1", material: "steel", sub: "12 mm", qty: 850, unit: "kg", outsideEstimate: false },
      { id: "0136-2", material: "wire", sub: "18 gauge", qty: 40, unit: "kg", outsideEstimate: false },
    ],
    seenAt: "2026-11-02T09:12",
    seenBy: "prakash",
  },
  {
    no: "MR-2026-0138",
    projectId: "iyer",
    n: 4,
    by: "suresh",
    at: "2026-11-04T07:50",
    neededBy: "2026-11-07",
    lines: [{ id: "0138-1", material: "cement", sub: "OPC 53 grade", qty: 120, unit: "bags", outsideEstimate: false }],
    seenAt: "2026-11-04T10:20",
    seenBy: "prakash",
    deliveredAt: "2026-11-07T15:40",
    deliveredBy: "suresh",
  },
  {
    no: "MR-2026-0139",
    projectId: "dsouza",
    n: 2,
    by: "ravi",
    at: "2026-11-08T08:30",
    neededBy: "2026-11-13",
    lines: [{ id: "0139-1", material: "blocks", sub: "6 inch", qty: 3000, unit: "nos", outsideEstimate: false }],
  },
  {
    no: "MR-2026-0140",
    projectId: "nair",
    n: 9,
    by: "suresh",
    at: "2026-11-09T09:05",
    neededBy: "2026-11-30",
    lines: [
      { id: "0140-1", material: "tiles", sub: "Vitrified 600 × 600 mm", qty: 3800, unit: "sq ft", outsideEstimate: false },
      {
        id: "0140-2",
        material: "tiles",
        sub: "Anti-skid 300 × 300 mm",
        qty: 420,
        unit: "sq ft",
        outsideEstimate: false,
        note: "for the pool deck",
      },
    ],
    seenAt: "2026-11-10T11:00",
    seenBy: "imran",
  },
  {
    no: "MR-2026-0141",
    projectId: "bhat",
    n: 5,
    by: "ravi",
    at: "2026-11-10T16:15",
    neededBy: "2026-11-16",
    lines: [{ id: "0141-1", material: "conduit", sub: "25 mm", qty: 180, unit: "lengths", outsideEstimate: false }],
  },
];

export const seedPos: PoSeed[] = [
  {
    no: "PO-2026-0402",
    requestNo: "MR-2026-0124",
    projectId: "nair",
    n: 8,
    vendorId: "v04",
    at: "2026-10-29T12:00",
    by: "prakash",
    lines: [
      { lineId: "0124-1", qty: 1000, rate: 58, gstPercent: 18 },
      { lineId: "0124-2", qty: 800, rate: 65, gstPercent: 18 },
    ],
    file: "PO-2026-0402.pdf (sample)",
    billIn: "2026-11-06",
  },
  {
    no: "PO-2026-0409",
    requestNo: "MR-2026-0127",
    projectId: "iyer",
    n: 4,
    vendorId: "v05",
    at: "2026-10-27T15:00",
    by: "prakash",
    lines: [{ lineId: "0127-1", qty: 1960, rate: 60, gstPercent: 18 }],
    file: "PO-2026-0409.pdf (sample)",
    billIn: "2026-11-02",
  },
  {
    no: "PO-2026-0412",
    requestNo: "MR-2026-0130",
    projectId: "bhat",
    n: 7,
    vendorId: "v07",
    at: "2026-10-30T11:00",
    by: "prakash",
    lines: [{ lineId: "0130-1", qty: 2500, rate: 60, gstPercent: 18 }],
    file: "PO-2026-0412.pdf (sample)",
  },
  {
    no: "PO-2026-0415",
    requestNo: "MR-2026-0133",
    projectId: "dsouza",
    n: 2,
    vendorId: "v06",
    at: "2026-11-01T10:30",
    by: "prakash",
    lines: [{ lineId: "0133-1", qty: 2375, rate: 40, gstPercent: 18 }],
    file: "PO-2026-0415.pdf (sample)",
  },
  {
    no: "PO-2026-0418",
    requestNo: "MR-2026-0136",
    projectId: "iyer",
    n: 4,
    vendorId: "v01",
    at: "2026-11-05T10:05",
    by: "prakash",
    lines: [
      { lineId: "0136-1", qty: 500, rate: 68, gstPercent: 18 },
      { lineId: "0136-2", qty: 40, rate: 85, gstPercent: 18 },
    ],
    file: "PO-2026-0418.pdf (sample)",
  },
  {
    no: "PO-2026-0421",
    requestNo: "MR-2026-0138",
    projectId: "iyer",
    n: 4,
    vendorId: "v03",
    at: "2026-11-05T11:30",
    by: "prakash",
    lines: [{ lineId: "0138-1", qty: 120, rate: 390, gstPercent: 18 }],
    file: "PO-2026-0421.pdf (sample)",
    billNo: "BCT/1126",
    billIn: "2026-11-08",
  },
];

/** Request numbers whose pages are built ahead, so requests raised in the demo can open. */
export const REQUEST_NUMBERS: string[] = [
  ...seedRequests.map((request) => request.no),
  ...Array.from({ length: 8 }, (_, i) => `MR-2026-${String(142 + i).padStart(4, "0")}`),
];

// ---- Cost revisions, the cottage estimate and register notes ----

export type RevisionSeed = {
  id: string;
  projectId: ProjectId;
  item: string;
  /** Before GST. */
  amount: number;
  days: number;
  specSheet: string;
  raisedAt: string;
  raisedBy: PersonId;
  /** The client change it is the same decision as. */
  changeId?: string;
  heldUntil?: string;
  lands: { n: number; amount: number }[];
};

/** Raised before the demo. The two on Iyer are the client's pending changes. */
export const seedRevisions: RevisionSeed[] = [
  {
    id: "CR-2026-005",
    projectId: "iyer",
    item: "Study next to the master bedroom",
    amount: 390000,
    days: 9,
    specSheet: "Draft 3 - Floor plan",
    raisedAt: "2026-06-10T16:00",
    raisedBy: "vikram",
    changeId: "study-room",
    lands: [],
  },
  {
    id: "CR-2026-006",
    projectId: "iyer",
    item: "Larger living room windows",
    amount: 84000,
    days: 4,
    specSheet: "W-02, revised window schedule",
    raisedAt: "2026-11-03T15:30",
    raisedBy: "vikram",
    changeId: "living-glazing",
    heldUntil: "2026-11-18",
    lands: [{ n: 10, amount: 84000 }],
  },
  {
    id: "CR-2026-007",
    projectId: "iyer",
    item: "Jacuzzi on the terrace",
    amount: 240000,
    days: 12,
    specSheet: "S-311, terrace jacuzzi specification",
    raisedAt: "2026-11-07T16:10",
    raisedBy: "vikram",
    changeId: "terrace-jacuzzi",
    heldUntil: "2026-11-22",
    lands: [
      { n: 6, amount: 45000 },
      { n: 7, amount: 195000 },
    ],
  },
];

/**
 * @deprecated Site lines are no longer flagged as outside the estimate, so nothing asks for
 * this prefill any more. Kept only so older screens compile.
 */
export const revisionToRaise = {
  projectId: "nair" as ProjectId,
  requestNo: "MR-2026-0140",
  lineId: "0140-2",
  item: "Anti-skid tiles for the pool deck, 420 sq ft",
  amount: 36500,
  days: 3,
  specSheet: "S-412, pool deck finishes (sample file)",
};

export type RegisterNote = {
  id: string;
  projectId: ProjectId;
  /** Whose register it sits in. */
  for: PersonId;
  by: PersonId;
  on: string;
  n: number;
  text: string;
};

export const registerNotes: RegisterNote[] = [
  {
    id: "note:iyer-split",
    projectId: "iyer",
    for: "vikram",
    by: "kavya",
    on: "2026-11-09",
    n: 6,
    text: "Kavya noted on 9 Nov that Meera's bank releases instalment 6 in two parts.",
  },
];

/** The reason the client sees for splitting Iyer milestone 5. */
export const SPLIT_REASON = "Your bank releases this stage in two parts.";

export const cottageEstimate = {
  projectId: "iyer-cottage" as ProjectId,
  issuedOn: "2026-11-11",
  validUntil: "2026-11-26",
  partA: { area: 1850, rate: 2400, amount: 4440000 },
  addOns: [{ name: "Rainwater harvesting tank", amount: 120000 }],
  /** Part A plus add-ons, before GST. */
  amount: 4560000,
  gst: 820800,
  total: 5380800,
  partB: {
    note: "Billed as that work happens, to be confirmed by Poetry",
    items: [
      { name: "Compound wall, gate and setback", formula: "420 ft × ₹2,000 + ₹3,00,000", amount: 1140000 },
      { name: "Underground sump", formula: "₹1,50,000", amount: 150000 },
    ],
    amount: 1290000,
    gst: 232200,
    total: 1522200,
  },
  grandTotal: 6903000,
  /** On ₹45,60,000, the agreed split. The sign-up was paid on the old amount; the gap sits in instalment 1. */
  schedule: [216000, 696000, 684000, 456000, 456000, 456000, 364800, 364800, 364800, 364800, 136800],
  gapNote: "The sign-up was paid on the old amount. The ₹12,000 gap (5% of ₹2,40,000) goes into instalment 1.",
  addendum: "Addendum 1 to your agreement for Iyer Farm Cottage, dated 11 Nov 2026",
  emailed: ["lakshmi", "prakash", "shalini"] as PersonId[],
};

// ---- Tasks and the time log ----

export type TaskSeed = Omit<Task, "due" | "dueLabel" | "assignedBy"> & {
  person: PersonId;
  projectId: ProjectId;
  assignedBy: PersonId;
  kind: "work" | "consultation";
  /** "YYYY-MM-DDTHH:mm". Standing consultation tasks have none. */
  dueAt?: string;
  submittedAt?: string;
  acceptedAt?: string;
  /** How a reviewer names it: "tiling measurement". */
  short?: string;
};

export type TimeEntry = {
  id: string;
  person: PersonId;
  taskId: string;
  projectId: ProjectId;
  date: string;
  hours: number;
  consultation: boolean;
  /** For consultation: who it was with. */
  with?: string;
  topic?: string;
};

const ANANYA: Record<string, Pick<TaskSeed, "projectId" | "dueAt" | "submittedAt" | "acceptedAt" | "short">> = {
  t1: { projectId: "dsouza", dueAt: "2026-11-11T18:00" },
  t2: { projectId: "iyer", dueAt: "2026-11-13T12:00" },
  t3: { projectId: "iyer", dueAt: "2026-11-10T18:00", short: "staircase railing detail" },
  t4: {
    projectId: "nair",
    dueAt: "2026-11-10T18:00",
    submittedAt: "2026-11-10T17:40",
    short: "compound wall elevation",
  },
  t5: { projectId: "iyer", dueAt: "2026-11-09T18:00", acceptedAt: "2026-11-09T17:00" },
};

function consultation(id: string, projectId: ProjectId, project: string, head: PersonId): TaskSeed {
  return {
    id,
    title: `Client consultations, ${project}`,
    project,
    deliverable: "Time with the client, drawn from their advisory hours",
    assignedBy: head,
    assignedOn: "2026-01-12",
    status: "in-progress",
    loggedHours: 0,
    person: head,
    projectId,
    kind: "consultation",
  };
}

export const seedTasks: TaskSeed[] = [
  // Ananya's five keep their words from demo-data.ts.
  ...ananyaTasks.map(
    (task): TaskSeed => ({
      id: task.id,
      title: task.title,
      project: task.project,
      deliverable: task.deliverable,
      assignedOn: task.assignedOn,
      status: task.status,
      loggedHours: task.loggedHours,
      note: task.note,
      ...ANANYA[task.id],
      person: "ananya",
      assignedBy: "vikram",
      kind: "work",
    }),
  ),
  {
    id: "t6",
    title: "Verandah section",
    project: "Iyer Farm Cottage",
    deliverable: "PDF drawing",
    assignedBy: "lakshmi",
    assignedOn: "2026-11-09",
    status: "in-progress",
    loggedHours: 3,
    person: "karan",
    projectId: "iyer-cottage",
    kind: "work",
    dueAt: "2026-11-12T18:00",
  },
  {
    id: "t7",
    title: "Concept plan",
    project: "Sharma Villa",
    deliverable: "PDF and images",
    assignedBy: "lakshmi",
    assignedOn: "2026-11-10",
    status: "planned",
    loggedHours: 0,
    person: "karan",
    projectId: "sharma",
    kind: "work",
    dueAt: "2026-11-16T18:00",
  },
  {
    id: "t8",
    title: "Flooring check visit",
    project: "Nair Farmhouse",
    deliverable: "Site note in the thread",
    assignedBy: "shalini",
    assignedOn: "2026-11-10",
    status: "planned",
    loggedHours: 0,
    person: "vikram",
    projectId: "nair",
    kind: "work",
    dueAt: "2026-11-13T17:00",
  },
  {
    id: "s1",
    title: "Bar bending schedule check, second floor slab",
    project: "Iyer Residence",
    deliverable: "Checked schedule and one photo in the thread",
    assignedBy: "vikram",
    assignedOn: "2026-11-09",
    status: "in-progress",
    loggedHours: 1,
    person: "suresh",
    projectId: "iyer",
    kind: "work",
    dueAt: "2026-11-11T17:00",
  },
  {
    id: "m1",
    title: "Log moisture readings on the first floor slab",
    project: "Iyer Residence",
    deliverable: "Readings sheet (PDF)",
    assignedBy: "suresh",
    assignedOn: "2026-11-07",
    status: "in-progress",
    loggedHours: 1.5,
    person: "manjunath",
    projectId: "iyer",
    kind: "work",
    dueAt: "2026-11-11T18:00",
  },
  {
    id: "m2",
    title: "Measure the tiling area, Nair verandah",
    project: "Nair Farmhouse",
    deliverable: "Measurement sheet (PDF)",
    assignedBy: "suresh",
    assignedOn: "2026-11-06",
    status: "submitted",
    loggedHours: 3,
    person: "manjunath",
    projectId: "nair",
    kind: "work",
    dueAt: "2026-11-10T18:00",
    submittedAt: "2026-11-10T16:20",
    short: "tiling measurement",
  },
  consultation("c-iyer", "iyer", "Iyer Residence", "vikram"),
  consultation("c-nair", "nair", "Nair Farmhouse", "vikram"),
  consultation("c-dsouza", "dsouza", "D'Souza Villa", "lakshmi"),
  consultation("c-cottage", "iyer-cottage", "Iyer Farm Cottage", "lakshmi"),
];

const NAME_TO_ID: Record<string, PersonId> = { "Ananya Rao": "ananya", "Vikram Desai": "vikram" };

export const seedTime: TimeEntry[] = [
  ...(
    [
      ["ananya", "t5", "iyer", "2026-11-02", 2],
      ["ananya", "t5", "iyer", "2026-11-03", 2.5],
      ["ananya", "t5", "iyer", "2026-11-04", 1.5],
      ["ananya", "t3", "iyer", "2026-11-04", 1.5],
      ["ananya", "t3", "iyer", "2026-11-05", 2],
      ["ananya", "t4", "nair", "2026-11-06", 2],
      ["ananya", "t4", "nair", "2026-11-09", 2],
      ["ananya", "t1", "dsouza", "2026-11-10", 1],
      ["ananya", "t1", "dsouza", "2026-11-11", 1],
      ["karan", "t6", "iyer-cottage", "2026-11-09", 1.5],
      ["karan", "t6", "iyer-cottage", "2026-11-10", 1.5],
      ["suresh", "s1", "iyer", "2026-11-10", 1],
      ["manjunath", "m1", "iyer", "2026-11-09", 0.5],
      ["manjunath", "m1", "iyer", "2026-11-10", 1],
      ["manjunath", "m2", "nair", "2026-11-06", 1.5],
      ["manjunath", "m2", "nair", "2026-11-10", 1.5],
    ] as [PersonId, string, ProjectId, string, number][]
  ).map(([person, taskId, projectId, date, hours], i) => ({
    id: `te${i + 1}`,
    person,
    taskId,
    projectId,
    date,
    hours,
    consultation: false,
  })),
  // Meera's consultations, from her hours page.
  ...iyerCredits.entries.map((entry, i) => ({
    id: `te-cr${i + 1}`,
    person: NAME_TO_ID[entry.with] ?? "vikram",
    taskId: "c-iyer",
    projectId: "iyer" as ProjectId,
    date: entry.date,
    hours: entry.hours,
    consultation: true,
    with: "Meera Iyer",
    topic: entry.topic,
  })),
];

/** The working week shown as "this week". */
export const WEEK = { from: "2026-11-09", to: "2026-11-14", previousFrom: "2026-11-02" };

// ---- Performance (seniors and admin only) ----

export type PerformanceRow = {
  person: PersonId;
  tasks: number;
  onTime: number;
  late: number;
  onTimePercent: number;
  avgRevisions: number;
  avgDays: number;
  byCategory: { category: CategoryId; words: string }[];
};

export const performance: PerformanceRow[] = [
  {
    person: "ananya",
    tasks: 14,
    onTime: 11,
    late: 3,
    onTimePercent: 79,
    avgRevisions: 1.2,
    avgDays: 3.1,
    byCategory: [
      { category: "city-villa", words: "9 tasks, 2.6 days, 89% on time" },
      { category: "farmhouse", words: "5 tasks, 4.0 days, 60% on time" },
    ],
  },
  {
    person: "karan",
    tasks: 11,
    onTime: 6,
    late: 5,
    onTimePercent: 55,
    avgRevisions: 1.8,
    avgDays: 4.4,
    byCategory: [
      { category: "city-villa", words: "6 tasks, 3.1 days, 67% on time" },
      { category: "farmhouse", words: "5 tasks, 6.0 days, 40% on time" },
    ],
  },
  {
    person: "manjunath",
    tasks: 9,
    onTime: 8,
    late: 1,
    onTimePercent: 89,
    avgRevisions: 0.3,
    avgDays: 1.6,
    byCategory: [
      { category: "city-villa", words: "5 tasks, 1.5 days" },
      { category: "farmhouse", words: "4 tasks, 1.8 days" },
    ],
  },
];

export type CourseBlock = {
  title: string;
  projectId: ProjectId;
  assigned: string;
  due: string;
  accepted: string;
  revisions: number;
  /** 0 when on time. */
  lateDays: number;
};

/** The last 30 days as task blocks, oldest first, for the task course drawing. */
export const courses: Partial<Record<PersonId, CourseBlock[]>> = {
  ananya: [
    { title: "Terrace plan, first version", projectId: "iyer", assigned: "2026-10-16", due: "2026-10-23", accepted: "2026-10-23", revisions: 1, lateDays: 0 },
    { title: "Ground floor plan, version 2", projectId: "dsouza", assigned: "2026-10-20", due: "2026-10-28", accepted: "2026-10-27", revisions: 0, lateDays: 0 },
    { title: "Verandah column detail", projectId: "nair", assigned: "2026-10-14", due: "2026-10-20", accepted: "2026-10-24", revisions: 2, lateDays: 4 },
    { title: "Kitchen specification, first version", projectId: "iyer", assigned: "2026-10-28", due: "2026-11-04", accepted: "2026-11-05", revisions: 1, lateDays: 1 },
    { title: "Second floor and terrace plan, second version", projectId: "iyer", assigned: "2026-11-02", due: "2026-11-09", accepted: "2026-11-09", revisions: 0, lateDays: 0 },
  ],
  karan: [
    { title: "Roof truss layout", projectId: "nair", assigned: "2026-10-12", due: "2026-10-19", accepted: "2026-10-26", revisions: 2, lateDays: 7 },
    { title: "Farm cottage concept plan", projectId: "iyer-cottage", assigned: "2026-10-13", due: "2026-10-23", accepted: "2026-10-29", revisions: 2, lateDays: 6 },
    { title: "Staircase section", projectId: "dsouza", assigned: "2026-10-19", due: "2026-10-26", accepted: "2026-10-26", revisions: 0, lateDays: 0 },
    { title: "Electrical layout, ground floor", projectId: "dsouza", assigned: "2026-10-27", due: "2026-11-02", accepted: "2026-11-04", revisions: 1, lateDays: 2 },
    { title: "Kitchen elevation", projectId: "nair", assigned: "2026-11-02", due: "2026-11-06", accepted: "2026-11-10", revisions: 1, lateDays: 4 },
  ],
};

/** The plain finding for Vikram's team page. */
export const TEAM_FINDING = "Karan is late on 4 of his last 5 tasks, mostly farmhouses.";

// ---- Advisory hours ----

export type Pool = { granted: number; used: number };

export type Credits = { projectId: ProjectId; before: Pool; during: Pool; constructionStarted: boolean };

export type CreditRequest = { id: string; projectId: ProjectId; by: string; hours: number; at: string };

export type CreditAddition = {
  id: string;
  projectId: ProjectId;
  hours: number;
  pool: "before" | "during";
  by: PersonId;
  at: string;
  /** Before GST. */
  amount: number;
  receivedOn: string;
  reference: string;
  reason: string;
};

/** Base pools before any hours were bought. Iyer comes from demo-data.ts. */
export const seedCredits: Credits[] = [
  {
    projectId: "iyer",
    before: { ...iyerCredits.preConstruction },
    during: { ...iyerCredits.construction },
    constructionStarted: true,
  },
  { projectId: "iyer-cottage", before: { granted: 12, used: 4.5 }, during: { granted: 8, used: 0 }, constructionStarted: false },
  { projectId: "nair", before: { granted: 12, used: 12 }, during: { granted: 8, used: 7.5 }, constructionStarted: true },
  { projectId: "dsouza", before: { granted: 12, used: 10 }, during: { granted: 8, used: 1.5 }, constructionStarted: true },
  { projectId: "bhat", before: { granted: 12, used: 12 }, during: { granted: 8, used: 12.5 }, constructionStarted: true },
  { projectId: "fernandes", before: { granted: 12, used: 12 }, during: { granted: 8, used: 8 }, constructionStarted: true },
  { projectId: "sharma", before: { granted: 12, used: 0 }, during: { granted: 8, used: 0 }, constructionStarted: false },
];

export const seedCreditRequests: CreditRequest[] = [
  { id: "hours:nair-1", projectId: "nair", by: "Priya Nair", hours: 4, at: "2026-11-06T18:30" },
];

export const seedAdditions: CreditAddition[] = [
  {
    id: "add-bhat-1",
    projectId: "bhat",
    hours: 3,
    pool: "during",
    by: "rohan",
    at: "2026-09-14T15:20",
    amount: 15000,
    receivedOn: "2026-09-13",
    reference: "UTR ...3391",
    reason: "Bought after the electrical layout sessions.",
  },
];

/** Price of bought hours, before GST. Sample, open question. */
export const HOUR_PRICE = 5000;
/** Low means this many hours or fewer left in the current pool. */
export const LOW_HOURS = 3;

// ---- Thread posts ----

export type Post = {
  id: string;
  projectId: ProjectId;
  by: PersonId;
  at: string;
  text: string;
  photos: PhotoKind[];
  storey: StoreyGroup | null;
  /** "decision" is a system note: an approval, a payment step or a letter. */
  kind: "post" | "decision" | "version" | "revision";
  /** Names of files attached to a post, e.g. a client's own photo "kitchen-tiles.jpg". */
  files?: string[];
};

export const seedPosts: Post[] = [
  {
    id: "p1",
    projectId: "iyer",
    by: "meera",
    at: "2026-06-12T20:05",
    text: "Meera Iyer approved the study next to the master bedroom. Recorded as Addendum 1.",
    photos: [],
    storey: "first",
    kind: "decision",
  },
  {
    id: "p2",
    projectId: "iyer",
    by: "meera",
    at: "2026-10-30T21:40",
    text: "Can we see the railing samples on Saturday?",
    photos: [],
    storey: null,
    kind: "post",
  },
  {
    id: "p3",
    projectId: "iyer",
    by: "kavya",
    at: "2026-10-31T10:15",
    text: "Yes. Suresh will keep two samples at site from 10 am.",
    photos: [],
    storey: null,
    kind: "post",
  },
  {
    id: "p4",
    projectId: "iyer",
    by: "suresh",
    at: "2026-10-22T17:30",
    text: "Ground floor roof slab cast today. Curing starts tomorrow for 21 days.",
    photos: ["slab-pour", "shuttering", "curing"],
    storey: "ground",
    kind: "post",
  },
  {
    id: "p5",
    projectId: "iyer",
    by: "vikram",
    at: "2026-11-07T16:10",
    text: "Priced the jacuzzi you asked about: ₹2,40,000 before GST and 12 days. The revised specification S-311 is in Changes.",
    photos: [],
    storey: "second",
    kind: "revision",
  },
  {
    id: "p6",
    projectId: "iyer",
    by: "vikram",
    at: "2026-11-09T10:15",
    text: "Vikram Desai raised the demand letter for Instalment 5, letter PD/DL/2026-27/0034.",
    photos: [],
    storey: "first",
    kind: "decision",
  },
  {
    id: "p7",
    projectId: "iyer",
    by: "ananya",
    at: "2026-11-06T16:00",
    text: "Door frames are up for your choice: teak for the main door, sal wood inside.",
    photos: [],
    storey: "first",
    kind: "version",
  },
  {
    id: "p8",
    projectId: "iyer",
    by: "suresh",
    at: "2026-11-10T08:05",
    text: "First floor walls at lintel height on the north side.",
    photos: ["blocks", "steel"],
    storey: "first",
    kind: "post",
  },
  {
    id: "p9",
    projectId: "nair",
    by: "imran",
    at: "2026-11-10T11:00",
    text: "Tiles request seen. Getting quotes from Tile Mart and one more.",
    photos: [],
    storey: null,
    kind: "post",
  },
  {
    id: "p10",
    projectId: "nair",
    by: "suresh",
    at: "2026-11-10T17:10",
    text: "External plaster done on the east and north faces. West face next.",
    photos: ["sand"],
    storey: null,
    kind: "post",
  },
];

// ---- Approval log and audit trail (seed) ----

export type LogEntry = {
  id: string;
  at: string;
  by: PersonId;
  projectId?: ProjectId;
  kind: "client" | "staff" | "deleted";
  action: string;
  detail?: string;
  reason?: string;
};

export const seedLog: LogEntry[] = [
  { id: "l1", at: "2026-05-25T11:30", by: "rohan", projectId: "iyer", kind: "staff", action: "Signed agreement uploaded for Iyer Residence, ₹83,20,000." },
  { id: "l2", at: "2026-05-26T18:20", by: "meera", projectId: "iyer", kind: "client", action: "Approved the payment schedule, sign-up and 10 instalments." },
  { id: "l6", at: "2026-06-12T20:05", by: "meera", projectId: "iyer", kind: "client", action: "Approved the study, Addendum 1, +₹3,90,000 and 9 days." },
  { id: "l3", at: "2026-06-24T20:45", by: "meera", projectId: "iyer", kind: "client", action: "Approved the final draft floor plan, version 1." },
  { id: "l4", at: "2026-07-01T21:00", by: "meera", projectId: "iyer", kind: "client", action: "Approved the 3D final elevation, version 1." },
  { id: "l7", at: "2026-07-02T20:10", by: "meera", projectId: "iyer", kind: "client", action: "Approved the design and cost, pre structure." },
  { id: "l9", at: "2026-07-10T21:00", by: "meera", projectId: "iyer", kind: "client", action: "Approved the final estimation." },
  { id: "l8", at: "2026-07-13T18:40", by: "meera", projectId: "iyer", kind: "client", action: "Approved payment for Instalment 1, ₹15,64,680." },
  { id: "l10", at: "2026-09-01T21:02", by: "meera", projectId: "iyer", kind: "client", action: "Approved payment for Instalment 2, ₹15,41,670." },
  {
    id: "l11",
    at: "2026-09-16T21:20",
    by: "meera",
    projectId: "iyer",
    kind: "client",
    action: "Asked for changes to the window & skylight grill, version 1.",
    detail: "Simpler bars on the skylight, no scrollwork.",
  },
  { id: "l12", at: "2026-09-18T20:30", by: "meera", projectId: "iyer", kind: "client", action: "Approved the window & skylight grill, version 2." },
  {
    id: "l13",
    at: "2026-11-03T15:00",
    by: "shalini",
    kind: "staff",
    action: "Gave Divya Shenoy finance access on all projects.",
    reason: "She records bills and payments.",
  },
  { id: "l15", at: "2026-11-02T08:10", by: "suresh", projectId: "iyer", kind: "staff", action: "Raised MR-2026-0136." },
  { id: "l16", at: "2026-11-02T09:12", by: "prakash", projectId: "iyer", kind: "staff", action: "Marked MR-2026-0136 seen." },
  {
    id: "l17",
    at: "2026-11-05T10:05",
    by: "prakash",
    projectId: "iyer",
    kind: "staff",
    action: "Uploaded PO-2026-0418 for MR-2026-0136, 500 of 850 kg.",
  },
  { id: "l18", at: "2026-10-25T17:30", by: "suresh", projectId: "iyer", kind: "staff", action: "Marked Iyer Residence milestone 3 done, with 3 photos." },
  {
    id: "l19",
    at: "2026-11-09T10:15",
    by: "vikram",
    projectId: "iyer",
    kind: "staff",
    action: "Raised the demand letter for Iyer Residence Instalment 5, letter PD/DL/2026-27/0034.",
  },
  {
    id: "l20",
    at: "2026-11-07T11:20",
    by: "rohan",
    projectId: "sharma",
    kind: "staff",
    action: "Opened Sharma Villa and invited Rakesh Sharma.",
    detail: "One onboarded client, November.",
  },
  {
    id: "l21",
    at: "2026-11-07T16:10",
    by: "vikram",
    projectId: "iyer",
    kind: "staff",
    action: "Raised cost revision CR-2026-007, jacuzzi, +₹2,40,000 and 12 days.",
  },
  {
    id: "l22",
    at: "2026-11-10T14:10",
    by: "divya",
    projectId: "bhat",
    kind: "staff",
    action: "Recorded ₹5,90,000 from the bank for Bhat Residence letter 0033.",
  },
  { id: "l23", at: "2026-11-10T11:00", by: "imran", projectId: "nair", kind: "staff", action: "Marked MR-2026-0140 seen." },
  {
    id: "l24",
    at: "2026-09-14T15:20",
    by: "rohan",
    projectId: "bhat",
    kind: "staff",
    action: "Added 3 hours to Bhat Residence after ₹15,000 received.",
  },
  {
    id: "l25",
    at: "2026-10-05T10:40",
    by: "shalini",
    kind: "deleted",
    action: "Deleted vendor 'Sri Laxmi Steel' (a duplicate of Sri Lakshmi Steels).",
    reason: "Entered twice.",
  },
];

// ---- Designs on other projects (summary rows for staff) ----

export type DesignSummary = {
  projectId: ProjectId;
  designId: string;
  title: string;
  version: number;
  sentAt: string;
  by: PersonId;
  status: DesignStatus;
};

export const designSummaries: DesignSummary[] = [
  {
    projectId: "dsouza",
    designId: "m2-grill",
    title: "Window & skylight grill",
    version: 2,
    sentAt: "2026-11-02T16:00",
    by: "ananya",
    status: "awaiting",
  },
];

// ---- Onboarding ----

export type DraftId = "kulkarni" | "new";

export type DraftStep1 = {
  clients: string[];
  email: string;
  phone: string;
  address: string;
  maps: string;
  lat: number;
  lng: number;
  plotPerimeter: number;
  /** "Already being built": an existing project loaded mid-construction. */
  underWay: boolean;
  name?: string;
};

export type DraftStep2 = {
  category: CategoryId;
  area: number;
  rate: number;
  addOns: { name: string; amount: number }[];
  partB: { id: string; name: string; amount: number }[];
};

export type DraftStep3 = {
  agreementFile?: string;
  signedOn?: string;
  scheduleApproved?: boolean;
  /** Part A before GST, as step 2 worked it out. */
  contractValue?: number;
  /** The sign-up money received, with GST: counted as received once the workspace opens. */
  signUp?: { amount: number; on: string; reference: string };
};

export type DraftStep4 = {
  poc?: PersonId;
  head?: PersonId;
  architects?: PersonId[];
  engineers?: PersonId[];
  procurement?: PersonId[];
  credits?: { before: number; during: number };
};

export type Draft = {
  id: DraftId;
  startedAt: string;
  by: PersonId;
  step1?: DraftStep1;
  step2?: DraftStep2;
  step3?: DraftStep3;
  step4?: DraftStep4;
};

export const seedDrafts: Draft[] = [
  {
    id: "kulkarni",
    startedAt: "2026-11-08T16:00",
    by: "rohan",
    step1: {
      clients: ["Aditi Kulkarni", "Mohan Kulkarni"],
      email: "aditi.kulkarni@example.com",
      phone: "+91 98450 07788",
      address: "Survey 23, Hesaraghatta Main Road, Bengaluru 560088",
      maps: mapsLink(13.139, 77.487),
      lat: 13.139,
      lng: 77.487,
      plotPerimeter: 260,
      underWay: false,
    },
    step2: {
      category: "eco",
      area: 2400,
      rate: 2800,
      addOns: [],
      partB: [
        { id: "compound", name: "Compound wall, gate and setback works", amount: 820000 },
        { id: "sump", name: "Underground sump", amount: 150000 },
      ],
    },
  },
  { id: "new", startedAt: "", by: "rohan" },
];

// ---- Emails (only ever shown as previews) ----

export const emailRules: { event: string; to: string }[] = [
  { event: "A team member posts in the thread", to: "The client only. Client posts send no email." },
  { event: "New design version or specification package", to: "The client" },
  { event: "Client approves or asks for changes on a design", to: "The Project Head and the uploading architect" },
  { event: "Payment raised", to: "The client" },
  { event: "Client accepts a stage or approves a payment", to: "The Project Head and the accountant" },
  { event: "Material request raised", to: "Procurement for that site, with project, material and quantity" },
  { event: "Cost revision raised", to: "Everyone on the project, client included" },
  { event: "Cost revision or final estimate approved", to: "The Project Head, procurement lead, accountant and admin" },
  { event: "Schedule change proposed", to: "The client" },
  { event: "Client asks for more hours", to: "Business development and admin" },
  { event: "Hours added", to: "The client and the accountant" },
  { event: "Invite", to: "The client" },
];

// ---- Events: the append-only record of everything done in this tab ----

type At = { projectId: ProjectId; n: number };

/**
 * What a catalogue change does, for the derivation to apply. Writers give it beside the
 * record's sentence; an event without it is read back from the sentence's fixed words.
 */
export type CatalogueEdit =
  | { op: "add-item"; name: string; unit: CatalogueUnit }
  | { op: "add-sub"; itemId: string; sub: string }
  | { op: "rename-item"; itemId: string; to: string }
  | { op: "rename-sub"; itemId: string; from: string; to: string };

/** What a deletion strikes, for the derivation to apply. Without it the `what` words are read. */
export type DeletedTarget =
  | { kind: "catalogue-item"; itemId: string }
  | { kind: "catalogue-sub"; itemId: string; sub: string }
  | { kind: "vendor"; vendorId: string }
  | { kind: "bill"; billId: string };

export type EventBody =
  | {
      kind: "request.raised";
      no: string;
      projectId: ProjectId;
      n: number;
      neededBy: string;
      lines: RequestLine[];
      queued?: boolean;
      /** The site task the material is for. */
      taskId?: string;
    }
  | { kind: "request.sent"; no: string }
  | { kind: "request.seen"; no: string }
  | { kind: "po.linked"; po: PoSeed }
  | { kind: "request.delivered"; no: string }
  | ({ kind: "stage.done"; note: string; photos: PhotoKind[] } & At)
  | ({ kind: "payment.raised"; letterNo: string } & At)
  | ({ kind: "stage.accepted" } & At)
  | ({ kind: "payment.approved"; note?: string } & At)
  | { kind: "receipt.recorded"; receipt: Receipt }
  | ({ kind: "bill.entered"; vendorId: string; poNo?: string; billNo: string; amount: number; gst: number; on: string } & At)
  | {
      kind: "revision.raised";
      projectId: ProjectId;
      item: string;
      amount: number;
      days: number;
      specSheet: string;
      lands: { n: number; amount: number }[];
      heldUntil: string;
      fromRequest?: string;
    }
  | ({ kind: "schedule.proposed"; parts: [number, number]; reason: string } & At)
  | ({ kind: "schedule.decided"; status: "approved" | "changes-asked"; comment?: string } & At)
  | ({ kind: "milestone.revised"; from: string; to: string; reason: string } & At)
  | { kind: "estimate.approved"; projectId: "iyer-cottage"; note?: string }
  | { kind: "cottage-schedule.approved" }
  | { kind: "credits.requested"; projectId: ProjectId; hours: number }
  | { kind: "credits.added"; addition: CreditAddition }
  | { kind: "credits.edited"; projectId: ProjectId; pool: "before" | "during"; from: number; to: number; reason: string }
  | { kind: "time.logged"; entry: TimeEntry }
  | { kind: "task.assigned"; task: TaskSeed }
  | { kind: "task.submitted" | "task.accepted" | "task.sent-back"; taskId: string; note?: string }
  | {
      kind: "design.uploaded";
      projectId: ProjectId;
      designId: string;
      version: number;
      note: string;
      neededBefore?: string;
      files: string[];
    }
  // The client's own decisions on designs and changes, kept for the log and the thread.
  | { kind: "design.decided"; projectId: ProjectId; designId: string; version: number; status: DesignStatus; comment?: string }
  | { kind: "change.decided"; projectId: ProjectId; changeId: string; status: ChangeStatus; comment?: string }
  | { kind: "post.added"; post: Post }
  | { kind: "draft.saved"; draftId: DraftId; step: 1 | 2 | 3 | 4; data: Record<string, unknown> }
  | { kind: "workspace.opened"; draftId: DraftId; projectId: ProjectId }
  | { kind: "invite.resent"; projectId: ProjectId }
  | { kind: "person.added"; person: Person; change: string; reason: string }
  | {
      kind: "person.changed";
      person: PersonId;
      change: string;
      reason: string;
      patch?: Partial<Pick<Person, "role" | "senior" | "title" | "active" | "lead" | "teams">>;
    }
  | { kind: "access.given"; personId: PersonId; access: "finance"; scope: ProjectId[] | "all"; reason: string }
  | { kind: "head.changed"; projectId: ProjectId; from: PersonId; to: PersonId; reason: string }
  | { kind: "member.added"; team: "Studio" | "Site" | "Procurement"; personId: PersonId; sites: ProjectId[] }
  | { kind: "vendor.added"; vendor: Vendor }
  | { kind: "catalogue.changed"; change: string; reason?: string; edit?: CatalogueEdit }
  /** `template` is the whole template after the change, Part B included. */
  | { kind: "template.changed"; templateId: CategoryId; change: string; template?: Template }
  | { kind: "record.deleted"; what: string; reason: string; target?: DeletedTarget }
  // ---- Payment gating: locked -> demand letter raised (payment.raised) -> payment made
  // (payment.client-paid) -> payment received (receipt.recorded). ----
  /** The client says the money has gone; `ref` is an optional UTR or cheque number. */
  | ({ kind: "payment.client-paid"; ref?: string } & At)
  /** The client asks Poetry for the demand letter of a stage whose work is done. */
  | ({ kind: "letter.requested" } & At)
  // ---- Design stage items ----
  /** The client opened a design item; marks that version viewed. */
  | { kind: "design.viewed"; projectId: ProjectId; designId: string; version: number }
  // ---- Chat ----
  /** Someone opened the project thread; posts from the other side before it count as read. */
  | { kind: "thread.read"; projectId: ProjectId }
  // ---- Site tasks ----
  | { kind: "site-task.progress"; projectId: ProjectId; taskId: string; percent: number; stepsDone?: number; note?: string }
  | {
      kind: "work-order.requested";
      projectId: ProjectId;
      taskId: string;
      /** "Tiling crew". */
      trade: string;
      days: number;
      startOn: string;
      note?: string;
    }
  | { kind: "work-order.booked"; projectId: ProjectId; workOrderId: string; crew?: string }
  /** The architect sends a drawing a site task is waiting for. */
  | { kind: "drawing.sent"; projectId: ProjectId; drawingId: string; file?: string }
  // ---- Project plans (workflow-plan.ts) ----
  /** The admin generated (or re-generated) a project's plan from the workflow template. */
  | { kind: "plan.generated"; projectId: ProjectId; preStart: string; constructionStart?: string }
  /** The admin gave a plan task to someone else. `taskId` is the template task id ("m4-ff-blocks"). */
  | { kind: "plan.task-assigned"; projectId: ProjectId; taskId: string; to: PersonId; from?: PersonId; reason?: string };

/** One entry in the record. `id` is "e1", "e2", ... in order; `at` comes from stampNow(). */
export type FirmEvent = EventBody & { id: string; at: string; by: PersonId };

/** What a writer passes: the event without its id and time, which the store adds. */
export type NewEvent = EventBody & { by: PersonId };

export type EventKind = FirmEvent["kind"];
