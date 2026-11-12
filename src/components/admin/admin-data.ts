import { TODAY } from "@/lib/demo-data";
import {
  ageWords,
  daysSince,
  type CatalogueLine,
  type Firm,
  type ProjectView,
  type StampView,
  type TurnItem,
} from "@/lib/firm";
import type {
  CatalogueUnit,
  FirmEvent,
  Person,
  PersonId,
  ProjectId,
  StaffRole,
  Template,
} from "@/lib/firm-data";
import { WEEK } from "@/lib/firm-data";
import { datePart, formatDate, formatShortDate, inr, inrSigned, listWords, percent } from "@/lib/format";

// The admin's view of the firm, worked out from the same store as every other screen. The
// record keeps admin changes as plain sentences ("Added '4 inch' to Solid blocks in the
// catalogue."), written here in one place; each is recorded beside the structured change
// the firm applies, so every role reads the catalogue, templates and people as they stand.

type Ev<K extends FirmEvent["kind"]> = Extract<FirmEvent, { kind: K }>;

function eventsOf<K extends FirmEvent["kind"]>(events: FirmEvent[], kind: K): Ev<K>[] {
  return events.filter((e): e is Ev<K> => e.kind === kind);
}

/** Stamps newest first; two from the same minute keep their order. */
export function newestFirstStamps(stamps: StampView[]): StampView[] {
  return stamps
    .map((stamp, index) => ({ stamp, index }))
    .sort((a, b) => b.stamp.at.localeCompare(a.stamp.at) || a.index - b.index)
    .map(({ stamp }) => stamp);
}

/** Who struck a line out, when, and why. */
export type Struck = { at: string; by: PersonId; reason: string };

// ---- Projects and money ----

/**
 * A project's money as everyone sees it. The firm already leaves a deleted bill out of
 * spent, costs and cash, and counts its order as committed again, so the figures are read
 * straight from the project.
 */
export type Money = Pick<
  ProjectView,
  "workDone" | "workDonePercent" | "costs" | "committed" | "spent" | "received" | "margin" | "marginPercent" | "cash"
>;

/** A date as the record says it: "10 Nov", or "10 Nov 2025" when it is from another year. */
export function dayWords(iso: string): string {
  const day = datePart(iso);
  return day.slice(0, 4) === TODAY.slice(0, 4) ? formatShortDate(day) : formatDate(day);
}

/** Losing money first, then short of cash, then the rest, each worst first; drafts and designs last. */
export function worstFirst<T extends { p: ProjectView }>(rows: T[]): T[] {
  const rank = ({ p }: T) =>
    p.margin === null ? 3 : p.phase === "handed-over" ? 2 : p.margin < 0 ? 0 : p.cash < 0 ? 1 : 2;
  const depth = ({ p }: T) => (p.margin !== null && p.margin < 0 ? p.margin : p.cash);
  return [...rows].sort((a, b) => rank(a) - rank(b) || depth(a) - depth(b));
}

/** The words column of the profit view. */
export function healthWords(p: Pick<ProjectView, "phase">, money: Money): string {
  if (p.phase === "draft") return "Draft";
  if (p.phase === "handed-over") return "Handed over";
  if (money.margin === null) return "In design";
  if (money.margin < 0) return "Losing money on the work done";
  if (money.cash < 0) return "Profitable on paper, short of cash";
  return "Healthy";
}

const NBSP = String.fromCharCode(0xa0);
const MINUS = String.fromCharCode(0x2212);
const JOINER = String.fromCharCode(0x2060);

/** One short sentence of the money: "Building, milestone 6. Margin so far 19%. Cash −₹6,64,000." */
export function moneyLine(p: ProjectView, money: Money): string {
  const margin =
    money.margin === null ? "No margin until building starts." : `Margin so far ${percent(money.marginPercent ?? 0)}.`;
  // A word joiner keeps the minus sign on the same line as its figure.
  return `${p.stageWords}. ${margin} Cash${NBSP}${inrSigned(money.cash).replace(MINUS, MINUS + JOINER)}.`;
}

/** Milestone numbers in words: "Milestone 5", "Milestones 4 and 5". */
function milestonesWords(ns: number[]): string {
  return ns.length === 1 ? `Milestone ${ns[0]}` : `Milestones ${listWords(ns.map(String))}`;
}

/**
 * The sentence that joins the figures on the Money tab: "Profitable on paper, short of cash
 * by ₹6,64,000. Milestones 4 and 5 have waited for the bank since 20 Sep and 22 Oct."
 */
export function joiningSentence(p: ProjectView, money: Money, firm: Firm): string {
  const health = healthWords(p, money);
  let first: string;
  if (health === "In design") first = "In design. The margin is worked out once building starts.";
  else if (health === "Handed over")
    first = `Handed over${p.handedOverOn ? ` on ${dayWords(p.handedOverOn)}` : ""}, with a margin of ${inrSigned(money.margin ?? 0)}.`;
  else if (health === "Losing money on the work done")
    first = `Losing money on the work done: costs so far are ${inr(-(money.margin ?? 0))} above the work's value.${
      p.costNote ? ` ${p.costNote}` : ""
    }`;
  else if (health === "Profitable on paper, short of cash")
    first = `Profitable on paper, short of cash by ${inr(-money.cash)}.`;
  else first = `Healthy, with ${inr(money.cash)} in hand.`;

  const letters = firm.letters.filter((l) => l.projectId === p.id);
  const bank = letters.filter((l) => l.state === "approved" && l.approvedAt);
  const part = letters.filter((l) => l.state === "part-paid");
  const raised = letters.filter((l) => l.state === "raised");
  const after: string[] = [];
  if (bank.length > 0)
    after.push(
      `${milestonesWords(bank.map((l) => l.n))} ${bank.length === 1 ? "has" : "have"} waited for the bank since ${listWords(
        bank.map((l) => dayWords(l.approvedAt ?? "")),
      )}.`,
    );
  for (const l of part) after.push(`Milestone ${l.n} is part paid; ${inr(l.total - l.received)} is still to come.`);
  for (const l of raised) after.push(`Milestone ${l.n} is with ${p.clientWord === "Meera" ? "Meera" : "the client"}.`);
  return [first, ...after].join(" ");
}

/** Whose turn a project's next step is, for the turn margin of its row. */
export function projectTurn(p: ProjectView, firm: Firm): { margin: string; marginSub?: string; client?: boolean } {
  if (p.phase === "draft") return { margin: "Draft" };
  if (p.phase === "handed-over") return { margin: "Handed over" };
  const open = p.milestones.find((m) => m.state === "raised" || m.state === "approved" || m.state === "part-paid");
  if (open?.state === "raised")
    return { margin: `With ${p.clientWord}`, marginSub: ageWords(daysSince(open.raisedAt ?? TODAY)), client: true };
  if (open)
    return { margin: "With the bank", marginSub: ageWords(daysSince(open.approvedAt ?? open.raisedAt ?? TODAY)) };
  if (p.phase === "building") return { margin: "With site", marginSub: ageWords(p.daysAtStage) };
  const head = firm.person(p.team.head);
  return { margin: `With ${head?.first ?? "the studio"}`, marginSub: ageWords(p.daysAtStage) };
}

// ---- The admin's exceptions ----

export type ExceptionRow = {
  item: TurnItem;
  margin: string;
  marginSub?: string;
  client?: boolean;
  action: string;
  href: string;
  /** The row the action's page should outline, for a request. */
  focus?: string;
};

/**
 * What the admin does with an exception: who holds it (the turn margin) and the one page to
 * open. Every page is the project's own record, so the admin never lands on another role's
 * screen under another person's name.
 */
export function exceptionRow(item: TurnItem, firm: Firm): ExceptionRow {
  const [, kind, ...rest] = item.id.split(":");
  const projectId = item.projectId;
  const p = projectId ? firm.project(projectId) : undefined;
  const base = projectId ? `/staff/projects/${projectId}` : "/staff/admin/projects";
  const days = item.days > 0 ? ageWords(item.days) : undefined;
  const withFirst = (id: PersonId | undefined) => `With ${(id && firm.person(id)?.first) ?? "the office"}`;

  if (kind === "cash" || kind === "letter")
    return { item, margin: withFirst("divya"), marginSub: days, action: "Open the money", href: `${base}/money` };
  if (kind === "margin")
    return { item, margin: withFirst(p?.team.head), marginSub: days, action: "Open the money", href: `${base}/money` };
  if (kind === "unseen") {
    const no = rest.join(":");
    const request = firm.requests.find((r) => r.no === no);
    return {
      item,
      margin: withFirst(request?.procurement[0]),
      marginSub: days,
      action: "Open the request",
      href: `${base}/materials`,
      focus: `mr:${no}`,
    };
  }
  if (kind === "client" && rest[0] === "pay")
    return {
      item,
      margin: item.margin,
      marginSub: item.marginSub,
      client: true,
      action: "Open the money",
      href: `${base}/money`,
    };
  if (kind === "client" && rest[0] === "rev")
    return {
      item,
      margin: withFirst(p?.team.head),
      marginSub: days,
      action: "Open the programme",
      href: `${base}/programme`,
    };
  if (kind === "client")
    return {
      item,
      margin: item.margin,
      marginSub: item.marginSub,
      client: true,
      action: "Open the drawing list",
      href: `${base}/designs`,
    };
  if (kind === "split")
    return {
      item,
      margin: withFirst(p?.team.head),
      marginSub: days,
      action: "Open the programme",
      href: `${base}/programme`,
    };
  return {
    item,
    margin: item.margin,
    marginSub: item.marginSub,
    client: item.client,
    action: "Open the project",
    href: base,
  };
}

// ---- People ----

export const ROLE_GROUP: Record<Person["role"], string> = {
  bd: "Business development",
  architect: "Architects",
  site: "Site engineers",
  finance: "Procurement and finance",
  admin: "Admin",
  client: "Clients",
};

export const STAFF_ROLES: StaffRole[] = ["bd", "architect", "site", "finance", "admin"];

/** The team a role works in. */
export const ROLE_TEAM: Record<StaffRole, string> = {
  bd: "Business development",
  architect: "Studio",
  site: "Site",
  finance: "Procurement",
  admin: "Admin",
};

/** The record's words for a change of role. */
export function roleChangeWords(name: string, from: Person["role"], to: StaffRole): string {
  return `Moved ${name} from ${ROLE_GROUP[from]} to ${ROLE_GROUP[to]}.`;
}

export type PersonView = Person & {
  /** Projects worked on, with the Project Head flag. */
  projects: { id: ProjectId; name: string; head: boolean; poc: boolean }[];
  /** Projects this person opened, for business development. */
  onboarded: number;
  stamps: StampView[];
};

/** The words a change leaves on a person's row. */
function changeStampWords(change: string): string {
  if (change.startsWith("Moved ")) return "Role changed";
  if (change.startsWith("Deactivated")) return "Deactivated";
  if (change.startsWith("Reactivated")) return "Reactivated";
  if (change.endsWith(" senior.")) return "Marked senior";
  if (change.endsWith(" junior.")) return "Marked junior";
  return "Changed";
}

/** Everyone, as the people page lays them out: with their projects and their stamps. Role moves are already in. */
export function peopleOf(firm: Firm, events: FirmEvent[]): PersonView[] {
  const live = firm.projects.filter((p) => p.phase !== "draft");
  return firm.people.map((person) => {
    const stamps: StampView[] = [];
    for (const e of events) {
      if (e.kind === "person.added" && e.person.id === person.id) stamps.push({ words: "Added", at: e.at, by: e.by });
      else if (e.kind === "person.changed" && e.person === person.id) {
        stamps.push({ words: changeStampWords(e.change), at: e.at, by: e.by });
      } else if (e.kind === "access.given" && e.personId === person.id)
        stamps.push({ words: "Finance access given", at: e.at, by: e.by });
      else if (e.kind === "head.changed" && e.to === person.id)
        stamps.push({
          words: `Made Project Head of ${firm.project(e.projectId)?.name ?? e.projectId}`,
          at: e.at,
          by: e.by,
        });
      else if (e.kind === "head.changed" && e.from === person.id)
        stamps.push({
          words: `No longer Project Head of ${firm.project(e.projectId)?.name ?? e.projectId}`,
          at: e.at,
          by: e.by,
        });
      else if (e.kind === "member.added" && e.personId === person.id)
        stamps.push({ words: `Added to ${e.team}`, at: e.at, by: e.by });
    }
    const projects = live
      .filter((p) => {
        const t = p.team;
        return (
          t.poc === person.id ||
          t.head === person.id ||
          t.architects.includes(person.id) ||
          t.engineers.includes(person.id) ||
          t.procurement.includes(person.id) ||
          (person.role === "client" && p.clientEmail === person.email)
        );
      })
      .map((p) => ({ id: p.id, name: p.name, head: p.team.head === person.id, poc: p.team.poc === person.id }));
    // Meera and Arjun share both houses.
    const clientProjects =
      person.role === "client" && projects.length === 0 && (person.id === "meera" || person.id === "arjun")
        ? live
            .filter((p) => p.id === "iyer" || p.id === "iyer-cottage")
            .map((p) => ({ id: p.id, name: p.name, head: false, poc: false }))
        : projects;
    const onboarded = live.filter((p) => p.onboardedBy === person.id).length;
    return { ...person, projects: clientProjects, onboarded, stamps: stamps.reverse() };
  });
}

// ---- The catalogue ----

export type CatalogueRow = {
  id: string;
  name: string;
  unit: CatalogueUnit;
  subs: { name: string; struck?: Struck }[];
  struck?: Struck;
};

export const UNITS: CatalogueUnit[] = ["bags", "kg", "cu ft", "nos", "sq ft", "lengths"];

export const catalogueWords = {
  addSub: (sub: string, item: string) => `Added '${sub}' to ${item} in the catalogue.`,
  addItem: (name: string, unit: CatalogueUnit) => `Added the material '${name}', counted in ${unit}, to the catalogue.`,
  renameSub: (from: string, to: string, item: string) => `Renamed '${from}' to '${to}' under ${item} in the catalogue.`,
  renameItem: (from: string, to: string) => `Renamed the material '${from}' to '${to}' in the catalogue.`,
  /** For record.deleted: "Deleted '4 inch' from Solid blocks in the catalogue." */
  deleteSub: (sub: string, item: string) => `'${sub}' from ${item} in the catalogue`,
  deleteItem: (name: string) => `the material '${name}' from the catalogue`,
};

/** The catalogue as the admin left it, struck lines kept, from the firm's own reading of it. */
export function catalogueRowsOf(all: CatalogueLine[]): CatalogueRow[] {
  return all.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    subs: [
      ...item.subs.map((name) => ({ name })),
      ...item.deletedSubs.map((sub) => ({ name: sub.name, struck: sub.deleted })),
    ],
    struck: item.deleted,
  }));
}

// ---- Vendors ----

/** For record.deleted, in the seed's own words: "Deleted vendor 'Sri Laxmi Steel'." */
export function vendorWhat(name: string): string {
  return `vendor '${name}'`;
}

// ---- Category templates ----

export type TemplateView = Template & { changed?: { at: string; by: PersonId } };

/** No semicolons inside a changed value, so the record's sentence reads back cleanly. */
export function cleanValue(value: string): string {
  return value.replace(/[;']/g, ",").replace(/\s+/g, " ").trim();
}

/**
 * The record's sentence for a saved template: what changed, and nothing else.
 * "Changed the Farmhouse template: rate from ₹2,400 to ₹2,500 per sq ft; milestone 3 from 15% to 14%."
 */
export function templateChangeWords(before: Template, after: Template): string | null {
  const parts: string[] = [];
  if (before.ratePerSqFt !== after.ratePerSqFt)
    parts.push(`rate from ${inr(before.ratePerSqFt)} to ${inr(after.ratePerSqFt)} per sq ft`);
  for (const m of after.milestones) {
    const was = before.milestones.find((x) => x.n === m.n);
    if (!was) continue;
    if (was.name !== m.name) parts.push(`milestone ${m.n} named '${cleanValue(m.name)}'`);
    if (was.covers !== m.covers) parts.push(`milestone ${m.n} covers '${cleanValue(m.covers)}'`);
    if (was.percent !== m.percent) parts.push(`milestone ${m.n} from ${was.percent}% to ${m.percent}%`);
  }
  if (parts.length === 0) return null;
  return `Changed the ${after.name} template: ${parts.join("; ")}.`;
}

/** The templates as the firm holds them, each marked with its last change in this tab. */
export function templatesOf(base: Template[], events: FirmEvent[]): TemplateView[] {
  const views: TemplateView[] = base.map((t) => ({ ...t, milestones: t.milestones.map((m) => ({ ...m })) }));
  for (const e of eventsOf(events, "template.changed")) {
    const t = views.find((v) => v.id === e.templateId);
    if (t) t.changed = { at: e.at, by: e.by };
  }
  return views;
}

// ---- The record ----

export type LogFilter = "all" | "approvals" | "payments" | "materials" | "people" | "deletions";

/** Which of the log's action filters an entry falls under. */
export function logKinds(entry: { kind: string; action: string }): LogFilter[] {
  const a = entry.action;
  const kinds: LogFilter[] = [];
  if (entry.kind === "deleted") kinds.push("deletions");
  if (entry.kind === "client" || /^(Approved|Accepted)\b/.test(a)) kinds.push("approvals");
  if (/payment|letter|Recorded ₹|bill|hours|₹/i.test(a) && entry.kind !== "deleted") kinds.push("payments");
  if (/\b(MR|PO)-\d{4}-\d{4}\b/.test(a)) kinds.push("materials");
  if (
    /^(Gave|Made|Moved|Marked .+ (senior|junior)|Deactivated|Reactivated|Added (?!the material|vendor|'|\d)[A-Z])/.test(
      a,
    )
  )
    kinds.push("people");
  return kinds;
}

/** Whether a timestamp falls in this week (Monday 9 November on) or this month. */
export function inRange(at: string, range: "week" | "month" | "all"): boolean {
  if (range === "all") return true;
  const day = datePart(at);
  if (range === "month") return day.slice(0, 7) === TODAY.slice(0, 7);
  return day >= WEEK.from && day <= WEEK.to;
}
