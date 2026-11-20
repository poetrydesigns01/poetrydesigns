/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { projects, type DraftId, type PersonId, type ProjectId } from "./firm-data";

// Business development and architect refinement: the seed and the event shapes for
// prospects (the enquiry form and the sales levels), client requests for architect time and
// the fee that follows, client feedback (NPS), architect invitations and project pictures.
// Fictional: every name, phone, email and amount is made up. Nothing here reads a clock.

// ---- Prospects: Poetry's Client Enquiry Form ----

export type ServiceKind = "design" | "turnkey";
export type AssetClass = "villa" | "farmhouse" | "commercial" | "resort";
export type Facing = "E" | "W" | "N" | "S";
export type ProductPreference = "conventional" | "eco";
/** How the enquiry reached Poetry: typed in at the office, sent from the online form, or by phone. */
export type EnquiryCapture = "office" | "online" | "phone";
/** 0 qualified lead, 1 wants to meet, 2 engaged again, 3 terms under discussion. */
export type ProspectLevel = 0 | 1 | 2 | 3;

/** Every field of the paper Client Enquiry Form, plus family size, an optional DOB and the plot no. */
export type Enquiry = {
  /** Plot owner's name. */
  owner: string;
  /** Layout / community name, in full: "Hesaraghatta Green Farms". */
  layoutName: string;
  /** Plot locality: "Hesaraghatta". */
  locality: string;
  service: ServiceKind;
  assetClass: AssetClass;
  occupation: string;
  /** As written: "40 x 60 ft". */
  plotDimensions: string;
  /** Square feet. */
  plotArea: number;
  facing: Facing;
  /** Construction start date: "YYYY-MM-DD" (the first of the month when only a month is known), or "". */
  startBy: string;
  email: string;
  phone: string;
  /** No. of bedrooms required (the desired BHK). */
  bedrooms: number;
  carParks: number;
  product: ProductPreference;
  /** INR. */
  budget: number;
  referredBy: string;
  /** Date of enquiry, "YYYY-MM-DD". */
  enquiredOn: string;
  /** Added in the meeting: people who will live in the house. */
  familySize: number;
  /** Optional; not used for matching yet. */
  dob?: string;
  /** Not on the paper form; needed for the project code once they sign up. */
  plotNo?: string;
  /** Short layout code for the project code ("HGF"); the initials of `layoutName` when not given. */
  layoutCode?: string;
  capture: EnquiryCapture;
};

export type ProspectSeed = {
  id: string;
  enquiry: Enquiry;
  /** The BD person who holds the lead (the form's "Advisor"). */
  advisor: PersonId;
  registeredAt: string;
  /** Level moves after registering (level 0), oldest first. */
  levels: { level: ProspectLevel; at: string; note?: string }[];
  dropped?: { at: string; reason: string };
  converted?: { at: string; draftId: DraftId; projectId?: ProjectId; signUp: { amount: number; on: string; reference: string } };
};

const BASE: Pick<Enquiry, "capture" | "referredBy"> = { capture: "office", referredBy: "" };

export const seedProspects: ProspectSeed[] = [
  {
    id: "pr-01",
    advisor: "rohan",
    registeredAt: "2026-08-18T11:20",
    enquiry: {
      ...BASE,
      owner: "Aditi Kulkarni",
      layoutName: "Hesaraghatta Green Farms",
      layoutCode: "HGF",
      plotNo: "23",
      locality: "Hesaraghatta",
      service: "turnkey",
      assetClass: "villa",
      occupation: "Agronomist",
      plotDimensions: "60 x 80 ft",
      plotArea: 4800,
      facing: "E",
      startBy: "2027-01-01",
      email: "aditi.kulkarni@example.com",
      phone: "+91 98450 07788",
      bedrooms: 4,
      carParks: 2,
      product: "eco",
      budget: 7500000,
      referredBy: "Neil Fernandes",
      enquiredOn: "2026-08-18",
      familySize: 5,
    },
    levels: [
      { level: 1, at: "2026-08-25T16:00" },
      { level: 2, at: "2026-09-12T10:30", note: "Asked for a site visit at Hesaraghatta." },
      { level: 3, at: "2026-10-06T15:00", note: "Agreement draft shared." },
    ],
    converted: {
      at: "2026-11-08T16:00",
      draftId: "kulkarni",
      projectId: "kulkarni",
      signUp: { amount: 396480, on: "2026-11-08", reference: "UTR ...7781" },
    },
  },
  {
    id: "pr-02",
    advisor: "rohan",
    registeredAt: "2026-09-02T12:10",
    enquiry: {
      ...BASE,
      owner: "Karthik Shenoy",
      layoutName: "Whitefield Palms",
      locality: "Whitefield",
      service: "turnkey",
      assetClass: "villa",
      occupation: "Software architect",
      plotDimensions: "40 x 60 ft",
      plotArea: 2400,
      facing: "N",
      startBy: "2027-02-01",
      email: "karthik.shenoy@example.com",
      phone: "+91 99000 21345",
      bedrooms: 4,
      carParks: 2,
      product: "conventional",
      budget: 12000000,
      enquiredOn: "2026-09-02",
      familySize: 4,
    },
    levels: [
      { level: 1, at: "2026-09-05T18:00" },
      { level: 2, at: "2026-09-20T11:00", note: "Site visit with his father." },
      { level: 3, at: "2026-10-28T17:30", note: "Discussing the payment split." },
    ],
  },
  {
    id: "pr-03",
    advisor: "kavya",
    registeredAt: "2026-10-01T15:40",
    enquiry: {
      ...BASE,
      capture: "online",
      owner: "Farah Siddiqui",
      layoutName: "Yelahanka Vista",
      locality: "Yelahanka",
      service: "design",
      assetClass: "villa",
      occupation: "Paediatrician",
      plotDimensions: "30 x 50 ft",
      plotArea: 1500,
      facing: "W",
      startBy: "2027-04-01",
      email: "farah.siddiqui@example.com",
      phone: "+91 97400 55210",
      bedrooms: 3,
      carParks: 1,
      product: "eco",
      budget: 6500000,
      enquiredOn: "2026-10-01",
      familySize: 3,
    },
    levels: [
      { level: 1, at: "2026-10-04T12:00" },
      { level: 2, at: "2026-10-15T17:00", note: "Wants to see a finished eco home." },
    ],
  },
  {
    id: "pr-04",
    advisor: "rohan",
    registeredAt: "2026-10-20T10:15",
    enquiry: {
      ...BASE,
      capture: "phone",
      owner: "Venkatesh Rao",
      layoutName: "Devanahalli Orchards",
      locality: "Devanahalli",
      service: "turnkey",
      assetClass: "farmhouse",
      occupation: "Exporter",
      plotDimensions: "100 x 120 ft",
      plotArea: 12000,
      facing: "E",
      startBy: "2027-01-01",
      email: "venkatesh.rao@example.com",
      phone: "+91 98861 30442",
      bedrooms: 3,
      carParks: 3,
      product: "eco",
      budget: 9000000,
      referredBy: "Anil Nair",
      enquiredOn: "2026-10-20",
      familySize: 6,
    },
    levels: [{ level: 1, at: "2026-10-24T11:00" }],
  },
  {
    id: "pr-05",
    advisor: "rohan",
    registeredAt: "2026-11-09T19:05",
    enquiry: {
      ...BASE,
      capture: "online",
      owner: "Deepa Menon",
      layoutName: "Sarjapur Meadows",
      locality: "Sarjapur Road",
      service: "turnkey",
      assetClass: "villa",
      occupation: "Chartered accountant",
      plotDimensions: "40 x 60 ft",
      plotArea: 2400,
      facing: "N",
      startBy: "2027-03-01",
      email: "deepa.menon@example.com",
      phone: "+91 99459 81120",
      bedrooms: 3,
      carParks: 2,
      product: "conventional",
      budget: 8000000,
      enquiredOn: "2026-11-09",
      familySize: 4,
    },
    levels: [],
  },
  {
    id: "pr-06",
    advisor: "kavya",
    registeredAt: "2026-11-10T12:30",
    enquiry: {
      ...BASE,
      capture: "phone",
      owner: "Rahul Hegde",
      layoutName: "Hennur Gardens",
      locality: "Hennur",
      service: "design",
      assetClass: "villa",
      occupation: "Restaurateur",
      plotDimensions: "30 x 40 ft",
      plotArea: 1200,
      facing: "S",
      startBy: "",
      email: "rahul.hegde@example.com",
      phone: "+91 90080 64431",
      bedrooms: 3,
      carParks: 1,
      product: "conventional",
      budget: 5000000,
      enquiredOn: "2026-11-10",
      familySize: 4,
    },
    levels: [],
  },
  {
    id: "pr-07",
    advisor: "rohan",
    registeredAt: "2026-10-12T16:45",
    enquiry: {
      ...BASE,
      owner: "Sneha Pillai",
      layoutName: "Bannerghatta Woods",
      locality: "Bannerghatta Road",
      service: "turnkey",
      assetClass: "villa",
      occupation: "Surgeon",
      plotDimensions: "50 x 80 ft",
      plotArea: 4000,
      facing: "S",
      startBy: "2027-01-01",
      email: "sneha.pillai@example.com",
      phone: "+91 98451 77230",
      bedrooms: 5,
      carParks: 3,
      product: "conventional",
      budget: 21000000,
      referredBy: "Ryan D'Souza",
      enquiredOn: "2026-10-12",
      familySize: 7,
      dob: "1979-04-14",
    },
    levels: [
      { level: 1, at: "2026-10-18T11:30" },
      { level: 2, at: "2026-11-06T17:00", note: "Asked for a site visit on Saturday." },
    ],
  },
  {
    id: "pr-08",
    advisor: "kavya",
    registeredAt: "2026-07-10T11:00",
    enquiry: {
      ...BASE,
      owner: "Arvind Gowda",
      layoutName: "Kanakapura Greens",
      locality: "Kanakapura Road",
      service: "turnkey",
      assetClass: "villa",
      occupation: "Civil contractor",
      plotDimensions: "40 x 60 ft",
      plotArea: 2400,
      facing: "E",
      startBy: "2026-10-01",
      email: "arvind.gowda@example.com",
      phone: "+91 98860 44120",
      bedrooms: 4,
      carParks: 2,
      product: "conventional",
      budget: 7000000,
      enquiredOn: "2026-07-10",
      familySize: 5,
    },
    levels: [{ level: 1, at: "2026-07-20T15:00" }],
    dropped: { at: "2026-08-30T12:00", reason: "Building with a relative's contractor." },
  },
  {
    id: "pr-09",
    advisor: "kavya",
    registeredAt: "2026-09-15T14:20",
    enquiry: {
      ...BASE,
      owner: "Nikhil Jain",
      layoutName: "Thanisandra Enclave",
      locality: "Thanisandra",
      service: "design",
      assetClass: "commercial",
      occupation: "Retailer",
      plotDimensions: "50 x 80 ft",
      plotArea: 4000,
      facing: "W",
      startBy: "2027-02-01",
      email: "nikhil.jain@example.com",
      phone: "+91 99016 22874",
      bedrooms: 0,
      carParks: 6,
      product: "conventional",
      budget: 15000000,
      enquiredOn: "2026-09-15",
      familySize: 0,
    },
    levels: [
      { level: 1, at: "2026-09-18T12:00" },
      { level: 2, at: "2026-10-02T16:00" },
      { level: 3, at: "2026-11-03T11:00", note: "Comparing our design fee with one other studio." },
    ],
  },
  {
    id: "pr-10",
    advisor: "rohan",
    registeredAt: "2026-10-30T18:10",
    enquiry: {
      ...BASE,
      capture: "online",
      owner: "Meghana Rao",
      layoutName: "Nandi Foothills Farms",
      locality: "Chikkaballapur",
      service: "turnkey",
      assetClass: "resort",
      occupation: "Hotelier",
      plotDimensions: "2 acres",
      plotArea: 87120,
      facing: "N",
      startBy: "2027-06-01",
      email: "meghana.rao@example.com",
      phone: "+91 97399 40018",
      bedrooms: 12,
      carParks: 20,
      product: "eco",
      budget: 60000000,
      enquiredOn: "2026-10-30",
      familySize: 0,
    },
    levels: [{ level: 1, at: "2026-11-05T12:00" }],
  },
  {
    // Older than twelve months: it no longer holds the phone or email.
    id: "pr-11",
    advisor: "rohan",
    registeredAt: "2025-08-14T11:00",
    enquiry: {
      ...BASE,
      owner: "Suresh Babu",
      layoutName: "Jigani Heights",
      locality: "Jigani",
      service: "turnkey",
      assetClass: "villa",
      occupation: "Banker",
      plotDimensions: "30 x 40 ft",
      plotArea: 1200,
      facing: "E",
      startBy: "2025-12-01",
      email: "suresh.babu@example.com",
      phone: "+91 98440 13579",
      bedrooms: 2,
      carParks: 1,
      product: "conventional",
      budget: 4000000,
      enquiredOn: "2025-08-14",
      familySize: 3,
    },
    levels: [],
    dropped: { at: "2025-09-20T10:00", reason: "Postponed the build." },
  },
];

/**
 * The BD person who holds each client before the demo: the "Advisor" on their enquiry, who stays
 * their contact after sign-up. It is the seed's point of contact (`team.poc` in firm-data.ts), so
 * there is one BD person per client; live screens use `firm.advisorOf`, which reads the live team.
 */
export const projectAdvisors = Object.fromEntries(projects.map((p) => [p.id, p.team.poc])) as Record<ProjectId, PersonId>;

/** The first client's phone on each project, for the duplicate check. */
export const projectPhones: Record<ProjectId, string> = {
  iyer: "+91 98450 02211",
  "iyer-cottage": "+91 98450 02211",
  nair: "+91 98450 11234",
  dsouza: "+91 98450 22345",
  bhat: "+91 98450 33456",
  fernandes: "+91 98450 44567",
  sharma: "+91 98450 55678",
  kulkarni: "+91 98450 07788",
};

/** A lead or customer holds its phone and email for this many months. */
export const DUPLICATE_MONTHS = 12;
/** A prospect with no level change for this many days needs a follow-up. */
export const PROSPECT_IDLE_DAYS = 14;

// ---- Architect fees ----

/** Set by the admin. Hours bought and design changes are charged at the hourly rate, plus GST. */
export type FeeRule = {
  /** INR an hour, before GST. */
  ratePerHour: number;
  gstRate: number;
  /** A design change is charged at least this many hours. */
  minChangeHours: number;
};

export const SEED_FEE_RULE: FeeRule = { ratePerHour: 3500, gstRate: 0.18, minChangeHours: 2 };

export type ClientRequestType = "hours" | "design-change";

export type ClientRequestBody = {
  id: string;
  projectId: ProjectId;
  type: ClientRequestType;
  /** Hours asked for (type hours). */
  hours?: number;
  /** "4 more advisory hours", "Skylight over the staircase". */
  title: string;
  note?: string;
  /** The client who asked, when someone logs it for them: "Priya Nair". */
  askedBy?: string;
};

/** The fee worked out when the Project Head approves: hours x rate, plus GST. */
export type FeeQuote = { hours: number; rate: number; amount: number; gst: number; total: number };

// ---- Client feedback (NPS) ----

/** The NPS question, asked of the client after each milestone and at handover. */
export const NPS_QUESTION = "How likely are you to recommend Poetry Designs to a friend?";
/** `milestone` in an answer: 0 design approved, 1 to 10 construction milestones, 11 handover. */
export const NPS_DESIGN = 0;
export const NPS_HANDOVER = 11;

// ---- Events ----

export type DeskEventBody =
  // Prospects (BD; the reassignment is the admin's alone)
  | { kind: "prospect.registered"; prospect: { id: string; enquiry: Enquiry; advisor: PersonId } }
  | { kind: "prospect.edited"; prospectId: string; patch: Partial<Enquiry> }
  | { kind: "prospect.level-set"; prospectId: string; level: ProspectLevel; note?: string }
  | { kind: "prospect.dropped"; prospectId: string; reason: string }
  | { kind: "prospect.reassigned"; prospectId: string; from: PersonId; to: PersonId; reason: string }
  // A dropped lead back in discussion (its advisor, or the admin); a reassignment reopens it too.
  | { kind: "prospect.reopened"; prospectId: string; note?: string }
  | {
      kind: "prospect.converted";
      prospectId: string;
      draftId: DraftId;
      signUp: { amount: number; on: string; reference: string };
    }
  // Client requests for architect time, routed to the Project Head
  | { kind: "client-request.raised"; request: ClientRequestBody }
  | { kind: "client-request.approved"; projectId: ProjectId; requestId: string; fee: FeeQuote; note?: string }
  | { kind: "client-request.declined"; projectId: ProjectId; requestId: string; reason: string }
  | { kind: "client-request.escalated"; projectId: ProjectId; requestId: string; to: PersonId; reason: string }
  | { kind: "client-request.settled"; projectId: ProjectId; requestId: string; note: string; waived: boolean }
  // The fee that follows an approval
  | { kind: "fee.approved"; projectId: ProjectId; requestId: string }
  | { kind: "fee.declined"; projectId: ProjectId; requestId: string; reason?: string }
  | { kind: "fee.billed"; projectId: ProjectId; requestId: string; invoiceNo: string }
  | { kind: "fee.received"; projectId: ProjectId; requestId: string; reference: string; on: string }
  | { kind: "fee-rule.set"; ratePerHour: number; minChangeHours: number; reason?: string }
  // Client feedback
  | { kind: "nps.answered"; projectId: ProjectId; score: number; comment?: string; milestone: number }
  // Architects on a project
  | { kind: "project.architect-invited"; projectId: ProjectId; personId: PersonId; note?: string }
  | { kind: "project.architect-assigned"; projectId: ProjectId; personId: PersonId }
  | { kind: "project.architect-removed"; projectId: ProjectId; personId: PersonId; reason?: string }
  // Project pictures. A null dataUrl goes back to the drawing.
  | { kind: "project.thumbnail-set"; projectId: ProjectId; dataUrl: string | null };

export type DeskEventKind = DeskEventBody["kind"];

/** A seed fact in event form: the same derivation reads it and the tab's events. */
export type SeedDeskEvent = DeskEventBody & { id: string; at: string; by: PersonId };

/** Client requests, fees, feedback and invitations before the demo (the old "hours asked" included). */
export const seedDeskEvents: SeedDeskEvent[] = [
  // Priya Nair's 4 hours (was BD's "hours asked"): now with the Project Head.
  {
    id: "s-req-1",
    at: "2026-11-06T18:30",
    by: "kavya",
    kind: "client-request.raised",
    request: { id: "req-nair-1", projectId: "nair", type: "hours", hours: 4, title: "4 more advisory hours", note: "Kitchen and puja room finishes.", askedBy: "Priya Nair" },
  },
  // Meera: a skylight over the staircase.
  {
    id: "s-req-2",
    at: "2026-11-09T21:10",
    by: "meera",
    kind: "client-request.raised",
    request: { id: "req-iyer-1", projectId: "iyer", type: "design-change", title: "Skylight over the staircase", note: "Natural light on the landing." },
  },
  // D'Souza: study moved to the rear; approved, the client approved the fee, finance to bill.
  {
    id: "s-req-3",
    at: "2026-10-28T19:00",
    by: "rohan",
    kind: "client-request.raised",
    request: { id: "req-dsouza-1", projectId: "dsouza", type: "design-change", title: "Study to the rear of the ground floor", askedBy: "Leah D'Souza" },
  },
  {
    id: "s-req-4",
    at: "2026-10-30T11:30",
    by: "lakshmi",
    kind: "client-request.approved",
    projectId: "dsouza",
    requestId: "req-dsouza-1",
    fee: { hours: 6, rate: 3500, amount: 21000, gst: 3780, total: 24780 },
  },
  { id: "s-req-5", at: "2026-11-02T20:15", by: "rohan", kind: "fee.approved", projectId: "dsouza", requestId: "req-dsouza-1" },
  // Bhat: hours approved, the client disputes the fee; escalated to BD.
  {
    id: "s-req-6",
    at: "2026-10-20T17:00",
    by: "kavya",
    kind: "client-request.raised",
    request: { id: "req-bhat-1", projectId: "bhat", type: "hours", hours: 3, title: "3 more advisory hours", askedBy: "Sunil Bhat" },
  },
  {
    id: "s-req-7",
    at: "2026-10-21T10:00",
    by: "lakshmi",
    kind: "client-request.approved",
    projectId: "bhat",
    requestId: "req-bhat-1",
    fee: { hours: 3, rate: 3500, amount: 10500, gst: 1890, total: 12390 },
  },
  {
    id: "s-req-8",
    at: "2026-10-24T12:00",
    by: "lakshmi",
    kind: "client-request.escalated",
    projectId: "bhat",
    requestId: "req-bhat-1",
    to: "kavya",
    reason: "Wants the hours free after the slab delay.",
  },
  // Iyer Farm Cottage: a deeper verandah, billed and paid.
  {
    id: "s-req-9",
    at: "2026-10-10T20:30",
    by: "meera",
    kind: "client-request.raised",
    request: { id: "req-cottage-1", projectId: "iyer-cottage", type: "design-change", title: "Deeper verandah on the east side" },
  },
  {
    id: "s-req-10",
    at: "2026-10-12T10:15",
    by: "lakshmi",
    kind: "client-request.approved",
    projectId: "iyer-cottage",
    requestId: "req-cottage-1",
    fee: { hours: 4, rate: 3500, amount: 14000, gst: 2520, total: 16520 },
  },
  { id: "s-req-11", at: "2026-10-12T21:00", by: "meera", kind: "fee.approved", projectId: "iyer-cottage", requestId: "req-cottage-1" },
  {
    id: "s-req-12",
    at: "2026-10-14T11:00",
    by: "divya",
    kind: "fee.billed",
    projectId: "iyer-cottage",
    requestId: "req-cottage-1",
    invoiceNo: "PD/AF/2026-27/0001",
  },
  {
    id: "s-req-13",
    at: "2026-10-16T15:30",
    by: "divya",
    kind: "fee.received",
    projectId: "iyer-cottage",
    requestId: "req-cottage-1",
    reference: "UTR ...4410",
    on: "2026-10-16",
  },
  // Fernandes: 2 hours before handover, paid.
  {
    id: "s-req-14",
    at: "2026-06-02T18:00",
    by: "kavya",
    kind: "client-request.raised",
    request: { id: "req-fernandes-1", projectId: "fernandes", type: "hours", hours: 2, title: "2 more advisory hours", askedBy: "Neil Fernandes" },
  },
  {
    id: "s-req-15",
    at: "2026-06-03T09:30",
    by: "vikram",
    kind: "client-request.approved",
    projectId: "fernandes",
    requestId: "req-fernandes-1",
    fee: { hours: 2, rate: 3500, amount: 7000, gst: 1260, total: 8260 },
  },
  { id: "s-req-16", at: "2026-06-03T19:00", by: "kavya", kind: "fee.approved", projectId: "fernandes", requestId: "req-fernandes-1" },
  {
    id: "s-req-17",
    at: "2026-06-05T10:00",
    by: "divya",
    kind: "fee.billed",
    projectId: "fernandes",
    requestId: "req-fernandes-1",
    invoiceNo: "PD/AF/2025-26/0014",
  },
  {
    id: "s-req-18",
    at: "2026-06-08T12:00",
    by: "divya",
    kind: "fee.received",
    projectId: "fernandes",
    requestId: "req-fernandes-1",
    reference: "UTR ...2290",
    on: "2026-06-08",
  },
  // Sharma: Lakshmi invited Ananya to help with the concept plan.
  {
    id: "s-arch-1",
    at: "2026-11-08T12:00",
    by: "lakshmi",
    kind: "project.architect-invited",
    projectId: "sharma",
    personId: "ananya",
    note: "Concept plan for a cement block home.",
  },
  // Client feedback after milestones (and at handover).
  ...(
    [
      ["fernandes", 3, 8, "2025-11-25T20:00", undefined],
      ["fernandes", 6, 9, "2026-01-20T19:30", undefined],
      ["fernandes", 10, 9, "2026-06-15T18:00", undefined],
      ["fernandes", NPS_HANDOVER, 10, "2026-08-16T11:00", "Smooth handover. The keys came with a full set of drawings."],
      ["nair", 2, 9, "2026-05-08T21:00", undefined],
      ["nair", 4, 9, "2026-06-20T20:30", undefined],
      ["nair", 6, 7, "2026-08-02T19:15", "Replies were slow in July."],
      ["nair", 7, 8, "2026-09-06T18:40", undefined],
      ["bhat", 2, 8, "2026-08-20T20:00", undefined],
      ["bhat", 3, 6, "2026-09-16T21:10", "Extra steel was billed without asking us first."],
      ["bhat", 4, 5, "2026-10-03T19:45", "The granite cost was a surprise."],
      ["dsouza", NPS_DESIGN, 9, "2026-07-12T20:00", undefined],
      ["dsouza", 1, 7, "2026-10-20T21:30", "Good work, but we chase for updates."],
      ["iyer", NPS_DESIGN, 10, "2026-07-12T21:00", undefined],
      ["iyer", 1, 9, "2026-08-31T20:30", undefined],
      ["iyer", 2, 9, "2026-10-05T21:15", undefined],
      ["iyer", 3, 9, "2026-10-26T20:45", "Love the weekly photos."],
    ] as [ProjectId, number, number, string, string | undefined][]
  ).map(
    ([projectId, milestone, score, at, comment], i): SeedDeskEvent => ({
      id: `s-nps-${i + 1}`,
      at,
      // Iyer's answers are Meera's own; the others were logged by their BD person.
      by: projectId === "iyer" || projectId === "iyer-cottage" ? "meera" : projectAdvisors[projectId],
      kind: "nps.answered",
      projectId,
      milestone,
      score,
      comment,
    }),
  ),
];

/**
 * Client messages before the portal's thread (calls and WhatsApp, as logged) and who answered
 * them, for reply times. A null reply is still waiting.
 */
export type ContactSeed = { projectId: ProjectId; from: string; at: string; repliedBy: PersonId | null; repliedAt: string | null };

export const seedContacts: ContactSeed[] = [
  { projectId: "nair", from: "Priya Nair", at: "2026-10-14T19:20", repliedBy: "kavya", repliedAt: "2026-10-15T10:05" },
  { projectId: "nair", from: "Anil Nair", at: "2026-10-29T08:40", repliedBy: "vikram", repliedAt: "2026-10-29T13:10" },
  { projectId: "nair", from: "Priya Nair", at: "2026-11-08T21:15", repliedBy: "kavya", repliedAt: "2026-11-10T09:30" },
  { projectId: "bhat", from: "Sunil Bhat", at: "2026-10-02T18:00", repliedBy: "kavya", repliedAt: "2026-10-04T11:00" },
  { projectId: "bhat", from: "Kavitha Bhat", at: "2026-10-22T20:30", repliedBy: "lakshmi", repliedAt: "2026-10-23T09:45" },
  { projectId: "bhat", from: "Sunil Bhat", at: "2026-11-09T19:10", repliedBy: null, repliedAt: null },
  { projectId: "dsouza", from: "Leah D'Souza", at: "2026-10-25T20:00", repliedBy: "rohan", repliedAt: "2026-10-26T10:30" },
  { projectId: "dsouza", from: "Ryan D'Souza", at: "2026-11-05T18:45", repliedBy: "lakshmi", repliedAt: "2026-11-06T09:20" },
  { projectId: "iyer-cottage", from: "Meera Iyer", at: "2026-10-20T21:30", repliedBy: "rohan", repliedAt: "2026-10-21T09:00" },
  { projectId: "sharma", from: "Rakesh Sharma", at: "2026-11-08T17:00", repliedBy: "rohan", repliedAt: "2026-11-08T17:40" },
  { projectId: "fernandes", from: "Neil Fernandes", at: "2026-09-10T11:00", repliedBy: "kavya", repliedAt: "2026-09-10T15:00" },
  { projectId: "iyer", from: "Meera Iyer", at: "2026-09-14T22:00", repliedBy: "vikram", repliedAt: "2026-09-15T09:40" },
];

/** The appraisal period screens open on. */
export const APPRAISAL_PERIOD = { from: "2026-05-01", to: "2026-11-11", label: "May to Nov 2026" };
