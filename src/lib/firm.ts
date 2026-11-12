import { changes, TODAY, withGst } from "./demo-data";
import type { DemoState } from "./demo-store";
import {
  DIVYA_ACCESS_AT,
  EARLIER_BILLS,
  KULKARNI_CODE,
  LOW_HOURS,
  cottageEstimate,
  designSummaries,
  firmCatalogue,
  people as seedPeople,
  projects as seedProjects,
  registerNotes,
  seedAdditions,
  seedBills,
  seedCreditRequests,
  seedCredits,
  seedDrafts,
  seedPos,
  seedRequests,
  seedRevisions,
  seedTasks,
  seedTime,
  templates as seedTemplates,
  vendors as seedVendors,
  WEEK,
  type CatalogueEdit,
  type CatalogueItem,
  type CatalogueUnit,
  type CategoryId,
  type DeletedTarget,
  type CreditAddition,
  type Draft,
  type DraftId,
  type FirmEvent,
  type LogEntry,
  type MilestoneSeed,
  type MilestoneState,
  type Person,
  type PersonId,
  type PoSeed,
  type Pool,
  type Post,
  type ProjectId,
  type ProjectSeed,
  type Receipt,
  type RequestLine,
  type RequestSeed,
  type StaffRole,
  type TaskSeed,
  type Template,
  type TimeEntry,
  type Vendor,
} from "./firm-data";
import {
  datePart,
  dayCount,
  daysBetween,
  dueWords,
  formatShortDate,
  formatStampShort,
  formatTime,
  inr,
  inrSigned,
  listWords,
  percent,
} from "./format";
import {
  allReceipts,
  derive,
  letterShort,
  newestFirst,
  recordLog,
  scheduleChangeOf,
  threadPosts,
  type Projection,
  type ScheduleChange,
} from "./projection";

// The staff side's one pure derivation. Everything a register, a board or a ledger shows
// is worked out here from the seed in firm-data.ts and the events recorded in this tab.
// Iyer Residence's money comes from the client projection, so both sides always agree.

// The estimate arithmetic (4.5) is pure and kept in its own module; it is offered from here too.
export { estimate, estimateInputFor } from "./estimate";
export type { EstimateInput, EstimateResult, EstimateRow } from "./estimate";

const TODAY_ISO = TODAY;
/** Days after approval before a letter waiting for the bank counts as overdue. Sample threshold. */
export const OVERDUE_AFTER_DAYS = 21;
/** Days a client approval may wait before the admin is told. */
export const CLIENT_WAIT_DAYS = 7;
/** Days a request may go unseen before the admin is told. */
export const UNSEEN_DAYS = 2;

// ---- Types ----

export type StripCell = {
  n: number;
  /** "Sign-up", "3", "5a". */
  label: string;
  state: "to-come" | "under-way" | "built" | "raised" | "approved" | "part-paid" | "paid";
  split?: "a" | "b";
  /** A split of this milestone is waiting for the client. */
  pendingSplit?: boolean;
  /** "Milestone 3, raised, with Meera". */
  words: string;
};

export type MilestoneView = Omit<MilestoneSeed, "state"> & {
  state: MilestoneState;
  /** With GST. */
  total: number;
  /** With GST. */
  received: number;
  /** With GST: received from the bank and from the client. */
  bank: number;
  client: number;
  /** Set once a split is approved. */
  parts?: { label: string; amount: number; total: number }[];
  pendingSplit?: boolean;
};

export type ProjectView = Omit<ProjectSeed, "milestones"> & {
  milestones: MilestoneView[];
  contractValue: number;
  valueHistory: { label: string; amount: number; at: string }[];
  /** 11 cells, or 12 after a split. */
  strip: StripCell[];
  /** "Building, milestone 4". */
  stageWords: string;
  /** Before GST. */
  workDone: number;
  workDonePercent: number;
  /** Bills plus POs not yet billed, before GST. */
  costs: number;
  /** POs not yet billed, before GST. */
  committed: number;
  /** Bills, before GST. */
  spent: number;
  /** Receipts before GST plus hours bought. */
  received: number;
  /** Null until milestone 1's work is done. */
  margin: number | null;
  marginPercent: number | null;
  cash: number;
  /** "Milestone 3, ₹10,27,780, with Meera". */
  next: { n: number; words: string; amount?: number } | null;
  daysAtStage: number;
  /** The client as a turn word: "Meera" or "client". */
  clientWord: string;
};

export type StampView = {
  /** The action alone: "PO uploaded". Use stampLine() for the full words. */
  words: string;
  at: string;
  by: PersonId;
  carbon?: {
    to: PersonId[];
    /** Recipients who are not people in the portal, such as other projects' clients. */
    others?: string[];
    href: string;
    rowId: string;
  };
};

export type TurnItem = {
  /** Stable: "mr:MR-2026-0139", "pay:nair:6", "task:t3". */
  id: string;
  projectId?: ProjectId;
  title: string;
  sentence: string;
  /** "3 days", "Due today", "Overdue", "With Meera". */
  margin: string;
  /** "2 days" under a "With ..." margin. */
  marginSub?: string;
  /** Draw the peg glyph: the client still has to speak. */
  client?: boolean;
  overdue?: boolean;
  days: number;
  href: string;
  action?: { label: string; href?: string };
  /** A second way to answer the same row, such as "Send back" beside "Accept". */
  alt?: { label: string; href?: string };
  figure?: string;
  /** Status words from the vocabulary, written once: ["PO in part", "Late for site"]. */
  status?: string[];
  /** The person's own work: shown under any project scope. */
  personal?: boolean;
  stamps: StampView[];
};

export type PoView = PoSeed & {
  vendor: string;
  /** Before GST. */
  amount: number;
  gst: number;
  total: number;
  billed: boolean;
  lineWords: string[];
};

export type RequestStatus = "New" | "Seen" | "PO in part" | "PO uploaded" | "Delivered";

export type RequestView = RequestSeed & {
  projectName: string;
  /** Saved with no signal and not yet sent. */
  queued: boolean;
  sentAt: string;
  status: RequestStatus;
  late: boolean;
  outside: boolean;
  /** Ordered so far, by line id. */
  ordered: Record<string, number>;
  /** "350 kg still to order", or null when every line is ordered. */
  stillToOrder: string | null;
  pos: PoView[];
  /** Days in the current status. */
  days: number;
  procurement: PersonId[];
  /** "Cement, OPC 53 grade, 50 bags", one per line. */
  lineWords: string[];
};

export type LetterView = {
  letterNo: string;
  /** "0034". */
  short: string;
  projectId: ProjectId;
  projectName: string;
  n: number;
  milestoneName: string;
  raisedAt: string;
  raisedBy?: PersonId;
  acceptedAt?: string;
  approvedAt?: string;
  /** Before GST. */
  amount: number;
  /** With GST. */
  total: number;
  received: number;
  bank: number;
  client: number;
  state: "raised" | "approved" | "part-paid" | "paid";
  /** ["Part paid", "Overdue 18 days"]. */
  status: string[];
  overdueDays: number;
  /** Days with the client (raised) or since approval. */
  days: number;
  receipts: Receipt[];
};

/** Who struck a line out of the record, when, and why. */
export type DeletedMark = { at: string; by: PersonId; reason: string };

/**
 * A catalogue material as it stands after the admin's changes, struck ones kept: `subs`
 * holds its live sizes and `deletedSubs` the struck ones, so an old request still reads.
 */
export type CatalogueLine = CatalogueItem & {
  deleted?: DeletedMark;
  deletedSubs: { name: string; deleted: DeletedMark }[];
};

export type BillView = {
  id: string;
  projectId: ProjectId;
  n: number;
  vendorId?: string;
  vendor: string;
  poNo?: string;
  billNo: string;
  /** Before GST. */
  amount: number;
  gst: number;
  on: string;
  enteredBy?: PersonId;
  enteredAt?: string;
  label: string;
  earlier: boolean;
  /** Set once the admin deletes the bill: it leaves spent and costs, and its PO is unbilled again. */
  deleted?: DeletedMark;
};

export type RevisionView = {
  id: string;
  projectId: ProjectId;
  item: string;
  amount: number;
  days: number;
  specSheet: string;
  raisedAt: string;
  raisedBy: PersonId;
  status: "approved" | "with-client" | "changes-asked" | "declined";
  /** "Approved, Addendum 2", "With Meera", "Meera asked for changes". */
  statusWords: string;
  heldUntil?: string;
  changeId?: string;
  addendum?: string;
  lands: { n: number; amount: number }[];
  fromRequest?: string;
};

export type TaskView = TaskSeed & {
  personName: string;
  assignedByName: string;
  projectName: string;
  hoursLogged: number;
  /** "Due today", "Overdue", ... or null for standing tasks. */
  due: string | null;
  overdue: boolean;
  /** The words for the row: "Due today", "With Vikram", "Sent back", "Accepted". */
  statusWords: string;
};

export type CreditView = {
  projectId: ProjectId;
  before: Pool;
  during: Pool;
  current: "before" | "during";
  left: number;
  low: boolean;
  over: number;
  added: CreditAddition[];
};

export type CreditRequestView = {
  id: string;
  projectId: ProjectId;
  by: string;
  hours: number;
  at: string;
  days: number;
  open: boolean;
};

export type DraftView = Draft & {
  stepsDone: number;
  /** The next step to do, or null when all four are done. */
  nextStep: number | null;
  /** One sentence on what is missing. */
  missing: string;
  opened: boolean;
  openedAt?: string;
  projectId?: ProjectId;
};

export type ProjectSchedule = ScheduleChange & { projectId: ProjectId };

export type DesignView = {
  projectId: ProjectId;
  designId: string;
  title: string;
  version: number;
  status: "awaiting" | "approved" | "changes-requested";
  sentAt: string;
  by: string;
  /** Days with the client while awaiting. */
  days: number;
};

export type Firm = {
  people: Person[];
  projects: ProjectView[];
  requests: RequestView[];
  pos: PoView[];
  letters: LetterView[];
  bills: BillView[];
  revisions: RevisionView[];
  tasks: TaskView[];
  time: TimeEntry[];
  credits: CreditView[];
  creditRequests: CreditRequestView[];
  additions: CreditAddition[];
  posts: Post[];
  log: LogEntry[];
  drafts: DraftView[];
  /** Every vendor, deleted ones kept with `deleted` set: leave those out of any choice. */
  vendors: Vendor[];
  /** The catalogue to choose from: the admin's adds and renames in, deleted lines out. */
  catalogue: CatalogueItem[];
  /** The catalogue with deleted lines kept and marked, for the admin and for old requests. */
  catalogueAll: CatalogueLine[];
  /** The category templates after the admin's changes; a new project starts from these. */
  templates: Template[];
  /** "Your turn", ordered: overdue first, then by days waited, longest first. */
  turns: (person: PersonId, scope: ProjectId | "all") => TurnItem[];
  /** "Waiting on others". */
  waitingOn: (person: PersonId, scope: ProjectId | "all") => TurnItem[];
  /** Admin "Needs you". */
  exceptions: TurnItem[];
  /** Projects onboarded in a month, "2026-11". */
  onboardedIn: (month: string) => ProjectView[];
  // Also worked out here, so no screen counts for itself.
  receipts: Receipt[];
  designs: DesignView[];
  scheduleChanges: ProjectSchedule[];
  cottage: { estimate: "waiting" | "approved"; schedule: "waiting" | "approved"; approvedAt?: string };
  nextRequestNo: string;
  nextPoNo: string;
  nextLetterNo: string;
  nextRevisionNo: string;
  stampsFor: (id: string) => StampView[];
  hoursThisWeek: (person: PersonId) => number;
  person: (id: PersonId) => Person | undefined;
  project: (id: ProjectId) => ProjectView | undefined;
};

// ---- Small helpers ----

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Whole days from a date or timestamp to the demo's day. */
export function daysSince(at: string): number {
  return Math.max(0, daysBetween(datePart(at), TODAY_ISO));
}

/** "Today", "1 day", "3 days". */
export function ageWords(days: number): string {
  return days <= 0 ? "Today" : dayCount(days);
}

/** The full stamp: "PO uploaded. 11 Nov, 10:05 am. Prakash Hegde". */
export function stampLine(stamp: StampView, people: Person[] = seedPeople): string {
  const name = people.find((p) => p.id === stamp.by)?.name ?? stamp.by;
  return `${stamp.words}. ${formatStampShort(stamp.at)}. ${name}`;
}

/** The carbon line without its link: "Copy to Suresh Gowda, emailed 10:05 am." */
export function carbonLine(stamp: StampView, people: Person[] = seedPeople): string | null {
  if (!stamp.carbon) return null;
  const names = [
    ...stamp.carbon.to.map((id) => people.find((p) => p.id === id)?.name ?? id),
    ...(stamp.carbon.others ?? []),
  ];
  if (names.length === 0) return null;
  const when = formatTime(stamp.at) || formatShortDate(datePart(stamp.at));
  return `${names.length === 1 ? "Copy" : "Copies"} to ${listWords(names)}, emailed ${when}.`;
}

type Ev<K extends FirmEvent["kind"]> = Extract<FirmEvent, { kind: K }>;

// Which page a person reads a kind of row on, for "See it as".
function pageFor(person: PersonId, people: Person[], topic: "requests" | "money" | "costs" | "tasks" | "home"): string {
  const role = people.find((p) => p.id === person)?.role;
  if (role === "client") return topic === "money" ? "/client/payments" : "/client";
  if (role === "site") return topic === "requests" ? "/staff/site/requests" : topic === "tasks" ? "/staff/site/tasks" : "/staff/site";
  if (role === "finance") {
    if (topic === "requests") return "/staff/finance/requests";
    if (topic === "money") return "/staff/finance/money";
    if (topic === "costs") return "/staff/finance/costs";
    return "/staff/finance";
  }
  if (role === "architect") return topic === "tasks" ? "/staff/architect/tasks" : "/staff/architect";
  if (role === "bd") return "/staff/bd";
  return "/staff/admin";
}

function catalogueName(id: string, catalogue: CatalogueItem[]): string {
  return catalogue.find((item) => item.id === id)?.name ?? id;
}

/** "Cement, OPC 53 grade, 50 bags". */
export function lineWords(line: RequestLine, catalogue: CatalogueItem[] = firmCatalogue): string {
  return `${catalogueName(line.material, catalogue)}, ${line.sub}, ${line.qty.toLocaleString("en-IN")} ${line.unit}`;
}

function nextNumber(prefix: string, numbers: string[], width: number): string {
  const top = numbers.reduce((max, no) => {
    const n = Number(no.slice(prefix.length));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return `${prefix}${String(top + 1).padStart(width, "0")}`;
}

// ---- The admin's changes, read back ----
// The admin's writers give structured fields beside each sentence (`edit`, `target`,
// `template`, `patch.role`). Events recorded before they did are read from the sentences,
// whose words are fixed (see components/admin/admin-data.ts).

const ROLE_WORDS: Record<StaffRole, string> = {
  bd: "Business development",
  architect: "Architects",
  site: "Site engineers",
  finance: "Procurement and finance",
  admin: "Admin",
};

/** "Moved Ananya Rao from Architects to Site engineers." gives "site". */
function roleMovedTo(change: string): StaffRole | undefined {
  if (!change.startsWith("Moved ")) return undefined;
  return (Object.keys(ROLE_WORDS) as StaffRole[]).find((role) => change.endsWith(` to ${ROLE_WORDS[role]}.`));
}

const UNIT_WORDS: CatalogueUnit[] = ["bags", "kg", "cu ft", "nos", "sq ft", "lengths"];

function catalogueEditOf(change: string, itemNamed: (name: string) => CatalogueItem | undefined): CatalogueEdit | undefined {
  let m: RegExpExecArray | null;
  if ((m = /^Added the material '(.+)', counted in (.+), to the catalogue\.$/.exec(change))) {
    const unit = UNIT_WORDS.find((u) => u === m?.[2]) ?? "nos";
    return { op: "add-item", name: m[1], unit };
  }
  if ((m = /^Added '(.+)' to (.+) in the catalogue\.$/.exec(change))) {
    const item = itemNamed(m[2]);
    return item ? { op: "add-sub", itemId: item.id, sub: m[1] } : undefined;
  }
  if ((m = /^Renamed the material '(.+)' to '(.+)' in the catalogue\.$/.exec(change))) {
    const item = itemNamed(m[1]);
    return item ? { op: "rename-item", itemId: item.id, to: m[2] } : undefined;
  }
  if ((m = /^Renamed '(.+)' to '(.+)' under (.+) in the catalogue\.$/.exec(change))) {
    const item = itemNamed(m[3]);
    return item ? { op: "rename-sub", itemId: item.id, from: m[1], to: m[2] } : undefined;
  }
  return undefined;
}

function catalogueTargetOf(what: string, itemNamed: (name: string) => CatalogueItem | undefined): DeletedTarget | undefined {
  let m: RegExpExecArray | null;
  if ((m = /^the material '(.+)' from the catalogue$/.exec(what))) {
    const item = itemNamed(m[1]);
    return item ? { kind: "catalogue-item", itemId: item.id } : undefined;
  }
  if ((m = /^'(.+)' from (.+) in the catalogue$/.exec(what))) {
    const item = itemNamed(m[2]);
    return item ? { kind: "catalogue-sub", itemId: item.id, sub: m[1] } : undefined;
  }
  return undefined;
}

/** "Changed the Farmhouse template: rate from ₹2,400 to ₹2,500 per sq ft; milestone 3 from 15% to 14%." */
function applyTemplateWords(t: Template, change: string): void {
  const colon = change.indexOf(": ");
  if (colon < 0) return;
  const rupees = (text: string) => Number(text.replace(/[₹,]/g, ""));
  const body = change.slice(colon + 2).replace(/\.$/, "");
  for (const part of body.split("; ")) {
    let m: RegExpExecArray | null;
    const row = (n: string) => t.milestones.find((x) => x.n === Number(n));
    if ((m = /^rate from (₹[\d,]+) to (₹[\d,]+) per sq ft$/.exec(part))) t.ratePerSqFt = rupees(m[2]);
    else if ((m = /^milestone (\d+) from (\d+)% to (\d+)%$/.exec(part))) {
      const r = row(m[1]);
      if (r) r.percent = Number(m[3]);
    } else if ((m = /^milestone (\d+) named '(.*)'$/.exec(part))) {
      const r = row(m[1]);
      if (r) r.name = m[2];
    } else if ((m = /^milestone (\d+) covers '(.*)'$/.exec(part))) {
      const r = row(m[1]);
      if (r) r.covers = m[2];
    }
  }
}

function copyTemplate(t: Template): Template {
  return { ...t, milestones: t.milestones.map((m) => ({ ...m })), partB: t.partB.map((b) => ({ ...b })) };
}

// ---- The derivation ----

export function deriveFirm(state: DemoState, given?: Projection): Firm {
  const events: FirmEvent[] = state.events ?? [];
  const projection = given ?? derive(state);
  const of = <K extends FirmEvent["kind"]>(kind: K) => events.filter((e): e is Ev<K> => e.kind === kind);

  // People, with anyone added and every change the admin made.
  const people: Person[] = seedPeople.map((p) => ({ ...p, access: [...p.access], teams: [...p.teams] }));
  for (const e of events) {
    if (e.kind === "person.added") people.push({ ...e.person });
    else if (e.kind === "person.changed") {
      const p = people.find((x) => x.id === e.person);
      if (!p) continue;
      if (e.patch) Object.assign(p, e.patch);
      const moved = e.patch?.role ? undefined : roleMovedTo(e.change);
      if (moved) p.role = moved;
    } else if (e.kind === "access.given") {
      const p = people.find((x) => x.id === e.personId);
      if (p && !p.access.includes(e.access)) p.access.push(e.access);
    } else if (e.kind === "member.added") {
      const p = people.find((x) => x.id === e.personId);
      if (p && !p.teams.includes(e.team)) p.teams.push(e.team);
    }
  }
  const nameOf = (id: PersonId) => people.find((p) => p.id === id)?.name ?? id;
  const firstOf = (id: PersonId) => people.find((p) => p.id === id)?.first ?? id;

  // Vendors, with any the admin deleted kept and marked. Their rates move with each PO below.
  const vendors: Vendor[] = [...seedVendors, ...of("vendor.added").map((e) => e.vendor)].map((v) => ({
    ...v,
    rates: v.rates.map((r) => ({ ...r })),
  }));
  for (const e of of("record.deleted")) {
    const target = e.target;
    const id = target?.kind === "vendor" ? target.vendorId : vendors.find((v) => e.what === `vendor '${v.name}'`)?.id;
    const vendor = vendors.find((v) => v.id === id);
    if (vendor && !vendor.deleted) vendor.deleted = { at: e.at, by: e.by, reason: e.reason };
  }
  const vendorName = (id?: string) => vendors.find((v) => v.id === id)?.name ?? "";

  // The category templates as the admin left them. A project opened here starts from these.
  const liveTemplates: Template[] = seedTemplates.map(copyTemplate);
  for (const e of of("template.changed")) {
    const i = liveTemplates.findIndex((t) => t.id === e.templateId);
    if (i < 0) continue;
    if (e.template) liveTemplates[i] = copyTemplate({ ...e.template, id: e.templateId });
    else applyTemplateWords(liveTemplates[i], e.change);
  }
  const templateOf = (id: CategoryId) => liveTemplates.find((t) => t.id === id) ?? liveTemplates[0];

  // Drafts, with the steps saved here and whether the workspace was opened.
  const drafts: DraftView[] = seedDrafts.map((seed) => {
    const draft: Draft = { ...seed };
    for (const e of of("draft.saved")) {
      if (e.draftId !== seed.id) continue;
      if (!draft.startedAt) draft.startedAt = e.at;
      const key = `step${e.step}` as "step1" | "step2" | "step3" | "step4";
      (draft as Record<string, unknown>)[key] = { ...((draft[key] as object | undefined) ?? {}), ...e.data };
    }
    const opened = of("workspace.opened").find((e) => e.draftId === seed.id);
    const done = [draft.step1, draft.step2, draft.step3?.agreementFile ? draft.step3 : undefined, draft.step4?.head ? draft.step4 : undefined];
    const stepsDone = done.filter(Boolean).length;
    const nextIndex = done.findIndex((step) => !step);
    const missing =
      nextIndex === 0
        ? "The client and site are not entered."
        : nextIndex === 1
          ? "The category and estimate are not entered."
          : nextIndex === 2
            ? "The signed agreement is not uploaded."
            : nextIndex === 3
              ? "The team and hours are not set."
              : "Ready to open.";
    return {
      ...draft,
      stepsDone,
      nextStep: nextIndex < 0 ? null : nextIndex + 1,
      missing,
      opened: !!opened,
      openedAt: opened?.at,
      projectId: opened?.projectId,
    };
  });

  // Project seeds with this tab's openings, team changes and the cottage's addendum.
  const estimateApproved = of("estimate.approved")[0];
  const cottageScheduleApproved = of("cottage-schedule.approved")[0];
  const seeds: ProjectSeed[] = seedProjects.map((seed) => {
    const p: ProjectSeed = {
      ...seed,
      team: {
        ...seed.team,
        architects: [...seed.team.architects],
        engineers: [...seed.team.engineers],
        procurement: [...seed.team.procurement],
      },
      milestones: seed.milestones.map((m) => ({ ...m })),
      revisions: [...seed.revisions],
    };
    if (p.id === "kulkarni") {
      const draft = drafts.find((d) => d.id === "kulkarni");
      const opened = of("workspace.opened").find((e) => e.projectId === "kulkarni");
      if (opened && draft) {
        const value = (draft.step2?.area ?? p.builtUpArea) * (draft.step2?.rate ?? p.ratePerSqFt);
        const template = templateOf(draft.step2?.category ?? p.category);
        p.code = KULKARNI_CODE;
        p.phase = "invited";
        p.onboardedOn = opened.at;
        p.invitedAt = opened.at;
        p.signedOn = draft.step3?.signedOn ?? datePart(opened.at);
        p.originalValue = value;
        p.builtUpArea = draft.step2?.area ?? p.builtUpArea;
        p.ratePerSqFt = draft.step2?.rate ?? p.ratePerSqFt;
        p.handoff = p.handoff || "Opened in this demo.";
        if (draft.step4?.head) p.team.head = draft.step4.head;
        if (draft.step4?.poc) p.team.poc = draft.step4.poc;
        if (draft.step4?.architects) p.team.architects = [...draft.step4.architects];
        if (draft.step4?.engineers) p.team.engineers = [...draft.step4.engineers];
        if (draft.step4?.procurement) p.team.procurement = [...draft.step4.procurement];
        p.milestones = [
          { n: 0, name: "Sign-up", covers: "Advance on signing the agreement, so design work can begin.", percent: 5 },
          ...template.milestones,
        ].map((row) => ({ ...row, amount: Math.round((value * row.percent) / 100), state: "to-come" as const }));
      }
    }
    if (p.id === "iyer-cottage" && estimateApproved) {
      p.revisions.push({
        id: "cottage-addendum-1",
        label: "Addendum 1, final estimate",
        amount: cottageEstimate.amount - p.originalValue,
        days: 0,
        approvedAt: estimateApproved.at,
      });
      p.builtUpArea = cottageEstimate.partA.area;
      p.milestones = p.milestones.map((m) => ({ ...m, amount: cottageEstimate.schedule[m.n] ?? m.amount }));
    }
    for (const e of of("head.changed")) if (e.projectId === p.id) p.team.head = e.to;
    for (const e of of("member.added")) {
      if (!e.sites.includes(p.id)) continue;
      const list =
        e.team === "Studio" ? p.team.architects : e.team === "Site" ? p.team.engineers : p.team.procurement;
      if (!list.includes(e.personId)) list.push(e.personId);
    }
    for (const e of of("milestone.revised")) {
      if (e.projectId !== p.id) continue;
      const m = p.milestones.find((x) => x.n === e.n);
      if (m) m.expected = e.to;
    }
    return p;
  });
  const seedOf = (id: ProjectId) => seeds.find((p) => p.id === id);
  const projectName = (id: ProjectId) => seedOf(id)?.name ?? id;
  const clientWord = (id: ProjectId) => (id === "iyer" || id === "iyer-cottage" ? "Meera" : "client");
  const procurementFor = (id: ProjectId): PersonId[] => (id === "nair" ? ["imran"] : ["prakash"]);

  // The catalogue as the admin left it. A deleted line drops out of every choice but still
  // names the old requests that used it.
  const catalogueAll: CatalogueLine[] = firmCatalogue.map((item) => ({ ...item, subs: [...item.subs], deletedSubs: [] }));
  const itemNamed = (name: string) => catalogueAll.find((item) => item.name === name && !item.deleted);
  const itemById = (id: string) => catalogueAll.find((item) => item.id === id);
  for (const e of events) {
    if (e.kind === "catalogue.changed") {
      const edit = e.edit ?? catalogueEditOf(e.change, itemNamed);
      if (!edit) continue;
      if (edit.op === "add-item") {
        if (!itemNamed(edit.name)) catalogueAll.push({ id: `added-${e.id}`, name: edit.name, unit: edit.unit, subs: [], deletedSubs: [] });
        continue;
      }
      const item = itemById(edit.itemId);
      if (!item) continue;
      if (edit.op === "add-sub") {
        if (!item.subs.includes(edit.sub)) item.subs.push(edit.sub);
      } else if (edit.op === "rename-item") item.name = edit.to;
      else {
        const i = item.subs.indexOf(edit.from);
        if (i >= 0) item.subs[i] = edit.to;
        if (item.usual === edit.from) item.usual = edit.to;
      }
    } else if (e.kind === "record.deleted") {
      const target = e.target ?? catalogueTargetOf(e.what, itemNamed);
      const mark = { at: e.at, by: e.by, reason: e.reason };
      if (target?.kind === "catalogue-item") {
        const item = itemById(target.itemId);
        if (item && !item.deleted) item.deleted = mark;
      } else if (target?.kind === "catalogue-sub") {
        const item = itemById(target.itemId);
        const i = item ? item.subs.indexOf(target.sub) : -1;
        if (!item || i < 0) continue;
        item.subs.splice(i, 1);
        item.deletedSubs.push({ name: target.sub, deleted: mark });
        if (item.usual === target.sub) item.usual = undefined;
      }
    }
  }
  const catalogue: CatalogueItem[] = catalogueAll
    .filter((item) => !item.deleted)
    .map((item) => ({ id: item.id, name: item.name, unit: item.unit, subs: [...item.subs], usual: item.usual }));

  // Requests and orders.
  const rawRequests: (RequestSeed & { queued: boolean; sentAt: string })[] = [
    ...seedRequests.map((r) => ({ ...r, queued: false, sentAt: r.at })),
    ...of("request.raised").map((e) => ({
      no: e.no,
      projectId: e.projectId,
      n: e.n,
      by: e.by,
      at: e.at,
      neededBy: e.neededBy,
      lines: e.lines,
      queued: !!e.queued,
      sentAt: e.queued ? "" : e.at,
    })),
  ];
  for (const e of events) {
    const r = "no" in e ? rawRequests.find((x) => x.no === e.no) : undefined;
    if (!r) continue;
    if (e.kind === "request.sent") {
      r.queued = false;
      r.sentAt = e.at;
    } else if (e.kind === "request.seen" && !r.seenAt) {
      r.seenAt = e.at;
      r.seenBy = e.by;
    } else if (e.kind === "request.delivered" && !r.deliveredAt) {
      r.deliveredAt = e.at;
      r.deliveredBy = e.by;
    }
  }

  // A linked PO sets its vendor's last rate for each material and size it bought.
  for (const e of of("po.linked")) {
    const vendor = vendors.find((v) => v.id === e.po.vendorId);
    const request = rawRequests.find((r) => r.no === e.po.requestNo);
    if (!vendor || !request) continue;
    for (const l of e.po.lines) {
      const line = request.lines.find((x) => x.id === l.lineId);
      if (!line) continue;
      const i = vendor.rates.findIndex((r) => r.material === line.material && r.sub === line.sub);
      const rate = { material: line.material, sub: line.sub, rate: l.rate, unit: i >= 0 ? vendor.rates[i].unit : line.unit, on: datePart(e.po.at) };
      if (i >= 0) vendor.rates[i] = rate;
      else vendor.rates.push(rate);
    }
  }

  const bills: BillView[] = [];
  for (const p of seeds) {
    for (const [n, amount] of Object.entries(p.billsBefore)) {
      if (!amount) continue;
      bills.push({
        id: `b-${p.id}-${n}`,
        projectId: p.id,
        n: Number(n),
        vendor: "Several vendors",
        billNo: "Earlier bills",
        amount,
        gst: Math.round(amount * 0.18),
        on: "2026-10-31",
        label: EARLIER_BILLS,
        earlier: true,
      });
    }
  }
  for (const b of seedBills) {
    bills.push({ ...b, vendor: b.vendorName ?? vendorName(b.vendorId), earlier: false });
  }
  for (const e of of("bill.entered")) {
    bills.push({
      id: `b-${e.id}`,
      projectId: e.projectId,
      n: e.n,
      vendorId: e.vendorId,
      vendor: vendorName(e.vendorId),
      poNo: e.poNo,
      billNo: e.billNo,
      amount: e.amount,
      gst: e.gst,
      on: e.on,
      enteredBy: e.by,
      enteredAt: e.at,
      label: `${e.billNo}, ${vendorName(e.vendorId)}`,
      earlier: false,
    });
  }

  // A bill the admin deleted stays as a struck line and leaves the figures.
  for (const e of of("record.deleted")) {
    const target = e.target;
    const bill =
      target?.kind === "bill"
        ? bills.find((b) => b.id === target.billId)
        : bills.find(
            (b) =>
              !b.earlier &&
              e.what === `bill ${b.billNo} from ${b.vendor} on ${projectName(b.projectId)}, ${inr(b.amount)} before GST`,
          );
    if (bill && !bill.earlier && !bill.deleted) bill.deleted = { at: e.at, by: e.by, reason: e.reason };
  }
  const liveBills = bills.filter((b) => !b.deleted);

  const deliveredOn = (requestNo: string) => rawRequests.find((r) => r.no === requestNo)?.deliveredAt;
  const pos: PoView[] = [...seedPos, ...of("po.linked").map((e) => e.po)].map((po) => {
    const amount = sum(po.lines.map((l) => l.qty * l.rate));
    const gst = Math.round(sum(po.lines.map((l) => (l.qty * l.rate * l.gstPercent) / 100)));
    const request = rawRequests.find((r) => r.no === po.requestNo);
    // A PO whose only bill was deleted is unbilled again.
    const billed =
      liveBills.some((b) => b.poNo === po.no) || (!!po.billNo && !bills.some((b) => b.poNo === po.no && b.deleted));
    const isSeed = seedPos.some((s) => s.no === po.no);
    // A live order's bill comes with the goods.
    const billIn = po.billIn ?? (!isSeed ? deliveredOn(po.requestNo) : undefined);
    return {
      ...po,
      billIn,
      vendor: vendorName(po.vendorId),
      amount,
      gst,
      total: amount + gst,
      billed,
      lineWords: po.lines.map((l) => {
        const line = request?.lines.find((x) => x.id === l.lineId);
        return line
          ? `${catalogueName(line.material, catalogueAll)}, ${line.sub}, ${l.qty.toLocaleString("en-IN")} ${line.unit} at ${inr(l.rate)}`
          : `${l.qty} at ${inr(l.rate)}`;
      }),
    };
  });

  const requests: RequestView[] = rawRequests.map((r) => {
    const mine = pos.filter((po) => po.requestNo === r.no);
    const ordered: Record<string, number> = {};
    for (const line of r.lines) ordered[line.id] = sum(mine.flatMap((po) => po.lines.filter((l) => l.lineId === line.id).map((l) => l.qty)));
    const short = r.lines.filter((line) => ordered[line.id] < line.qty);
    const status: RequestStatus = r.deliveredAt
      ? "Delivered"
      : mine.length > 0 && short.length === 0
        ? "PO uploaded"
        : mine.length > 0
          ? "PO in part"
          : r.seenAt
            ? "Seen"
            : "New";
    const lastPo = mine[mine.length - 1];
    const since =
      status === "Delivered"
        ? r.deliveredAt ?? r.at
        : status === "PO uploaded"
          ? lastPo?.at ?? r.at
          : status === "Seen"
            ? r.seenAt ?? r.at
            : r.sentAt || r.at;
    return {
      ...r,
      projectName: projectName(r.projectId),
      status,
      late: !r.deliveredAt && daysBetween(r.neededBy, TODAY_ISO) > 0,
      outside: r.lines.some((line) => line.outsideEstimate),
      ordered,
      stillToOrder:
        mine.length > 0 && short.length > 0
          ? `${listWords(short.map((line) => `${(line.qty - ordered[line.id]).toLocaleString("en-IN")} ${line.unit}`))} still to order`
          : null,
      pos: mine,
      days: daysSince(since),
      procurement: procurementFor(r.projectId),
      lineWords: r.lines.map((line) => lineWords(line, catalogueAll)),
    };
  });

  // Money in.
  const receipts = allReceipts(events);
  const additions: CreditAddition[] = [...seedAdditions, ...of("credits.added").map((e) => e.addition)];

  // Milestones, live: amounts, receipts and the state each one has reached.
  // Iyer's waiting milestone follows the client projection, which reads `paymentApproved`.
  const iyerWaiting = (projectId: ProjectId, n: number) =>
    projectId === "iyer" && projection.milestones.find((m) => m.id === n)?.status === "awaiting-approval";
  const approvedHere = (projectId: ProjectId, n: number) =>
    iyerWaiting(projectId, n)
      ? state.paymentApproved
      : of("payment.approved").some((e) => e.projectId === projectId && e.n === n);
  const scheduleChanges: ProjectSchedule[] = [];

  const projectViews: ProjectView[] = seeds.map((p) => {
    const amountOf = (n: number) =>
      p.id === "iyer"
        ? projection.milestones.find((m) => m.id === n)?.agreedAmount ?? 0
        : p.milestones.find((m) => m.n === n)?.amount ?? 0;
    const split = p.milestones.length > 0 ? scheduleChangeOf(p.id, events, amountOf) : null;
    if (split) scheduleChanges.push({ ...split, projectId: p.id });

    const milestones: MilestoneView[] = [];
    for (const seed of p.milestones) {
      const amount = amountOf(seed.n);
      const total = withGst(amount).total;
      const mine = receipts.filter((r) => r.projectId === p.id && r.n === seed.n);
      const received = sum(mine.map((r) => r.amount));
      const bank = sum(mine.filter((r) => r.source === "bank").map((r) => r.amount));
      const done = of("stage.done").find((e) => e.projectId === p.id && e.n === seed.n);
      const raised = of("payment.raised").find((e) => e.projectId === p.id && e.n === seed.n);
      const accepted = of("stage.accepted").find((e) => e.projectId === p.id && e.n === seed.n);
      const approved = of("payment.approved").find((e) => e.projectId === p.id && e.n === seed.n);
      const wasRaised = ["raised", "approved", "part-paid", "paid"].includes(seed.state) || !!raised;
      const wasApproved = ["approved", "part-paid", "paid"].includes(seed.state) || approvedHere(p.id, seed.n);
      const wasDone = !["under-way", "to-come"].includes(seed.state) || !!done;
      const previous = milestones[milestones.length - 1];
      let state: MilestoneState = seed.state;
      if (wasRaised) state = received >= total ? "paid" : received > 0 ? "part-paid" : wasApproved ? "approved" : "raised";
      else if (wasDone) state = "done";
      else if (seed.state === "to-come" && previous && p.phase === "building" && of("stage.done").some((e) => e.projectId === p.id && e.n === previous.n))
        state = "under-way";
      const startedOn =
        seed.startedOn ??
        (state === "under-way" && previous ? of("stage.done").find((e) => e.projectId === p.id && e.n === previous.n)?.at : undefined);
      const view: MilestoneView = {
        ...seed,
        amount,
        state,
        total,
        received,
        bank,
        client: received - bank,
        doneOn: seed.doneOn ?? done?.at,
        doneBy: seed.doneBy ?? done?.by,
        acceptedAt:
          seed.acceptedAt ?? accepted?.at ?? (p.id === "iyer" ? projection.milestones.find((m) => m.id === seed.n)?.acceptedAt : undefined),
        raisedAt: seed.raisedAt ?? raised?.at,
        raisedBy: seed.raisedBy ?? raised?.by,
        approvedAt:
          seed.approvedAt ??
          (p.id === "iyer" ? projection.milestones.find((m) => m.id === seed.n)?.approvedAt : approved?.at),
        letterNo: seed.letterNo ?? raised?.letterNo,
        paidOn: seed.paidOn ?? (state === "paid" && mine.length > 0 ? mine[mine.length - 1].on : undefined),
        startedOn,
        photos: seed.photos ?? done?.photos,
      };
      if (split && split.n === seed.n) {
        if (split.status === "approved") {
          view.parts = split.amounts.map((a, i) => ({
            label: `${seed.n}${i === 0 ? "a" : "b"}`,
            amount: a,
            total: split.totals[i],
          }));
        } else if (split.status === "waiting") view.pendingSplit = true;
      }
      milestones.push(view);
    }

    const contractValue =
      p.id === "iyer" ? projection.agreedValue : p.originalValue + sum(p.revisions.map((r) => r.amount));
    const valueHistory = [
      { label: "Signed", amount: p.originalValue, at: p.signedOn ?? "" },
      ...p.revisions.map((r) => ({ label: r.label, amount: r.amount, at: r.approvedAt })),
    ];
    if (p.id === "iyer") {
      for (const change of projection.changes) {
        const original = changes.find((c) => c.id === change.id);
        if (change.status !== "approved" || original?.status !== "pending") continue;
        valueHistory.push({
          label: `${change.addendum}, ${lowerFirst(change.title)}`,
          amount: change.cost,
          at: state.changeDecisions[change.id]?.at ?? change.decidedOn ?? "",
        });
      }
    }

    const builtStates: MilestoneState[] = ["done", "raised", "approved", "part-paid", "paid"];
    const workDone = sum(milestones.filter((m) => builtStates.includes(m.state)).map((m) => m.amount));
    const myBills = liveBills.filter((b) => b.projectId === p.id);
    const spent = sum(myBills.map((b) => b.amount));
    const committed = sum(pos.filter((po) => po.projectId === p.id && !po.billed).map((po) => po.amount));
    const costs = spent + committed;
    const receivedBefore =
      sum(
        receipts
          .filter((r) => r.projectId === p.id)
          .map((r) => {
            const m = milestones.find((x) => x.n === r.n);
            return m && m.total > 0 ? Math.round((r.amount * m.amount) / m.total) : 0;
          }),
      ) + sum(additions.filter((a) => a.projectId === p.id).map((a) => a.amount));
    const building = milestones.find((m) => m.n === 1);
    const marginShown = !!building && builtStates.includes(building.state);
    const margin = marginShown ? workDone - costs : null;

    const strip: StripCell[] = [];
    for (const m of milestones) {
      const cellState: StripCell["state"] = m.state === "done" ? "built" : m.state;
      const words = (label: string) =>
        `${label}, ${
          {
            "to-come": m.expected ? `expected ${m.expected}` : "to come",
            "under-way": "under way",
            built: "built, payment not raised",
            raised: `raised, with ${clientWord(p.id)}`,
            approved: "approved, waiting for the bank",
            "part-paid": "part paid",
            paid: "paid",
          }[cellState]
        }`;
      if (m.parts) {
        m.parts.forEach((part, i) =>
          strip.push({
            n: m.n,
            label: part.label,
            state: cellState,
            split: i === 0 ? "a" : "b",
            words: words(`Milestone ${part.label}`),
          }),
        );
      } else {
        strip.push({
          n: m.n,
          label: m.n === 0 ? "Sign-up" : String(m.n),
          state: cellState,
          pendingSplit: m.pendingSplit || undefined,
          words: words(m.n === 0 ? "Sign-up" : `Milestone ${m.n}`),
        });
      }
    }

    const underWay = milestones.find((m) => m.state === "under-way");
    const stageWords =
      p.phase === "draft"
        ? "Draft"
        : p.phase === "invited"
          ? p.clientSignedInOn
            ? "In design"
            : "Invited, not signed in yet"
          : p.phase === "in-design"
            ? "In design"
            : p.phase === "handed-over"
              ? "Handed over"
              : `Building, milestone ${underWay?.n ?? milestones.filter((m) => builtStates.includes(m.state)).length}`;
    const daysAtStage = daysSince(
      p.phase === "building" ? underWay?.startedOn ?? p.signedOn ?? TODAY_ISO : p.invitedAt ?? p.onboardedOn ?? TODAY_ISO,
    );

    const openMoney = milestones.find((m) => m.state === "raised" || m.state === "approved" || m.state === "part-paid");
    let next: ProjectView["next"] = null;
    if (openMoney) {
      const overdue = openMoney.approvedAt ? daysSince(openMoney.approvedAt) - OVERDUE_AFTER_DAYS : 0;
      const tail =
        openMoney.state === "raised"
          ? `with ${clientWord(p.id)}`
          : openMoney.state === "part-paid"
            ? `part paid, ${inr(openMoney.total - openMoney.received)} to come${overdue > 0 ? `, overdue ${dayCount(overdue)}` : ""}`
            : overdue > 0
              ? `with the bank, overdue ${dayCount(overdue)}`
              : "with the bank";
      next = { n: openMoney.n, words: `Milestone ${openMoney.n}, ${inr(openMoney.total)}, ${tail}`, amount: openMoney.total };
    } else if (underWay) {
      next = {
        n: underWay.n,
        words: `Milestone ${underWay.n}, under way${underWay.expected ? `, expected ${underWay.expected}` : ""}`,
      };
    }

    return {
      ...p,
      milestones,
      contractValue,
      valueHistory,
      strip,
      stageWords,
      workDone,
      workDonePercent: contractValue > 0 ? Math.round((workDone / contractValue) * 100) : 0,
      costs,
      committed,
      spent,
      received: receivedBefore,
      margin,
      marginPercent: margin === null || workDone === 0 ? null : Math.round((margin / workDone) * 100),
      cash: receivedBefore - spent,
      next,
      daysAtStage,
      clientWord: clientWord(p.id),
    };
  });
  const projectOf = (id: ProjectId) => projectViews.find((p) => p.id === id);

  // Letters: every raised milestone with a demand letter.
  const letters: LetterView[] = [];
  for (const p of projectViews) {
    for (const m of p.milestones) {
      if (!m.letterNo || !["raised", "approved", "part-paid", "paid"].includes(m.state)) continue;
      const overdueDays =
        m.state === "approved" || m.state === "part-paid"
          ? Math.max(0, (m.approvedAt ? daysSince(m.approvedAt) : 0) - OVERDUE_AFTER_DAYS)
          : 0;
      const status: string[] =
        m.state === "raised"
          ? ["Raised"]
          : m.state === "paid"
            ? ["Paid"]
            : m.state === "part-paid"
              ? overdueDays > 0
                ? ["Part paid", `Overdue ${dayCount(overdueDays)}`]
                : ["Part paid"]
              : overdueDays > 0
                ? [`Overdue ${dayCount(overdueDays)}`]
                : ["Approved, waiting for the bank"];
      letters.push({
        letterNo: m.letterNo,
        short: letterShort(m.letterNo),
        projectId: p.id,
        projectName: p.name,
        n: m.n,
        milestoneName: m.name,
        raisedAt: m.raisedAt ?? "",
        raisedBy: m.raisedBy,
        acceptedAt: m.acceptedAt,
        approvedAt: m.approvedAt,
        amount: m.amount,
        total: m.total,
        received: m.received,
        bank: m.bank,
        client: m.client,
        state: m.state as LetterView["state"],
        status,
        overdueDays,
        days: daysSince(m.state === "raised" ? m.raisedAt ?? TODAY_ISO : m.approvedAt ?? m.raisedAt ?? TODAY_ISO),
        receipts: receipts.filter((r) => r.projectId === p.id && r.n === m.n),
      });
    }
  }

  // Cost revisions: the seed, the client's decisions on Iyer's, and any raised here.
  const revisions: RevisionView[] = seedRevisions.map((r) => {
    const change = projection.changes.find((c) => c.id === r.changeId);
    const status: RevisionView["status"] =
      change?.status === "approved"
        ? "approved"
        : change?.status === "changes-asked"
          ? "changes-asked"
          : change?.status === "declined"
            ? "declined"
            : "with-client";
    return {
      ...r,
      status,
      addendum: change?.addendum,
      statusWords:
        status === "approved"
          ? `Approved${change?.addendum ? `, ${change.addendum}` : ""}`
          : status === "changes-asked"
            ? "Meera asked for changes"
            : status === "declined"
              ? "Declined"
              : "With Meera",
    };
  });
  const firstLiveRevision = Number(nextNumber("CR-2026-", seedRevisions.map((r) => r.id), 3).slice(-3));
  const revisionIdOf = new Map<string, string>();
  of("revision.raised").forEach((e, i) => {
    const id = `CR-2026-${String(firstLiveRevision + i).padStart(3, "0")}`;
    revisionIdOf.set(e.id, id);
    revisions.push({
      id,
      projectId: e.projectId,
      item: e.item,
      amount: e.amount,
      days: e.days,
      specSheet: e.specSheet,
      raisedAt: e.at,
      raisedBy: e.by,
      status: "with-client",
      statusWords: `With ${clientWord(e.projectId)}`,
      heldUntil: e.heldUntil,
      lands: e.lands,
      fromRequest: e.fromRequest,
    });
  });

  // Tasks, with this tab's assignments, hand-ins and hours.
  const time: TimeEntry[] = [...seedTime, ...of("time.logged").map((e) => e.entry)];
  const rawTasks: TaskSeed[] = [...seedTasks, ...of("task.assigned").map((e) => e.task)].map((t) => ({ ...t }));
  for (const e of events) {
    if (e.kind !== "task.submitted" && e.kind !== "task.accepted" && e.kind !== "task.sent-back") continue;
    const t = rawTasks.find((x) => x.id === e.taskId);
    if (!t) continue;
    if (e.kind === "task.submitted") {
      t.status = "submitted";
      t.submittedAt = e.at;
    } else if (e.kind === "task.accepted") {
      t.status = "accepted";
      t.acceptedAt = e.at;
    } else {
      t.status = "revision";
      t.note = e.note ?? t.note;
    }
  }
  const tasks: TaskView[] = rawTasks.map((t) => {
    const open = t.status === "planned" || t.status === "in-progress" || t.status === "revision";
    const due = t.dueAt ? dueWords(t.dueAt) : null;
    const overdue = open && due === "Overdue";
    // Consultation time is logged by anyone on the team; other tasks by their owner.
    const logged = time.filter((x) => x.taskId === t.id && (t.kind === "consultation" || x.person === t.person));
    return {
      ...t,
      personName: nameOf(t.person),
      assignedByName: nameOf(t.assignedBy),
      projectName: projectName(t.projectId),
      hoursLogged: logged.length > 0 ? sum(logged.map((x) => x.hours)) : t.loggedHours,
      due,
      overdue,
      statusWords:
        t.status === "submitted"
          ? `With ${firstOf(t.assignedBy)}`
          : t.status === "accepted"
            ? "Accepted"
            : t.status === "revision"
              ? overdue
                ? "Overdue"
                : "Sent back"
              : due ?? "In progress",
    };
  });

  // Advisory hours per project. Iyer's are the client's own figures.
  const credits: CreditView[] = seedCredits.map((seed) => {
    if (seed.projectId === "iyer") {
      const c = projection.credits;
      return {
        projectId: "iyer",
        before: c.before,
        during: c.during,
        current: "during",
        left: c.left,
        low: c.low,
        over: c.over,
        added: c.added,
      };
    }
    const before = { ...seed.before };
    const during = { ...seed.during };
    const added: CreditAddition[] = [];
    for (const addition of seedAdditions) {
      if (addition.projectId !== seed.projectId) continue;
      added.push(addition);
      (addition.pool === "before" ? before : during).granted += addition.hours;
    }
    for (const e of events) {
      if (e.kind === "credits.added" && e.addition.projectId === seed.projectId) {
        added.push(e.addition);
        (e.addition.pool === "before" ? before : during).granted += e.addition.hours;
      } else if (e.kind === "credits.edited" && e.projectId === seed.projectId) {
        (e.pool === "before" ? before : during).granted = e.to;
      } else if (e.kind === "time.logged" && e.entry.consultation && e.entry.projectId === seed.projectId) {
        (seed.constructionStarted ? during : before).used += e.entry.hours;
      }
    }
    const pool = seed.constructionStarted ? during : before;
    const left = pool.granted - pool.used;
    // A handed-over project's hours are closed, so they are never low.
    const closed = seedOf(seed.projectId)?.phase === "handed-over";
    return {
      projectId: seed.projectId,
      before,
      during,
      current: seed.constructionStarted ? "during" : "before",
      left,
      low: !closed && left <= LOW_HOURS,
      over: Math.max(0, pool.used - pool.granted),
      added,
    };
  });

  const creditRequests: CreditRequestView[] = [
    ...seedCreditRequests,
    ...of("credits.requested").map((e) => ({
      id: `hours:${e.id}`,
      projectId: e.projectId,
      by: nameOf(e.by),
      hours: e.hours,
      at: e.at,
    })),
    ...(state.creditsRequested && !of("credits.requested").some((e) => e.projectId === "iyer")
      ? [{ id: "hours:iyer-asked", projectId: "iyer" as ProjectId, by: "Meera Iyer", hours: 5, at: `${TODAY_ISO}T09:00` }]
      : []),
  ].map((r) => ({
    ...r,
    days: daysSince(r.at),
    open: !additions.some((a) => a.projectId === r.projectId && a.at >= r.at),
  }));

  // Designs with the client, on every project.
  const designViews: DesignView[] = [
    ...projection.designs.map((d) => ({
      projectId: "iyer" as ProjectId,
      designId: d.design.id,
      title: d.design.title,
      version: d.latest.version,
      status: d.status,
      sentAt: d.latest.uploadedOn,
      by: d.latest.uploadedBy,
      days: d.status === "awaiting" ? daysSince(d.latest.uploadedOn) : 0,
    })),
    ...designSummaries.map((d) => {
      const upload = [...of("design.uploaded")].reverse().find((e) => e.projectId === d.projectId && e.designId === d.designId);
      const sentAt = upload?.at ?? d.sentAt;
      return {
        projectId: d.projectId,
        designId: d.designId,
        title: d.title,
        version: upload?.version ?? d.version,
        status: d.status,
        sentAt,
        by: nameOf(upload?.by ?? d.by),
        days: d.status === "awaiting" ? daysSince(sentAt) : 0,
      };
    }),
  ];

  const posts = threadPosts(events);
  const log = recordLog(events);

  // ---- Stamps: each thing's history, newest first ----

  const stamps = new Map<string, StampView[]>();
  const stamp = (key: string, view: StampView) => {
    const list = stamps.get(key) ?? [];
    list.push(view);
    stamps.set(key, list);
  };
  const projectTeam = (id: ProjectId): PersonId[] => {
    const p = seedOf(id);
    if (!p) return [];
    return [...new Set<PersonId>([p.team.poc, p.team.head, ...p.team.architects, ...p.team.engineers, ...p.team.procurement])];
  };
  const clientsOf = (id: ProjectId): { to: PersonId[]; others: string[] } =>
    id === "iyer" || id === "iyer-cottage" ? { to: ["meera"], others: [] } : { to: [], others: seedOf(id)?.clients ?? [] };

  for (const r of requests) {
    const key = `mr:${r.no}`;
    const procurement = procurementFor(r.projectId);
    const raisedEvent = of("request.raised").find((e) => e.no === r.no);
    if (raisedEvent?.queued) stamp(key, { words: "Saved with no signal", at: r.at, by: r.by });
    else
      stamp(key, {
        words: "Sent",
        at: r.at,
        by: r.by,
        carbon: { to: procurement, href: pageFor(procurement[0], people, "requests"), rowId: key },
      });
    const sent = of("request.sent").find((e) => e.no === r.no);
    if (sent)
      stamp(key, {
        words: "Sent",
        at: sent.at,
        by: sent.by,
        carbon: { to: procurement, href: pageFor(procurement[0], people, "requests"), rowId: key },
      });
    if (r.seenAt && r.seenBy) stamp(key, { words: "Seen", at: r.seenAt, by: r.seenBy });
    // A PO after which some line is still short is a PO in part; the one that completes
    // every line is the PO uploaded.
    const orderedSoFar: Record<string, number> = {};
    for (const po of [...r.pos].sort((a, b) => a.at.localeCompare(b.at))) {
      for (const l of po.lines) orderedSoFar[l.lineId] = (orderedSoFar[l.lineId] ?? 0) + l.qty;
      const complete = r.lines.every((line) => (orderedSoFar[line.id] ?? 0) >= line.qty);
      stamp(key, {
        words: complete ? "PO uploaded" : "PO uploaded in part",
        at: po.at,
        by: po.by,
        carbon: { to: [r.by], href: pageFor(r.by, people, "requests"), rowId: key },
      });
    }
    if (r.deliveredAt && r.deliveredBy) stamp(key, { words: "Delivered", at: r.deliveredAt, by: r.deliveredBy });
  }

  for (const p of projectViews) {
    for (const m of p.milestones) {
      const key = `pay:${p.id}:${m.n}`;
      if (m.doneOn && m.doneBy && m.n > 0)
        stamp(key, {
          words: "Stage done",
          at: m.doneOn,
          by: m.doneBy,
          carbon: { to: [p.team.head], href: pageFor(p.team.head, people, "home"), rowId: key },
        });
      if (m.raisedAt && m.raisedBy) {
        const client = clientsOf(p.id);
        stamp(key, {
          words: "Payment raised",
          at: m.raisedAt,
          by: m.raisedBy,
          carbon: {
            to: [...client.to, "divya"],
            others: client.others,
            href: client.to.length > 0 ? "/client/payments" : pageFor("divya", people, "money"),
            rowId: key,
          },
        });
      }
      // Only Meera's own acts carry her name; other clients act outside the demo.
      if (p.id === "iyer" && m.acceptedAt)
        stamp(key, {
          words: "Stage accepted",
          at: m.acceptedAt,
          by: "meera",
          carbon: { to: [p.team.head, "divya"], href: pageFor(p.team.head, people, "home"), rowId: key },
        });
      if (p.id === "iyer" && m.approvedAt)
        stamp(key, {
          words: "Approved",
          at: m.approvedAt,
          by: "meera",
          carbon: { to: ["divya", p.team.head], href: pageFor("divya", people, "money"), rowId: key },
        });
      let running = 0;
      for (const r of receipts.filter((x) => x.projectId === p.id && x.n === m.n)) {
        running += r.amount;
        if (r.reference === "Earlier payment") continue;
        const client = clientsOf(p.id);
        stamp(key, {
          words: `${running >= m.total ? "Paid" : "Part paid"}, ${inr(r.amount)} from the ${r.source === "bank" ? "bank" : "client"}`,
          // A receipt's own date has no time; the moment it was recorded does.
          at: of("receipt.recorded").find((e) => e.receipt.id === r.id)?.at ?? r.on,
          by: r.by,
          // The client and the Project Head are told money came in, on every project.
          carbon: {
            to: [...client.to, p.team.head],
            others: client.others,
            href: client.to.length > 0 ? "/client/payments" : pageFor(p.team.head, people, "home"),
            rowId: key,
          },
        });
      }
    }
  }

  for (const t of tasks) {
    const key = `task:${t.id}`;
    const assigned = of("task.assigned").find((e) => e.task.id === t.id);
    if (t.kind === "work")
      stamp(key, {
        words: "Assigned",
        at: assigned?.at ?? t.assignedOn,
        by: t.assignedBy,
        carbon: assigned ? { to: [t.person], href: pageFor(t.person, people, "tasks"), rowId: key } : undefined,
      });
    if (t.submittedAt && !events.some((e) => e.kind === "task.submitted" && e.taskId === t.id))
      stamp(key, { words: "Submitted", at: t.submittedAt, by: t.person });
    if (t.acceptedAt && !events.some((e) => e.kind === "task.accepted" && e.taskId === t.id))
      stamp(key, { words: "Accepted", at: t.acceptedAt, by: t.assignedBy });
  }
  for (const e of events) {
    if (e.kind === "task.submitted" || e.kind === "task.accepted" || e.kind === "task.sent-back") {
      const t = tasks.find((x) => x.id === e.taskId);
      if (!t) continue;
      const to = e.kind === "task.submitted" ? t.assignedBy : t.person;
      stamp(`task:${t.id}`, {
        words: e.kind === "task.submitted" ? "Submitted" : e.kind === "task.accepted" ? "Accepted" : "Sent back",
        at: e.at,
        by: e.by,
        // A hand-in lands in the reviewer's own register; a decision on the owner's task list.
        carbon: { to: [to], href: pageFor(to, people, e.kind === "task.submitted" ? "home" : "tasks"), rowId: `task:${t.id}` },
      });
    } else if (e.kind === "bill.entered" && e.poNo) {
      stamp(`bill:${e.poNo}`, { words: "Bill entered", at: e.at, by: e.by });
    } else if (e.kind === "revision.raised") {
      const client = clientsOf(e.projectId);
      const rowId = `rev:${revisionIdOf.get(e.id) ?? e.id}`;
      const team = projectTeam(e.projectId).filter((id) => id !== e.by);
      const view: StampView = {
        words: "Cost revision raised",
        at: e.at,
        by: e.by,
        carbon: {
          // The person whose page the copy opens on comes first: the client, else Prakash.
          to: [...client.to, ...team.filter((id) => id === "prakash"), ...team.filter((id) => id !== "prakash")],
          others: client.others,
          href: client.to.length > 0 ? "/client/changes" : pageFor("prakash", people, "home"),
          rowId,
        },
      };
      stamp(rowId, view);
      if (e.fromRequest) stamp(`flag:${e.fromRequest}`, view);
    } else if (e.kind === "schedule.proposed") {
      const view: StampView = {
        words: "Split proposed",
        at: e.at,
        by: e.by,
        carbon: e.projectId === "iyer" ? { to: ["meera"], href: "/client/payments", rowId: `sched:iyer:${e.n}` } : undefined,
      };
      stamp(`sched:${e.projectId}:${e.n}`, view);
      const note = registerNotes.find((x) => x.projectId === e.projectId && x.n === e.n);
      if (note) stamp(note.id, view);
    } else if (e.kind === "schedule.decided") {
      const head = seedOf(e.projectId)?.team.head ?? "vikram";
      stamp(`sched:${e.projectId}:${e.n}`, {
        words: e.status === "approved" ? "Split approved" : "Changes asked",
        at: e.at,
        by: e.by,
        carbon: { to: [head, "divya"], href: pageFor(head, people, "home"), rowId: `sched:${e.projectId}:${e.n}` },
      });
    } else if (e.kind === "draft.saved") {
      stamp(`draft:${e.draftId}`, { words: `Step ${e.step} saved`, at: e.at, by: e.by });
    } else if (e.kind === "workspace.opened") {
      const client = clientsOf(e.projectId);
      const head = seedOf(e.projectId)?.team.head;
      stamp(`draft:${e.draftId}`, {
        words: "Workspace opened and invite sent",
        at: e.at,
        by: e.by,
        // The admin is copied too, so "See it as Shalini" opens the new project on her board.
        carbon: {
          to: [...new Set<PersonId>([...client.to, ...(head ? [head] : []), "shalini"])],
          others: client.others,
          href: "/staff/admin",
          rowId: `invite:${e.projectId}`,
        },
      });
    } else if (e.kind === "invite.resent") {
      const client = clientsOf(e.projectId);
      stamp(`invite:${e.projectId}`, {
        words: "Invite sent again",
        at: e.at,
        by: e.by,
        carbon: { to: client.to, others: client.others, href: "/staff/bd", rowId: `invite:${e.projectId}` },
      });
    } else if (e.kind === "credits.requested") {
      stamp(`hours:${e.id}`, {
        words: "Asked for more hours",
        at: e.at,
        by: e.by,
        carbon: { to: ["rohan", "shalini"], href: "/staff/bd/hours", rowId: `hours:${e.id}` },
      });
    } else if (e.kind === "credits.added") {
      const client = clientsOf(e.addition.projectId);
      const request = creditRequests.find((r) => r.projectId === e.addition.projectId && r.at <= e.at);
      const view: StampView = {
        words: `${e.addition.hours} hours added`,
        at: e.at,
        by: e.by,
        carbon: {
          to: [...client.to, "divya"],
          others: client.others,
          href: client.to.length > 0 ? "/client/hours" : pageFor("divya", people, "money"),
          rowId: request?.id ?? `hours:${e.addition.projectId}`,
        },
      };
      if (request) stamp(request.id, view);
    } else if (e.kind === "design.uploaded") {
      const client = clientsOf(e.projectId);
      stamp(`design:${e.projectId}:${e.designId}`, {
        words: `Version ${e.version} uploaded`,
        at: e.at,
        by: e.by,
        carbon: {
          to: client.to,
          others: client.others,
          href: client.to.length > 0 ? "/client/designs" : "/staff/architect/designs",
          rowId: `design:${e.projectId}:${e.designId}`,
        },
      });
    } else if (e.kind === "design.decided") {
      const head = seedOf(e.projectId)?.team.head ?? "vikram";
      const design = projection.designs.find((d) => d.design.id === e.designId);
      const uploader = people.find((p) => p.name === design?.latest.uploadedBy)?.id;
      const to = [...new Set<PersonId>([...(uploader ? [uploader] : []), head])];
      stamp(`design:${e.projectId}:${e.designId}`, {
        words: e.status === "approved" ? "Approved" : "Changes asked",
        at: e.at,
        by: e.by,
        carbon: { to, href: pageFor(to[0], people, "home"), rowId: `design:${e.projectId}:${e.designId}` },
      });
    } else if (e.kind === "change.decided") {
      const revision = seedRevisions.find((r) => r.changeId === e.changeId);
      if (!revision) continue;
      const to: PersonId[] = ["vikram", "prakash", "divya", "shalini"];
      stamp(`rev:${revision.id}`, {
        words: e.status === "approved" ? "Approved" : e.status === "changes-asked" ? "Changes asked" : "Declined",
        at: e.at,
        by: e.by,
        carbon: { to, href: pageFor("vikram", people, "home"), rowId: `rev:${revision.id}` },
      });
    }
  }
  for (const r of seedRevisions) {
    if (r.raisedAt.length > 10) stamp(`rev:${r.id}`, { words: "Cost revision raised", at: r.raisedAt, by: r.raisedBy });
  }
  for (const p of projectViews) {
    if (p.invitedAt && p.phase === "invited" && !p.clientSignedInOn && !of("workspace.opened").some((e) => e.projectId === p.id))
      stamp(`invite:${p.id}`, { words: "Invite sent", at: p.invitedAt, by: p.onboardedBy });
  }
  for (const [, list] of stamps) list.splice(0, list.length, ...newestFirst(list));
  const stampsFor = (id: string) => stamps.get(id) ?? [];

  // ---- Registers ----

  const personOf = (id: PersonId) => people.find((p) => p.id === id);
  const inScope = (item: TurnItem, scope: ProjectId | "all") =>
    item.personal || scope === "all" || item.projectId === scope;
  const order = (items: TurnItem[]) =>
    items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => Number(!!b.item.overdue) - Number(!!a.item.overdue) || b.item.days - a.item.days || a.index - b.index)
      .map(({ item }) => item);
  const withStamps = (item: Omit<TurnItem, "stamps">): TurnItem => ({ ...item, stamps: stampsFor(item.id) });
  // A row's own stamp gives the time and the name, so its sentence leaves them out.
  const stamped = (id: string, words: string) => stampsFor(id).some((s) => s.words === words);
  const projectLink = (id: ProjectId) => `/staff/projects/${id}`;

  function taskRow(t: TaskView): TurnItem {
    return withStamps({
      id: `task:${t.id}`,
      projectId: t.projectId,
      title: t.title,
      sentence:
        t.status === "revision"
          ? `${t.projectName}. ${firstOf(t.assignedBy)} sent it back. ${t.note ?? ""}`.trim()
          : `${t.projectName}. ${t.deliverable}.`,
      margin: t.due ?? "Today",
      overdue: t.overdue,
      days: t.dueAt ? Math.max(0, -daysBetween(TODAY_ISO, datePart(t.dueAt))) : 0,
      href: pageFor(t.person, people, "tasks"),
      action: { label: t.status === "planned" ? "Start" : "Log time" },
      status: t.status === "revision" ? ["Sent back"] : undefined,
      personal: true,
    });
  }

  function requestRow(r: RequestView, forProcurement: boolean): TurnItem {
    const raiser = personOf(r.by);
    const status: string[] = [r.status === "Seen" && forProcurement ? "Seen, waiting on a PO" : r.status];
    if (r.late) status.push("Late for site");
    return withStamps({
      id: `mr:${r.no}`,
      projectId: r.projectId,
      title: `${r.no}, ${r.lineWords[0]}${r.lines.length > 1 ? ` and ${r.lines.length - 1} more` : ""}`,
      sentence: forProcurement
        ? `${r.projectName}, milestone ${r.n}. ${raiser?.name ?? r.by}, ${raiser?.phone ?? ""}. Needed by ${formatShortDate(r.neededBy)}.${
            r.stillToOrder ? ` ${r.stillToOrder.charAt(0).toUpperCase()}${r.stillToOrder.slice(1)}.` : ""
          }`
        : `${r.projectName}, milestone ${r.n}. Needed by ${formatShortDate(r.neededBy)}.${
            r.stillToOrder ? ` ${r.stillToOrder.charAt(0).toUpperCase()}${r.stillToOrder.slice(1)}.` : ""
          }`,
      margin: ageWords(r.days),
      overdue: r.late,
      days: r.days,
      href: forProcurement ? `/staff/finance/requests/${r.no}` : `/staff/site/requests/${r.no}`,
      action: forProcurement
        ? { label: r.status === "New" ? "Mark seen" : "Link a PO", href: `/staff/finance/requests/${r.no}` }
        : { label: "Mark delivered" },
      status,
    });
  }

  function letterRow(l: LetterView): TurnItem {
    return withStamps({
      id: `pay:${l.projectId}:${l.n}`,
      projectId: l.projectId,
      title: `${l.projectName}, letter ${l.short}`,
      sentence: `Milestone ${l.n}, approved ${l.approvedAt ? formatShortDate(datePart(l.approvedAt)) : ""}.${
        l.received > 0 ? ` ${inr(l.total - l.received)} still to come.` : ""
      }`,
      margin: l.overdueDays > 0 ? "Overdue" : ageWords(l.days),
      overdue: l.overdueDays > 0,
      days: l.days,
      href: "/staff/finance/money",
      action: { label: "Record money in", href: "/staff/finance/money" },
      figure: inr(l.total),
      status: l.status,
    });
  }

  function buildTurns(person: PersonId): TurnItem[] {
    const me = personOf(person);
    if (!me) return [];
    const items: TurnItem[] = [];

    // Own open tasks due by tomorrow, and hand-ins waiting for this person's review.
    for (const t of tasks) {
      if (t.kind !== "work") continue;
      const open = t.status === "planned" || t.status === "in-progress" || t.status === "revision";
      if (t.person === person && open && t.dueAt && daysBetween(TODAY_ISO, datePart(t.dueAt)) <= 1) items.push(taskRow(t));
      if (t.assignedBy === person && t.status === "submitted") {
        const days = daysSince(t.submittedAt ?? TODAY_ISO);
        items.push(
          withStamps({
            id: `task:${t.id}`,
            projectId: t.projectId,
            title: `Review ${firstOf(t.person)}'s ${t.short ?? lowerFirst(t.title)}`,
            sentence:
              stamped(`task:${t.id}`, "Submitted") || !t.submittedAt
                ? `${t.projectName}.`
                : `${t.projectName}. Submitted ${formatStampShort(t.submittedAt)}.`,
            margin: ageWords(days),
            days,
            href: pageFor(person, people, "tasks"),
            action: { label: "Accept" },
            alt: { label: "Send back" },
            personal: true,
          }),
        );
      }
    }

    if (me.role === "site") {
      for (const p of projectViews) {
        // The senior engineer on a site marks its stages done.
        if (p.team.engineers[0] !== person) continue;
        for (const m of p.milestones) {
          if (m.state !== "under-way" || !m.siteNote || of("stage.done").some((e) => e.projectId === p.id && e.n === m.n)) continue;
          items.push(
            withStamps({
              id: `stage:${p.id}:${m.n}`,
              projectId: p.id,
              title: `${p.name}, ${lowerFirst(m.name)}`,
              sentence: `${m.siteNote.charAt(0).toUpperCase()}${m.siteNote.slice(1)}. Mark the stage done.`,
              margin: ageWords(daysSince(m.siteNoteOn ?? m.startedOn ?? TODAY_ISO)),
              days: daysSince(m.siteNoteOn ?? m.startedOn ?? TODAY_ISO),
              href: `/staff/site/stage?project=${p.id}`,
              action: { label: "Mark stage done", href: `/staff/site/stage?project=${p.id}` },
              personal: true,
            }),
          );
        }
      }
      for (const r of requests) if (r.by === person && r.status === "PO uploaded") items.push(requestRow(r, false));
    }

    if (me.role === "architect") {
      for (const p of projectViews) {
        if (p.team.head !== person) continue;
        // Lines flagged as outside the estimate wait for a cost revision.
        for (const r of requests) {
          if (r.projectId !== p.id || r.queued || !r.outside) continue;
          if (of("revision.raised").some((e) => e.fromRequest === r.no)) continue;
          const line = r.lines.find((l) => l.outsideEstimate);
          if (!line) continue;
          const days = daysSince(r.at);
          items.push(
            withStamps({
              id: `flag:${r.no}`,
              projectId: p.id,
              title: `Raise a cost revision for the ${lowerFirst(line.sub)} ${catalogueName(line.material, catalogueAll).toLowerCase()} on ${p.name}${
                line.note ? `, ${line.note}` : ""
              }`,
              sentence: `${firstOf(r.by)} flagged them on ${formatShortDate(datePart(r.at))} in ${r.no}. They are not in the agreed estimate.`,
              margin: ageWords(days),
              days,
              href: `/staff/projects/${p.id}/programme#revision`,
              action: { label: "Raise cost revision", href: `/staff/projects/${p.id}/programme#revision` },
            }),
          );
        }
        // Stages marked done wait for their payment to be raised.
        for (const m of p.milestones) {
          if (m.state !== "done") continue;
          const days = daysSince(m.doneOn ?? TODAY_ISO);
          items.push(
            withStamps({
              id: `pay:${p.id}:${m.n}`,
              projectId: p.id,
              title: `Raise the payment for ${p.name} milestone ${m.n}`,
              sentence: stamped(`pay:${p.id}:${m.n}`, "Stage done")
                ? `${m.name.charAt(0).toUpperCase()}${m.name.slice(1)}.`
                : `${m.doneBy ? firstOf(m.doneBy) : "The site"} marked the ${lowerFirst(m.name)} done on ${formatShortDate(
                    datePart(m.doneOn ?? TODAY_ISO),
                  )}.`,
              margin: ageWords(days),
              days,
              href: `/staff/projects/${p.id}/programme`,
              action: { label: "Raise payment", href: `/staff/projects/${p.id}/programme` },
              figure: inr(m.total),
            }),
          );
        }
        // A cost revision or split sent back by the client.
        for (const r of revisions) {
          if (r.projectId !== p.id || r.status !== "changes-asked") continue;
          items.push(
            withStamps({
              id: `rev:${r.id}`,
              projectId: p.id,
              title: `${p.clientWord === "Meera" ? "Meera" : "The client"} asked for changes to ${lowerFirst(r.item)}`,
              sentence: `${r.id}. Revise the price or the specification and raise it again.`,
              margin: "Today",
              days: 0,
              href: `/staff/projects/${p.id}/programme#revision`,
              action: { label: "Revise", href: `/staff/projects/${p.id}/programme#revision` },
            }),
          );
        }
        const split = scheduleChanges.find((s) => s.projectId === p.id && s.status === "changes-asked");
        if (split)
          items.push(
            withStamps({
              id: `sched:${p.id}:${split.n}`,
              projectId: p.id,
              title: `${p.clientWord === "Meera" ? "Meera" : "The client"} asked for changes to the split of milestone ${split.n}`,
              sentence: split.comment ?? "Look again at the two parts.",
              margin: "Today",
              days: 0,
              href: `/staff/projects/${p.id}/programme`,
              action: { label: "Revise split", href: `/staff/projects/${p.id}/programme` },
            }),
          );
      }
      // Notes left in this person's register, until they act on them.
      for (const note of registerNotes) {
        if (note.for !== person) continue;
        const acted = of("schedule.proposed").some((e) => e.projectId === note.projectId && e.n === note.n);
        if (acted) continue;
        const days = daysSince(note.on);
        items.push(
          withStamps({
            id: note.id,
            projectId: note.projectId,
            title: `Propose a split of ${projectName(note.projectId)} milestone ${note.n}`,
            sentence: note.text,
            margin: ageWords(days),
            days,
            href: `/staff/projects/${note.projectId}/programme`,
            action: { label: "Propose a split", href: `/staff/projects/${note.projectId}/programme` },
          }),
        );
      }
      // Designs she asked to change go back to whoever uploaded them.
      for (const d of projection.designs) {
        if (d.status !== "changes-requested" || personOf(person)?.name !== d.latest.uploadedBy) continue;
        items.push(
          withStamps({
            id: `design:iyer:${d.design.id}`,
            projectId: "iyer",
            title: `Meera asked for changes to the ${lowerFirst(d.design.title)}, version ${d.latest.version}`,
            sentence: d.latest.comment ?? "Upload the next version.",
            margin: "Today",
            days: 0,
            href: "/staff/architect/designs",
            action: { label: "Upload next version", href: "/staff/architect/designs" },
          }),
        );
      }
    }

    if (me.role === "finance") {
      for (const r of requests) {
        if (r.queued || !(r.status === "New" || r.status === "Seen" || r.status === "PO in part")) continue;
        const team = seedOf(r.projectId)?.team.procurement ?? [];
        if (!team.includes(person)) continue;
        items.push(requestRow(r, true));
      }
      if (me.access.includes("finance")) {
        for (const l of letters) if (l.state === "approved" || l.state === "part-paid") items.push(letterRow(l));
        for (const po of pos) {
          if (po.billed || !po.billIn) continue;
          const days = daysSince(po.billIn);
          items.push(
            withStamps({
              id: `bill:${po.no}`,
              projectId: po.projectId,
              title: `Enter the bill for ${po.no}`,
              sentence: `${projectName(po.projectId)}, ${po.vendor}. The bill reached the office on ${formatShortDate(datePart(po.billIn))}.`,
              margin: ageWords(days),
              days,
              href: "/staff/finance/costs",
              action: { label: "Enter bill", href: "/staff/finance/costs" },
              figure: inr(po.amount),
            }),
          );
        }
      }
    }

    if (me.role === "bd") {
      for (const d of drafts) {
        if (d.by !== person || d.opened || d.stepsDone === 0) continue;
        const name = d.step1?.name ?? (d.id === "kulkarni" ? "Kulkarni Eco Home" : d.step1?.clients[0] ?? "New client");
        const days = daysSince(d.startedAt || TODAY_ISO);
        items.push(
          withStamps({
            id: `draft:${d.id}`,
            projectId: d.id === "kulkarni" ? "kulkarni" : undefined,
            title: name,
            sentence: `${d.stepsDone} of 4 steps done. ${d.missing}`,
            margin: ageWords(days),
            days,
            href: `/staff/bd/onboard/${d.id}`,
            action: { label: "Continue", href: `/staff/bd/onboard/${d.id}` },
            status: ["Draft"],
          }),
        );
      }
      for (const r of creditRequests) {
        if (!r.open) continue;
        items.push(
          withStamps({
            id: r.id,
            projectId: r.projectId,
            title: `${r.by} asked for ${r.hours} more hours`,
            sentence: `${projectName(r.projectId)}. Asked on ${formatShortDate(datePart(r.at))}. Payment not received yet.`,
            margin: ageWords(r.days),
            days: r.days,
            href: "/staff/bd/hours",
            action: { label: "Add hours", href: "/staff/bd/hours" },
          }),
        );
      }
      for (const p of projectViews) {
        if (p.phase !== "invited" || p.clientSignedInOn || !p.invitedAt) continue;
        const days = daysSince(p.invitedAt);
        items.push(
          withStamps({
            id: `invite:${p.id}`,
            projectId: p.id,
            title: p.name,
            sentence: `Invited ${days === 0 ? "today" : `${dayCount(days)} ago`}, not signed in yet.`,
            margin: ageWords(days),
            days,
            href: projectLink(p.id),
            action: { label: "Resend invite" },
            status: ["Invited, not signed in yet"],
          }),
        );
      }
    }

    if (me.role === "admin") items.push(...exceptions);
    return items;
  }

  function buildWaiting(person: PersonId): TurnItem[] {
    const me = personOf(person);
    if (!me) return [];
    const items: TurnItem[] = [];
    const withClient = (p: ProjectView, base: Omit<TurnItem, "margin" | "marginSub" | "client" | "stamps">) =>
      withStamps({ ...base, margin: `With ${p.clientWord}`, marginSub: ageWords(base.days), client: true });

    // Tasks this person handed out that are still being worked on, and their own hand-ins.
    for (const t of tasks) {
      if (t.kind !== "work") continue;
      const open = t.status === "planned" || t.status === "in-progress" || t.status === "revision";
      if (t.assignedBy === person && t.person !== person && open) {
        items.push(
          withStamps({
            id: `task:${t.id}`,
            projectId: t.projectId,
            title: t.title,
            sentence: `${t.personName}, ${t.projectName}. ${t.due ?? ""}.`.replace(" .", "."),
            margin: `With ${firstOf(t.person)}`,
            marginSub: t.due ?? undefined,
            overdue: t.overdue,
            days: daysSince(t.assignedOn),
            href: pageFor(person, people, "tasks"),
            personal: true,
          }),
        );
      }
      if (t.person === person && t.status === "submitted") {
        const days = daysSince(t.submittedAt ?? TODAY_ISO);
        items.push(
          withStamps({
            id: `task:${t.id}`,
            projectId: t.projectId,
            title: t.title,
            sentence:
              stamped(`task:${t.id}`, "Submitted") || !t.submittedAt
                ? `${t.projectName}.`
                : `${t.projectName}. Submitted ${formatStampShort(t.submittedAt)}.`,
            margin: `With ${firstOf(t.assignedBy)}`,
            marginSub: ageWords(days),
            days,
            href: pageFor(person, people, "tasks"),
            status: [`With ${firstOf(t.assignedBy)} (submitted)`],
            personal: true,
          }),
        );
      }
    }

    if (me.role === "site") {
      for (const r of requests) {
        if (r.by !== person) continue;
        if (r.queued) {
          items.push(
            withStamps({
              id: `mr:${r.no}`,
              projectId: r.projectId,
              title: `${r.no}, ${r.lineWords[0]}`,
              sentence: "Saved on this phone with no signal. It goes out when the signal is back.",
              margin: "Not sent yet",
              days: 0,
              href: `/staff/site/requests/${r.no}`,
            }),
          );
        } else if (r.status === "New" || r.status === "Seen" || r.status === "PO in part") {
          const row = requestRow(r, false);
          items.push({ ...row, margin: "With procurement", marginSub: ageWords(r.days), action: undefined });
        }
      }
      for (const p of projectViews) {
        for (const m of p.milestones) {
          if (m.state !== "done" || m.doneBy !== person) continue;
          const days = daysSince(m.doneOn ?? TODAY_ISO);
          items.push(
            withStamps({
              id: `pay:${p.id}:${m.n}`,
              projectId: p.id,
              title: `${p.name}, ${lowerFirst(m.name)}`,
              sentence: "Marked done. The Project Head raises the payment next.",
              margin: `With ${firstOf(p.team.head)}`,
              marginSub: ageWords(days),
              days,
              href: projectLink(p.id),
            }),
          );
        }
      }
    }

    if (me.role === "architect") {
      for (const p of projectViews) {
        const head = p.team.head === person;
        if (head) {
          for (const m of p.milestones) {
            if (m.state !== "raised") continue;
            items.push(
              withClient(p, {
                id: `pay:${p.id}:${m.n}`,
                projectId: p.id,
                title: `${p.name}, milestone ${m.n} payment`,
                sentence: stamped(`pay:${p.id}:${m.n}`, "Payment raised")
                  ? `Letter ${letterShort(m.letterNo ?? "")}.`
                  : `Letter ${letterShort(m.letterNo ?? "")}. Raised ${formatShortDate(datePart(m.raisedAt ?? TODAY_ISO))}.`,
                days: daysSince(m.raisedAt ?? TODAY_ISO),
                href: projectLink(p.id),
                figure: inr(m.total),
                status: ["Raised"],
              }),
            );
          }
          for (const r of revisions) {
            if (r.projectId !== p.id || r.status !== "with-client") continue;
            items.push(
              withClient(p, {
                id: `rev:${r.id}`,
                projectId: p.id,
                title: `${r.id}, ${lowerFirst(r.item)}`,
                sentence: `${r.days} days added.${r.heldUntil ? ` Price held until ${formatShortDate(r.heldUntil)}.` : ""}`,
                days: daysSince(r.raisedAt),
                href: projectLink(p.id),
                figure: `+${inr(r.amount)}`,
              }),
            );
          }
          const split = scheduleChanges.find((s) => s.projectId === p.id && s.status === "waiting");
          if (split)
            items.push(
              withClient(p, {
                id: `sched:${p.id}:${split.n}`,
                projectId: p.id,
                title: `Milestone ${split.n} in two parts`,
                sentence: split.reason,
                days: daysSince(split.at),
                href: projectLink(p.id),
              }),
            );
        }
        for (const d of designViews) {
          if (d.projectId !== p.id || d.status !== "awaiting") continue;
          if (!head && personOf(person)?.name !== d.by) continue;
          items.push(
            withClient(p, {
              id: `design:${p.id}:${d.designId}`,
              projectId: p.id,
              title: `${d.title}, version ${d.version}`,
              sentence: `${p.name}. Sent ${formatShortDate(datePart(d.sentAt))} by ${d.by}.`,
              days: d.days,
              href: "/staff/architect/designs",
            }),
          );
        }
      }
    }

    if (me.role === "finance") {
      for (const r of requests) {
        if (r.status !== "PO uploaded") continue;
        if (!(seedOf(r.projectId)?.team.procurement ?? []).includes(person)) continue;
        const row = requestRow(r, true);
        items.push({ ...row, margin: "With site", marginSub: ageWords(r.days), action: undefined, overdue: false });
      }
      if (me.access.includes("finance")) {
        for (const l of letters) {
          if (l.state !== "raised") continue;
          const p = projectOf(l.projectId);
          if (!p) continue;
          items.push(
            withClient(p, {
              id: `pay:${l.projectId}:${l.n}`,
              projectId: l.projectId,
              title: `${l.projectName}, letter ${l.short}`,
              sentence: stamped(`pay:${l.projectId}:${l.n}`, "Payment raised")
                ? `Milestone ${l.n}.`
                : `Milestone ${l.n}, raised ${formatShortDate(datePart(l.raisedAt))}.`,
              days: l.days,
              href: "/staff/finance/money",
              figure: inr(l.total),
              status: ["Raised"],
            }),
          );
        }
      }
    }

    if (me.role === "bd") {
      const cottage = projectOf("iyer-cottage");
      if (cottage && !estimateApproved)
        items.push(
          withClient(cottage, {
            id: "estimate:iyer-cottage",
            projectId: "iyer-cottage",
            title: "Iyer Farm Cottage, final estimate",
            sentence: `Issued ${formatShortDate(cottageEstimate.issuedOn)}, valid until ${formatShortDate(cottageEstimate.validUntil)}.`,
            days: daysSince(cottageEstimate.issuedOn),
            href: "/staff/bd/estimate/iyer-cottage",
            figure: inr(cottageEstimate.amount),
          }),
        );
    }
    return items;
  }

  // ---- Admin exceptions ----

  const exceptions: TurnItem[] = [];
  const live = projectViews.filter((p) => p.phase !== "draft");
  const overdueLetters = letters.filter((l) => l.overdueDays > 0);
  const cashShort = new Set<ProjectId>();
  for (const p of live) {
    if (p.cash < 0 && p.margin !== null && p.margin > 0) {
      cashShort.add(p.id);
      const worst = overdueLetters.filter((l) => l.projectId === p.id).sort((a, b) => b.overdueDays - a.overdueDays)[0];
      exceptions.push(
        withStamps({
          id: `ex:cash:${p.id}`,
          projectId: p.id,
          title: `${p.name} is short of cash by ${inr(-p.cash)}, though its margin so far is ${percent(p.marginPercent ?? 0)}.`,
          sentence: worst ? `Letter ${worst.short} is overdue ${dayCount(worst.overdueDays)}.` : "Bills are ahead of the money received.",
          margin: worst ? "Overdue" : "Today",
          overdue: !!worst,
          days: worst?.days ?? 0,
          href: `${projectLink(p.id)}/money`,
          figure: inrSigned(p.cash),
        }),
      );
    }
  }
  for (const p of live) {
    if (p.margin === null || p.margin >= 0) continue;
    exceptions.push(
      withStamps({
        id: `ex:margin:${p.id}`,
        projectId: p.id,
        title: `${p.name} is losing money on the work done so far: ${inrSigned(p.margin)}, ${percent(p.marginPercent ?? 0)}.`,
        sentence: p.costNote ?? "Costs so far are above the value of the work done.",
        margin: "Today",
        days: 0,
        href: `${projectLink(p.id)}/money`,
      }),
    );
  }
  for (const l of overdueLetters) {
    if (cashShort.has(l.projectId)) continue;
    exceptions.push(
      withStamps({
        id: `ex:letter:${l.projectId}:${l.n}`,
        projectId: l.projectId,
        title:
          l.state === "part-paid"
            ? `${l.projectName} letter ${l.short} is part paid and overdue ${dayCount(l.overdueDays)}.`
            : `${l.projectName} letter ${l.short} is overdue ${dayCount(l.overdueDays)}, waiting for the bank.`,
        sentence:
          l.state === "part-paid"
            ? `${inr(l.total - l.received)} from the client is still to come.`
            : `${inr(l.total)} is approved and not yet paid.`,
        margin: "Overdue",
        overdue: true,
        days: l.days,
        href: "/staff/finance/money",
      }),
    );
  }
  for (const r of requests) {
    if (r.queued || r.status !== "New" || r.days < UNSEEN_DAYS) continue;
    exceptions.push(
      withStamps({
        id: `ex:unseen:${r.no}`,
        projectId: r.projectId,
        title: `${r.projectName}: ${r.no} has not been seen for ${dayCount(r.days)}.`,
        sentence: `${r.lineWords.join("; ")}. Needed by ${formatShortDate(r.neededBy)}.`,
        margin: ageWords(r.days),
        days: r.days,
        href: `/staff/finance/requests/${r.no}`,
      }),
    );
  }
  // Client approvals waiting too long. A cost revision's price is held for a set time, so it
  // only counts once that has passed.
  for (const d of designViews) {
    if (d.status !== "awaiting" || d.days <= CLIENT_WAIT_DAYS) continue;
    const p = projectOf(d.projectId);
    exceptions.push(
      withStamps({
        id: `ex:client:${d.projectId}:${d.designId}`,
        projectId: d.projectId,
        title: `${p?.name}: the ${lowerFirst(d.title)}, version ${d.version}, has waited ${dayCount(d.days)} for ${
          p?.clientWord === "Meera" ? "Meera" : "the client"
        }.`,
        sentence: `${d.by} sent it on ${formatShortDate(datePart(d.sentAt))}.`,
        margin: `With ${p?.clientWord ?? "client"}`,
        marginSub: ageWords(d.days),
        client: true,
        days: d.days,
        href: projectLink(d.projectId),
      }),
    );
  }
  for (const l of letters) {
    if (l.state !== "raised" || l.days <= CLIENT_WAIT_DAYS) continue;
    const p = projectOf(l.projectId);
    exceptions.push(
      withStamps({
        id: `ex:client:pay:${l.projectId}:${l.n}`,
        projectId: l.projectId,
        title: `${l.projectName}: the payment for milestone ${l.n} has waited ${dayCount(l.days)} for ${
          p?.clientWord === "Meera" ? "Meera" : "the client"
        }.`,
        sentence: `Letter ${l.short}, ${inr(l.total)}.`,
        margin: `With ${p?.clientWord ?? "client"}`,
        marginSub: ageWords(l.days),
        client: true,
        days: l.days,
        href: projectLink(l.projectId),
      }),
    );
  }
  for (const r of revisions) {
    if (r.status !== "with-client" || !r.heldUntil || daysBetween(r.heldUntil, TODAY_ISO) <= 0) continue;
    exceptions.push(
      withStamps({
        id: `ex:client:rev:${r.id}`,
        projectId: r.projectId,
        title: `${projectName(r.projectId)}: ${r.id} is past its held price of ${formatShortDate(r.heldUntil)}.`,
        sentence: `${r.item}, +${inr(r.amount)}.`,
        margin: "Overdue",
        overdue: true,
        days: daysSince(r.heldUntil),
        href: projectLink(r.projectId),
      }),
    );
  }
  for (const note of registerNotes) {
    if (of("schedule.proposed").some((e) => e.projectId === note.projectId && e.n === note.n)) continue;
    const days = daysSince(note.on);
    if (days <= CLIENT_WAIT_DAYS) continue;
    exceptions.push(
      withStamps({
        id: `ex:split:${note.projectId}:${note.n}`,
        projectId: note.projectId,
        title: `${projectName(note.projectId)}: a split of milestone ${note.n} has waited ${dayCount(days)} for the Project Head.`,
        sentence: note.text,
        margin: ageWords(days),
        days,
        href: `${projectLink(note.projectId)}/programme`,
      }),
    );
  }

  const turnsCache = new Map<PersonId, TurnItem[]>();
  const waitingCache = new Map<PersonId, TurnItem[]>();

  const allNumbers = (prefix: string, list: string[]) => list.filter((no) => no.startsWith(prefix));

  return {
    people,
    projects: projectViews,
    requests,
    pos,
    letters,
    bills,
    revisions,
    tasks,
    time,
    credits,
    creditRequests,
    additions,
    posts,
    log,
    drafts,
    vendors,
    catalogue,
    catalogueAll,
    templates: liveTemplates,
    turns: (person, scope) => {
      if (!turnsCache.has(person)) turnsCache.set(person, order(buildTurns(person)));
      return (turnsCache.get(person) ?? []).filter((item) => inScope(item, scope));
    },
    waitingOn: (person, scope) => {
      if (!waitingCache.has(person)) waitingCache.set(person, order(buildWaiting(person)));
      return (waitingCache.get(person) ?? []).filter((item) => inScope(item, scope));
    },
    exceptions,
    onboardedIn: (month) => projectViews.filter((p) => p.phase !== "draft" && (p.onboardedOn ?? "").startsWith(month)),
    receipts,
    designs: designViews,
    scheduleChanges,
    cottage: {
      estimate: estimateApproved ? "approved" : "waiting",
      schedule: cottageScheduleApproved ? "approved" : "waiting",
      approvedAt: estimateApproved?.at,
    },
    nextRequestNo: nextNumber("MR-2026-", allNumbers("MR-2026-", requests.map((r) => r.no)), 4),
    nextPoNo: nextNumber("PO-2026-", allNumbers("PO-2026-", pos.map((po) => po.no)), 4),
    nextLetterNo: nextNumber(
      "PD/DL/2026-27/",
      letters.map((l) => l.letterNo),
      4,
    ),
    nextRevisionNo: nextNumber("CR-2026-", revisions.map((r) => r.id), 3),
    stampsFor,
    hoursThisWeek: (person) =>
      sum(time.filter((t) => t.person === person && t.date >= WEEK.from && t.date <= WEEK.to).map((t) => t.hours)),
    person: personOf,
    project: projectOf,
  };
}

/** The draft ids BD can open, for static params. */
export const DRAFT_IDS: DraftId[] = ["kulkarni", "new"];

/** Who a role is viewed as by default. */
export const DEFAULT_VIEWER: Record<StaffRole, PersonId> = {
  bd: "rohan",
  architect: "vikram",
  site: "suresh",
  finance: "prakash",
  admin: "shalini",
};

/** Divya's delegated access, for the people page. */
export const DELEGATIONS = [{ person: "divya" as PersonId, access: "finance" as const, at: DIVYA_ACCESS_AT, by: "shalini" as PersonId }];
