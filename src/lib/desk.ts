/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import {
  APPRAISAL_PERIOD,
  DUPLICATE_MONTHS,
  NPS_DESIGN,
  NPS_HANDOVER,
  projectAdvisors,
  projectPhones,
  seedContacts,
  type ClientRequestType,
  type FeeQuote,
  type FeeRule,
} from "./bd-data";
import { TODAY } from "./demo-data";
import {
  chargedHours,
  deriveClientRequests,
  deskEvents,
  feeRuleOf,
  nextFeeInvoiceNo,
  quoteFee,
  type ClientRequestView,
  type DeskEvent,
  type FeeView,
} from "./fees";
import type { FirmCore, ProjectView } from "./firm";
import {
  courses,
  performance,
  type CategoryId,
  type FirmEvent,
  type Person,
  type PersonId,
  type ProjectId,
} from "./firm-data";
import { addDays, datePart, daysBetween, inr } from "./format";
import type { Tone } from "./portal";
import {
  addMonths,
  deriveProspects,
  findDuplicateIn,
  toCall,
  type ContactHolder,
  type DuplicateMatch,
  type ProspectView,
} from "./prospects";

// Business development and architect refinement on top of the firm: prospects and the
// duplicate rule, client requests and architect fees, client feedback (NPS) and engagement,
// appraisals, what is waiting on each person (with how long it has waited), the projects that
// need attention, architects on a project, and project pictures. Pure: TODAY, never the clock.

// ---- Where rows link (screens may move; change them here) ----

export const DESK_HREF = {
  prospects: "/staff/bd/prospects",
  prospect: (id: string) => `/staff/bd/prospects/${id}`,
  onboard: (draftId: string) => `/staff/bd/onboard/${draftId}`,
  escalations: "/staff/bd/hours",
  project: (id: ProjectId) => `/staff/projects/${id}`,
  projectRequests: (id: ProjectId) => `/staff/projects/${id}/hours`,
  projectTeam: (id: ProjectId) => `/staff/projects/${id}`,
  architectDesigns: "/staff/architect/designs",
  financeMoney: "/staff/finance/money",
  /** Where a person's own work tasks are handed in (and set tasks reviewed). Admin, BD and finance answer them on Today. */
  tasks: (role: Person["role"]) =>
    role === "site"
      ? "/staff/site/tasks"
      : role === "architect"
        ? "/staff/architect/tasks"
        : role === "admin"
          ? "/staff/admin"
          : role === "bd"
            ? "/staff/bd"
            : role === "finance"
              ? "/staff/finance"
              : "/client",
  siteStage: (id: ProjectId) => `/staff/site/stage?project=${id}`,
  client: "/client",
  clientRequests: "/client/hours",
  clientDesign: (id: string) => `/client/designs/${id}`,
  clientPayments: "/client/payments",
  clientChanges: "/client/changes",
};

// ---- Waiting time ----

/** under 2 days normal; 2 to 4 days waiting; 5+ days or past a due date urgent. */
export type WaitTier = "normal" | "waiting" | "urgent";

export const WAIT_DAYS = { waiting: 2, urgent: 5 };

/** Whole days from `since` (a date or a stamp) to TODAY, never below 0. */
export function waitedDaysOf(since: string, today: string = TODAY): number {
  return Math.max(0, daysBetween(datePart(since), today));
}

/** The tier of a wait: urgent at 5+ days or once a due date has passed. */
export function tierOf(waitedDays: number, due?: string | null, today: string = TODAY): WaitTier {
  if (due && datePart(due) < today) return "urgent";
  if (waitedDays >= WAIT_DAYS.urgent) return "urgent";
  if (waitedDays >= WAIT_DAYS.waiting) return "waiting";
  return "normal";
}

export type AttentionKind =
  | "approval"
  | "task"
  | "review"
  | "request"
  | "fee"
  | "material"
  | "payment"
  | "design"
  | "drawing"
  | "site"
  | "prospect"
  | "message"
  | "escalation"
  | "invite"
  | "draft"
  | "nps"
  | "exception";

export type AttentionItem = {
  /** Stable; matches the TurnItem id where the same row exists there ("task:t3", "pay:iyer:5"). */
  id: string;
  kind: AttentionKind;
  /** A few words: "Approve 4 more hours", "Call Farah Siddiqui". */
  what: string;
  /** One short line under it, or none. */
  detail?: string;
  projectId?: ProjectId;
  projectName?: string;
  projectCode?: string;
  /** When the event that created it happened ("YYYY-MM-DD" or a stamp). */
  since: string;
  waitedDays: number;
  /** Its due date, if it has one. */
  due?: string;
  /** Days past `due`, else 0. */
  overdueDays: number;
  tier: WaitTier;
  href: string;
  /** The button word: "Approve", "Call", "Bill". */
  action?: string;
  figure?: string;
  /** An approval (someone waits on this person's yes or no): its wait counts in appraisals. */
  approval: boolean;
};

const TIER_RANK: Record<WaitTier, number> = { urgent: 0, waiting: 1, normal: 2 };

/** Urgent first, then the oldest. */
export function sortAttention(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.since.localeCompare(b.since) || a.id.localeCompare(b.id));
}

export type ProjectAttention = {
  projectId: ProjectId;
  project: ProjectView;
  reasons: { kind: "held" | "late" | "overdue" | "nps" | "escalation" | "waiting"; words: string; tone: Tone }[];
  tier: WaitTier;
  /** The longest wait among the reasons, in days. */
  worstDays: number;
};

// ---- NPS ----

export type NpsBand = "promoter" | "passive" | "detractor";

export type NpsAnswer = {
  id: string;
  projectId: ProjectId;
  score: number;
  comment?: string;
  milestone: number;
  /** "Milestone 3", "Design approved", "Handover". */
  point: string;
  at: string;
  by: PersonId;
  band: NpsBand;
};

export type NpsSummary = {
  /** Promoters % minus detractors %, -100 to 100; null with no answers. */
  nps: number | null;
  count: number;
  promoters: number;
  passives: number;
  detractors: number;
};

export type NpsTrendPoint = { month: string; nps: number | null; count: number };

/**
 * One project's answers. A project has one client, so it has no NPS of its own: show the latest
 * score (what the measure counts) and the earlier ones as history.
 */
export type ProjectNps = {
  projectId: ProjectId;
  latest: NpsAnswer | null;
  /** Newest first. */
  answers: NpsAnswer[];
};

export type PersonNps = NpsSummary & {
  personId: PersonId;
  /** The latest answer of each of their clients, newest first. */
  latest: NpsAnswer[];
  /** Month by month (latest answers as they stood at each month's end), oldest first. */
  trend: NpsTrendPoint[];
};

export type NpsAsk = { projectId: ProjectId; milestone: number; point: string; since: string };

export function bandOf(score: number): NpsBand {
  return score >= 9 ? "promoter" : score <= 6 ? "detractor" : "passive";
}

/** Promoters % minus detractors %, rounded; null when there are no scores. */
export function npsOf(scores: number[]): NpsSummary {
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const count = scores.length;
  return {
    nps: count === 0 ? null : Math.round(((promoters - detractors) / count) * 100),
    count,
    promoters,
    passives: count - promoters - detractors,
    detractors,
  };
}

export function npsPointWords(milestone: number): string {
  return milestone === NPS_DESIGN ? "Design approved" : milestone === NPS_HANDOVER ? "Handover" : `Milestone ${milestone}`;
}

// ---- Engagement and appraisals ----

/** A median reply time in words: "12.1 h", or "2 d" from two days; "–" with none. */
export function replyWords(hours: number | null): string {
  if (hours === null) return "–";
  return hours >= 48 ? `${Math.round(hours / 24)} d` : `${Math.round(hours * 10) / 10} h`;
}

export type ReplyPair = { projectId: ProjectId; from: string; at: string; repliedBy: PersonId | null; repliedAt: string | null };

export type Engagement = {
  personId: PersonId;
  /** Client messages this person answered. */
  replies: number;
  /** Median hours from a client message to this person's reply; null with none. */
  medianReplyHours: number | null;
  /** Client messages on their projects nobody has answered yet. */
  unanswered: number;
  oldestUnansweredAt: string | null;
  /** Requests escalated to them and not settled. */
  escalationsOpen: number;
  /** Clients they hold (BD) or head (architect). */
  clients: number;
};

export type ApprovalRecord = {
  id: string;
  personId: PersonId;
  kind: "request" | "fee" | "escalation" | "letter" | "material" | "receipt" | "review" | "invite";
  what: string;
  projectId?: ProjectId;
  /** When it reached them. */
  since: string;
  /** When they answered. */
  doneAt: string;
  delayDays: number;
};

export type Appraisal = {
  personId: PersonId;
  name: string;
  role: Person["role"];
  period: { from: string; to: string; label?: string };
  approvals: {
    handled: number;
    avgDelayDays: number | null;
    worst: ApprovalRecord | null;
    records: ApprovalRecord[];
  };
  /** Waiting on them now. */
  pending: { count: number; approvals: number; urgent: number; oldestDays: number };
  /** Urgent items now (5+ days or past due). */
  overdueNow: number;
  /** BD: client feedback over their clients. */
  nps?: PersonNps;
  engagement?: Engagement;
  /** BD: prospects in the period. */
  prospects?: { registered: number; converted: number; dropped: number; active: number; followUpsDue: number };
  /** Project Heads: client requests decided in the period. */
  requests?: { decided: number; avgTurnaroundDays: number | null; open: number };
  /** Architects and site engineers: tasks, from the performance record. */
  tasks?: { count: number; onTimePercent: number; avgDays: number };
};

// ---- Architects on a project ----

export type ArchitectMember = {
  personId: PersonId;
  state: "assigned" | "invited";
  since: string;
  by: PersonId;
  note?: string;
};

export type ArchitectTeam = { projectId: ProjectId; head: PersonId; members: ArchitectMember[] };

export type ArchitectInvite = { projectId: ProjectId; personId: PersonId; by: PersonId; at: string; note?: string };

export type ArchitectStrengths = {
  personId: PersonId;
  /** Projects worked on, by category (head or architect). */
  categories: Partial<Record<CategoryId, number>>;
  liveProjects: number;
  /** Client design items they prepared that are approved. */
  designsApproved: number;
  /** Work accepted first time (no revision), 0 to 100: their recent task blocks, else their design items; null with none. */
  firstTimePercent: number | null;
  /** Average days from a task given to it accepted; null with none. */
  avgTurnaroundDays: number | null;
  /** Tasks on time, 0 to 100; null with none. */
  onTimePercent: number | null;
};

export type ArchitectSuggestion = {
  personId: PersonId;
  name: string;
  senior: boolean;
  score: number;
  /** Short chips: "3 city villas", "80% first time", "2 live". */
  reasons: string[];
  state: "assigned" | "invited" | null;
};

// ---- Pictures ----

export type ProjectThumbnail =
  | { kind: "upload"; src: string; setAt: string; setBy: PersonId }
  | { kind: "drawing"; category: CategoryId };

/** A project's stage as one chip: "Milestone 4", "Design", "Held", "Handed over", "Onboarding". */
export function projectStageChip(p: ProjectView): { words: string; tone: Tone } {
  if (p.phase === "handed-over") return { words: "Handed over", tone: "done" };
  if (p.phase === "draft") return { words: "Onboarding", tone: "locked" };
  const held = p.plan?.stages.find((s) => s.state === "held");
  if (held) return { words: "Held", tone: "late" };
  if (p.currentMilestone) return { words: `Milestone ${p.currentMilestone}`, tone: "progress" };
  if (p.phase === "invited") return { words: "Invited", tone: "waiting" };
  return { words: "Design", tone: "progress" };
}

// ---- The API ----

export type DuplicateView = DuplicateMatch & { holderName: string; until: string };

export type DeskApi = {
  /** Every prospect, newest registration first. */
  prospects: ProspectView[];
  prospect: (id: string) => ProspectView | undefined;
  /** A BD person's prospects (as advisor), newest first. */
  prospectsFor: (person: PersonId) => ProspectView[];
  /** Per the duplicate rule: who holds this phone or email, and since when; null when free. */
  findDuplicate: (phone: string, email: string, at?: string, except?: string) => DuplicateView | null;
  nextProspectId: string;
  /** The BD person who holds a client: the enquiry's advisor, and the client's contact (`team.poc`). */
  advisorOf: (projectId: ProjectId) => PersonId;
  feeRule: FeeRule & { setAt?: string; setBy?: PersonId };
  /** The fee an approval would generate now: hours (at least the minimum for a design change) x rate, plus GST. */
  quoteFee: (type: ClientRequestType, hours: number) => FeeQuote;
  clientRequests: ClientRequestView[];
  clientRequest: (id: string) => ClientRequestView | undefined;
  requestsFor: (projectId: ProjectId) => ClientRequestView[];
  /** Requests on the projects this person heads, open first. */
  requestsForHead: (person: PersonId) => ClientRequestView[];
  /** Requests escalated to this person (BD), open first. */
  escalationsFor: (person: PersonId) => ClientRequestView[];
  feesFor: (projectId: ProjectId) => FeeView[];
  nextFeeInvoiceNo: string;
  npsAnswers: NpsAnswer[];
  npsForProject: (projectId: ProjectId) => ProjectNps;
  npsForPerson: (person: PersonId) => PersonNps;
  /** The question waiting for the client on a project, or null. */
  npsAsk: (projectId: ProjectId) => NpsAsk | null;
  /** The whole firm, over every client's latest answer. */
  npsFirm: NpsSummary;
  engagement: (person: PersonId) => Engagement;
  approvalRecords: (person: PersonId) => ApprovalRecord[];
  appraisal: (person: PersonId, period?: { from: string; to: string; label?: string }) => Appraisal;
  /** Everything waiting on a person, urgent first then oldest. */
  attentionFor: (person: PersonId) => AttentionItem[];
  /** Their projects that need attention, worst first. */
  projectsNeedingAttention: (person: PersonId) => ProjectAttention[];
  architectTeam: (projectId: ProjectId) => ArchitectTeam;
  invitesFor: (person: PersonId) => ArchitectInvite[];
  architectStrengths: (person: PersonId) => ArchitectStrengths;
  /** Junior architects ranked for a project, best fit first (seniors and the head left out). */
  suggestArchitects: (projectId: ProjectId) => ArchitectSuggestion[];
  thumbnail: (projectId: ProjectId) => ProjectThumbnail;
};

const CLIENT_IDS = new Set<PersonId>(["meera", "arjun"]);
const CLIENT_PROJECTS: ProjectId[] = ["iyer", "iyer-cottage"];

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function average(values: number[]): number | null {
  return values.length === 0 ? null : Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/** Hours between two stamps "YYYY-MM-DDTHH:mm" (a plain date counts as midnight). */
function hoursBetween(from: string, to: string): number {
  const t = (s: string) => Date.parse(`${s.length === 10 ? `${s}T00:00` : s}:00Z`);
  return Math.max(0, Math.round(((t(to) - t(from)) / 3600000) * 10) / 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function deriveDesk(core: FirmCore, events: FirmEvent[]): DeskApi {
  const all: DeskEvent[] = deskEvents(events);
  const projectOf = (id: ProjectId) => core.project(id);
  const personOf = (id: PersonId) => core.person(id);
  const nameOf = (id: PersonId) => personOf(id)?.name ?? id;
  const firstOf = (id: PersonId) => personOf(id)?.first ?? id;
  const live = core.projects.filter((p) => p.phase !== "draft");
  // One BD person per client: the point of contact the client sees (as set when the project is
  // opened) is the one measured on their feedback and sent their escalations.
  const advisorOf = (id: ProjectId): PersonId => projectOf(id)?.team.poc ?? projectAdvisors[id] ?? "rohan";

  // ---- Prospects ----
  const prospects = deriveProspects(events);
  const holders: ContactHolder[] = [
    ...prospects.map(
      (p): ContactHolder => ({
        kind: "prospect",
        ref: p.id,
        name: p.owner,
        phone: p.phone,
        email: p.email,
        holder: p.advisor,
        since: p.registeredOn,
      }),
    ),
    ...core.projects
      .filter((p) => p.phase !== "draft" || core.drafts.some((d) => d.projectId === p.id))
      .map(
        (p): ContactHolder => ({
          kind: "customer",
          ref: p.id,
          name: p.clients[0] ?? p.name,
          phone: projectPhones[p.id] ?? "",
          email: p.clientEmail,
          holder: advisorOf(p.id),
          since: datePart(p.onboardedOn ?? p.signedOn ?? TODAY),
        }),
      ),
    // An onboarding draft holds its client too, from the day it was started.
    ...core.drafts
      .filter((d) => !d.opened && d.step1 && (d.step1.email || d.step1.phone))
      .map(
        (d): ContactHolder => ({
          kind: "customer",
          ref: `draft:${d.id}`,
          name: d.step1?.clients[0] ?? "Client",
          phone: d.step1?.phone ?? "",
          email: d.step1?.email ?? "",
          holder: d.by,
          since: datePart(d.startedAt || TODAY),
        }),
      ),
  ];
  const findDuplicate = (phone: string, email: string, at: string = TODAY, except?: string): DuplicateView | null => {
    const match = findDuplicateIn(holders, phone, email, at, except);
    return match ? { ...match, holderName: nameOf(match.holder), until: addMonths(match.since, DUPLICATE_MONTHS) } : null;
  };
  const nextProspectId = `pr-${String(
    prospects.reduce((max, p) => Math.max(max, Number(p.id.replace(/\D/g, "")) || 0), 0) + 1,
  ).padStart(2, "0")}`;

  // ---- Client requests and fees ----
  const feeRule = feeRuleOf(events);
  const clientRequests = deriveClientRequests(all, (id) => {
    const p = projectOf(id);
    return p ? { head: p.team.head, client: p.clients[0] ?? "Client" } : undefined;
  });
  const openFirst = (list: ClientRequestView[]) =>
    [...list].sort((a, b) => Number(b.open) - Number(a.open) || b.raisedAt.localeCompare(a.raisedAt));

  // ---- NPS ----
  const npsAnswers: NpsAnswer[] = all
    .filter((e): e is Extract<DeskEvent, { kind: "nps.answered" }> => e.kind === "nps.answered")
    .map((e) => ({
      id: e.id,
      projectId: e.projectId,
      score: Math.max(0, Math.min(10, Math.round(e.score))),
      comment: e.comment,
      milestone: e.milestone,
      point: npsPointWords(e.milestone),
      at: e.at,
      by: e.by,
      band: bandOf(e.score),
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
  const latestAnswer = (projectId: ProjectId, asOf?: string) =>
    npsAnswers.find((a) => a.projectId === projectId && (!asOf || a.at <= asOf)) ?? null;
  const npsForProject = (projectId: ProjectId): ProjectNps => {
    const answers = npsAnswers.filter((a) => a.projectId === projectId);
    return { projectId, latest: answers[0] ?? null, answers };
  };
  // A person's clients: BD holds them as advisor; an architect as Project Head.
  const clientProjectsOf = (person: PersonId): ProjectView[] => {
    const me = personOf(person);
    return live.filter((p) => (me?.role === "architect" ? p.team.head === person : advisorOf(p.id) === person));
  };
  // One client, however many projects (Meera has the residence and the farm cottage): known by
  // their email, so they count once in "clients" and in an NPS.
  const clientsOf = (projects: ProjectView[]): ProjectView[][] => {
    const groups = new Map<string, ProjectView[]>();
    for (const p of projects) {
      const key = p.clientEmail.trim().toLowerCase() || p.id;
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    return [...groups.values()];
  };
  /** Each client's newest answer across their projects (as it stood at `asOf`). */
  const latestOfClients = (projects: ProjectView[], asOf?: string): NpsAnswer[] =>
    clientsOf(projects)
      .map((group) =>
        group
          .map((p) => latestAnswer(p.id, asOf))
          .filter((a): a is NpsAnswer => !!a)
          .sort((a, b) => b.at.localeCompare(a.at))[0],
      )
      .filter((a): a is NpsAnswer => !!a)
      .sort((a, b) => b.at.localeCompare(a.at));
  const npsForPerson = (person: PersonId): PersonNps => {
    const projects = clientProjectsOf(person);
    const latest = latestOfClients(projects);
    const trend: NpsTrendPoint[] = [];
    const [ty, tm] = TODAY.split("-").map(Number);
    for (let back = 5; back >= 0; back--) {
      const total = ty * 12 + (tm - 1) - back;
      const year = Math.floor(total / 12);
      const month = (total % 12) + 1;
      const end = `${year}-${String(month).padStart(2, "0")}-31T23:59`;
      const summary = npsOf(latestOfClients(projects, end).map((a) => a.score));
      trend.push({ month: `${MONTHS[month - 1]} ${year}`, nps: summary.nps, count: summary.count });
    }
    return { ...npsOf(latest.map((a) => a.score)), personId: person, latest, trend };
  };
  const npsFirm = npsOf(latestOfClients(live).map((a) => a.score));
  const npsAsk = (projectId: ProjectId): NpsAsk | null => {
    const plan = core.plan(projectId);
    if (!plan) return null;
    let point: { milestone: number; since: string } | null = null;
    for (const s of plan.stages) {
      if (s.state !== "done") continue;
      const since = s.doneOn ?? s.plannedEnd;
      if (s.id === "final-approval") point = { milestone: NPS_DESIGN, since };
      else if (s.milestone) point = { milestone: s.milestone, since };
      else if (s.id === "handover") point = { milestone: NPS_HANDOVER, since };
    }
    // The site marking a milestone finished asks at once, before the plan's other tasks close.
    for (const e of events)
      if (e.kind === "stage.done" && e.projectId === projectId && (!point || (point.milestone !== NPS_HANDOVER && e.n > point.milestone)))
        point = { milestone: e.n, since: e.at };
    if (!point) return null;
    const answered = npsAnswers.some((a) => a.projectId === projectId && a.milestone >= point.milestone);
    return answered ? null : { projectId, milestone: point.milestone, point: npsPointWords(point.milestone), since: point.since };
  };

  // ---- Engagement: client messages and replies ----
  const pairs: ReplyPair[] = [...seedContacts];
  for (const p of live) {
    const chat = core.chat(p.id);
    chat.forEach((post, i) => {
      if (post.side !== "client" || post.kind !== "post") return;
      const reply = chat.slice(i + 1).find((x) => x.side === "team");
      pairs.push({ projectId: p.id, from: post.name, at: post.at, repliedBy: reply?.by ?? null, repliedAt: reply?.at ?? null });
    });
  }
  const escalationsFor = (person: PersonId) => openFirst(clientRequests.filter((r) => r.escalation?.to === person));
  const engagement = (person: PersonId): Engagement => {
    const mine = pairs.filter((x) => x.repliedBy === person && x.repliedAt);
    const projects = new Set(
      live.filter((p) => advisorOf(p.id) === person || p.team.head === person).map((p) => p.id),
    );
    const waiting = pairs.filter((x) => !x.repliedAt && projects.has(x.projectId)).sort((a, b) => a.at.localeCompare(b.at));
    return {
      personId: person,
      replies: mine.length,
      medianReplyHours: median(mine.map((x) => hoursBetween(x.at, x.repliedAt ?? x.at))),
      unanswered: waiting.length,
      oldestUnansweredAt: waiting[0]?.at ?? null,
      escalationsOpen: escalationsFor(person).filter((r) => r.escalation?.open).length,
      clients: clientsOf(clientProjectsOf(person)).length,
    };
  };

  // ---- Architects on a project ----
  const inviteEvents = all.filter(
    (e): e is Extract<DeskEvent, { kind: "project.architect-invited" | "project.architect-assigned" | "project.architect-removed" }> =>
      e.kind === "project.architect-invited" || e.kind === "project.architect-assigned" || e.kind === "project.architect-removed",
  );
  const openInvites: ArchitectInvite[] = [];
  for (const e of inviteEvents) {
    const i = openInvites.findIndex((x) => x.projectId === e.projectId && x.personId === e.personId);
    if (i >= 0) openInvites.splice(i, 1);
    if (e.kind === "project.architect-invited") {
      const p = projectOf(e.projectId);
      if (p?.team.architects.includes(e.personId)) continue;
      openInvites.push({ projectId: e.projectId, personId: e.personId, by: e.by, at: e.at, note: e.note });
    }
  }
  const architectTeam = (projectId: ProjectId): ArchitectTeam => {
    const p = projectOf(projectId);
    const members: ArchitectMember[] = (p?.team.architects ?? []).map((personId) => {
      const added = [...inviteEvents].reverse().find((e) => e.kind === "project.architect-assigned" && e.projectId === projectId && e.personId === personId);
      return {
        personId,
        state: "assigned",
        since: added?.at ?? datePart(p?.onboardedOn ?? p?.signedOn ?? TODAY),
        by: added?.by ?? p?.team.head ?? "vikram",
      };
    });
    for (const inv of openInvites)
      if (inv.projectId === projectId) members.push({ personId: inv.personId, state: "invited", since: inv.at, by: inv.by, note: inv.note });
    return { projectId, head: p?.team.head ?? "vikram", members };
  };
  const strengthsCache = new Map<PersonId, ArchitectStrengths>();
  const architectStrengths = (person: PersonId): ArchitectStrengths => {
    const cached = strengthsCache.get(person);
    if (cached) return cached;
    const worked = core.projects.filter((p) => p.phase !== "draft" && (p.team.head === person || p.team.architects.includes(person)));
    const categories: Partial<Record<CategoryId, number>> = {};
    for (const p of worked) categories[p.category] = (categories[p.category] ?? 0) + 1;
    const items = worked.flatMap((p) => core.designStages(p.id).flatMap((s) => s.items)).filter((d) => d.preparedBy === person);
    const approved = items.filter((d) => d.status === "approved");
    const blocks = courses[person] ?? [];
    // Accepted first time: the last 30 days' task blocks with no revision, else design items approved on version 1.
    const firstTime =
      blocks.length > 0
        ? Math.round((blocks.filter((b) => b.revisions === 0).length / blocks.length) * 100)
        : approved.length > 0
          ? Math.round((approved.filter((d) => d.versions.length <= 1 || d.versions[0]?.status === "approved").length / approved.length) * 100)
          : null;
    const accepted = core.tasks.filter((t) => t.person === person && t.acceptedAt && t.assignedOn);
    const turnaround = [
      ...blocks.map((b) => daysBetween(b.assigned, b.accepted)),
      ...accepted.map((t) => daysBetween(t.assignedOn, datePart(t.acceptedAt ?? t.assignedOn))),
    ];
    const row = performance.find((r) => r.person === person);
    const onTime = blocks.length > 0 ? Math.round((blocks.filter((b) => b.lateDays === 0).length / blocks.length) * 100) : null;
    const result: ArchitectStrengths = {
      personId: person,
      categories,
      liveProjects: worked.filter((p) => p.phase !== "handed-over").length,
      designsApproved: approved.length,
      firstTimePercent: firstTime,
      avgTurnaroundDays: average(turnaround) ?? row?.avgDays ?? null,
      onTimePercent: row?.onTimePercent ?? onTime,
    };
    strengthsCache.set(person, result);
    return result;
  };
  const CATEGORY_WORDS: Record<CategoryId, [string, string]> = {
    "city-villa": ["city villa", "city villas"],
    farmhouse: ["farmhouse", "farmhouses"],
    eco: ["eco home", "eco homes"],
    "cement-blocks": ["block home", "block homes"],
  };
  const suggestArchitects = (projectId: ProjectId): ArchitectSuggestion[] => {
    const p = projectOf(projectId);
    if (!p) return [];
    const team = architectTeam(projectId);
    return core.people
      .filter((x) => x.role === "architect" && x.active && !x.senior && x.id !== p.team.head)
      .map((x) => {
        const s = architectStrengths(x.id);
        const same = s.categories[p.category] ?? 0;
        const score =
          same * 2 +
          ((s.firstTimePercent ?? 50) / 100) * 3 +
          ((s.onTimePercent ?? 60) / 100) * 2 -
          s.liveProjects * 0.5 -
          (s.avgTurnaroundDays ?? 4) * 0.2;
        const reasons: string[] = [];
        if (same > 0) reasons.push(`${same} ${CATEGORY_WORDS[p.category][same === 1 ? 0 : 1]}`);
        if (s.firstTimePercent !== null) reasons.push(`${s.firstTimePercent}% first time`);
        if (s.onTimePercent !== null) reasons.push(`${s.onTimePercent}% on time`);
        reasons.push(`${s.liveProjects} live`);
        const member = team.members.find((m) => m.personId === x.id);
        return {
          personId: x.id,
          name: x.name,
          senior: x.senior,
          score: Math.round(score * 10) / 10,
          reasons,
          state: member?.state ?? null,
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  };

  // ---- Pictures ----
  const thumbnail = (projectId: ProjectId): ProjectThumbnail => {
    const set = [...events].reverse().find((e) => e.kind === "project.thumbnail-set" && e.projectId === projectId);
    if (set && set.kind === "project.thumbnail-set" && set.dataUrl) return { kind: "upload", src: set.dataUrl, setAt: set.at, setBy: set.by };
    return { kind: "drawing", category: projectOf(projectId)?.category ?? "city-villa" };
  };

  // ---- Approvals handled (for appraisals) ----
  const records: ApprovalRecord[] = [];
  const addRecord = (r: Omit<ApprovalRecord, "delayDays">) =>
    records.push({ ...r, delayDays: Math.max(0, daysBetween(datePart(r.since), datePart(r.doneAt))) });
  for (const r of clientRequests) {
    if (r.decidedAt && r.decidedBy)
      addRecord({ id: `req:${r.id}`, personId: r.decidedBy, kind: "request", what: r.title, projectId: r.projectId, since: r.raisedAt, doneAt: r.decidedAt });
    if (r.fee?.billedAt && r.fee.billedBy && r.fee.approvedAt)
      addRecord({ id: `fee:${r.id}`, personId: r.fee.billedBy, kind: "fee", what: `Bill ${r.title.toLowerCase()}`, projectId: r.projectId, since: r.fee.approvedAt, doneAt: r.fee.billedAt });
    if (r.escalation?.settledAt && r.escalation.settledBy)
      addRecord({ id: `esc:${r.id}`, personId: r.escalation.settledBy, kind: "escalation", what: r.title, projectId: r.projectId, since: r.escalation.at, doneAt: r.escalation.settledAt });
  }
  for (const p of live) {
    for (const m of p.milestones) {
      if (!m.raisedAt || m.n === 0) continue;
      const since = m.doneOn ?? m.dueOn;
      if (!since) continue;
      addRecord({ id: `letter:${p.id}:${m.n}`, personId: m.raisedBy ?? p.team.head, kind: "letter", what: `Letter, instalment ${m.n}`, projectId: p.id, since, doneAt: m.raisedAt });
    }
  }
  for (const s of core.paymentStages) {
    if (!s.clientPaidAt || !s.receivedAt) continue;
    const by = [...events].reverse().find((e) => e.kind === "receipt.recorded" && e.receipt.projectId === s.projectId && e.receipt.n === s.n)?.by ?? "divya";
    addRecord({ id: `receipt:${s.projectId}:${s.n}`, personId: by, kind: "receipt", what: `Confirm ${s.instalmentLabel}`, projectId: s.projectId, since: s.clientPaidAt, doneAt: s.receivedAt });
  }
  for (const r of core.requests) {
    const seen = events.find((e) => e.kind === "request.seen" && e.no === r.no);
    const seenAt = seen?.at ?? r.seenAt;
    if (!seenAt || r.queued) continue;
    addRecord({ id: `mr:${r.no}`, personId: seen?.by ?? r.procurement[0] ?? "prakash", kind: "material", what: `See ${r.no}`, projectId: r.projectId, since: r.sentAt, doneAt: seenAt });
  }
  for (const e of events) {
    if (e.kind !== "task.accepted" && e.kind !== "task.sent-back") continue;
    const task = core.tasks.find((t) => t.id === e.taskId);
    const submitted = [...events].reverse().find((x) => x.kind === "task.submitted" && x.taskId === e.taskId && x.at <= e.at)?.at ?? task?.submittedAt;
    if (!submitted) continue;
    addRecord({ id: `review:${e.id}`, personId: e.by, kind: "review", what: `Review ${task?.title.toLowerCase() ?? e.taskId}`, projectId: task?.projectId, since: submitted, doneAt: e.at });
  }
  for (const e of inviteEvents) {
    if (e.kind === "project.architect-invited") continue;
    const invite = inviteEvents.find((x) => x.kind === "project.architect-invited" && x.projectId === e.projectId && x.personId === e.personId && x.at <= e.at);
    if (!invite || e.by !== e.personId) continue;
    addRecord({ id: `invite:${e.id}`, personId: e.personId, kind: "invite", what: `Invite, ${projectOf(e.projectId)?.name ?? e.projectId}`, projectId: e.projectId, since: invite.at, doneAt: e.at });
  }
  const approvalRecords = (person: PersonId) =>
    records.filter((r) => r.personId === person).sort((a, b) => b.doneAt.localeCompare(a.doneAt));

  // ---- Attention ----
  const item = (base: Omit<AttentionItem, "waitedDays" | "overdueDays" | "tier" | "projectName" | "projectCode"> & { overdue?: boolean }): AttentionItem => {
    const p = base.projectId ? projectOf(base.projectId) : undefined;
    const waitedDays = waitedDaysOf(base.since);
    const overdueDays = base.due ? Math.max(0, daysBetween(datePart(base.due), TODAY)) : 0;
    const { overdue, ...rest } = base;
    return {
      ...rest,
      projectName: p?.name,
      projectCode: p?.code || undefined,
      waitedDays,
      overdueDays,
      tier: overdue ? "urgent" : tierOf(waitedDays, base.due),
    };
  };

  const attentionCache = new Map<PersonId, AttentionItem[]>();

  function buildAttention(person: PersonId): AttentionItem[] {
    const me = personOf(person);
    if (!me) return [];
    const out: AttentionItem[] = [];
    const has = (id: string) => out.some((x) => x.id === id);
    const push = (x: AttentionItem) => {
      if (!has(x.id)) out.push(x);
    };

    // ---- The client ----
    if (me.role === "client" || CLIENT_IDS.has(person)) {
      for (const id of CLIENT_PROJECTS) {
        for (const r of clientRequests) {
          if (r.projectId !== id || r.escalation?.open) continue;
          if (r.status === "fee-with-client" && r.fee)
            push(item({ id: `fee:${r.id}`, kind: "fee", what: `Approve the fee, ${r.title.toLowerCase()}`, projectId: id, since: r.waitingSince ?? r.fee.generatedAt, href: DESK_HREF.clientRequests, action: "Approve", figure: inr(r.fee.total), approval: true }));
        }
        for (const s of core.designStages(id))
          for (const d of s.items)
            if (d.status === "waiting" && d.uploadedAt)
              push(item({ id: `design:${id}:${d.id}`, kind: "design", what: `Review ${d.title.toLowerCase()}`, detail: d.version ? `Version ${d.version}` : undefined, projectId: id, since: d.uploadedAt, due: d.neededBy ?? undefined, href: DESK_HREF.clientDesign(d.id), action: "Review", approval: true }));
        for (const s of core.payments(id))
          if (s.state === "due" && s.letterRaisedAt)
            push(item({ id: `pay:${id}:${s.n}`, kind: "payment", what: `Pay ${s.instalmentLabel}`, projectId: id, since: s.letterRaisedAt, due: s.dueDate ?? undefined, href: DESK_HREF.clientPayments, action: "Pay", figure: inr(s.outstanding), approval: true }));
        for (const r of core.revisions)
          if (r.projectId === id && r.status === "with-client")
            push(item({ id: `rev:${r.id}`, kind: "approval", what: r.item, projectId: id, since: r.raisedAt, due: r.heldUntil, href: DESK_HREF.clientChanges, action: "Decide", approval: true }));
        const ask = npsAsk(id);
        if (ask) push(item({ id: `nps:${id}:${ask.milestone}`, kind: "nps", what: "Rate us", detail: ask.point, projectId: id, since: ask.since, href: DESK_HREF.client, action: "Rate", approval: false }));
      }
      return out;
    }

    // ---- Everyone on the staff: own tasks and reviews ----
    for (const t of core.tasks) {
      if (t.kind !== "work") continue;
      const open = t.status === "planned" || t.status === "in-progress" || t.status === "revision";
      if (t.person === person && open && t.dueAt && daysBetween(TODAY, datePart(t.dueAt)) <= 2)
        push(item({ id: `task:${t.id}`, kind: "task", what: t.title, detail: t.status === "revision" ? "Sent back" : undefined, projectId: t.projectId, since: t.assignedOn, due: datePart(t.dueAt), href: DESK_HREF.tasks(me.role), action: t.status === "planned" ? "Start" : "Log time", approval: false }));
      if (t.assignedBy === person && t.status === "submitted")
        push(item({ id: `task:${t.id}`, kind: "review", what: `Review ${firstOf(t.person)}'s ${t.short ?? t.title.toLowerCase()}`, projectId: t.projectId, since: t.submittedAt ?? t.assignedOn, href: DESK_HREF.tasks(me.role), action: "Review", approval: true }));
    }

    if (me.role === "architect") {
      // Client requests routed to this Project Head.
      for (const r of clientRequests) {
        if (r.waitingOn !== "head" || r.head !== person) continue;
        const asked = r.type === "hours" ? `${r.hours ?? 0} more hours, ${r.askedBy.split(" ")[0]}` : r.title;
        if (r.status === "fee-declined")
          push(item({ id: `req:${r.id}`, kind: "request", what: `Fee declined, ${asked}`, detail: "To BD or close", projectId: r.projectId, since: r.waitingSince ?? r.raisedAt, href: DESK_HREF.projectRequests(r.projectId), action: "Decide", approval: true }));
        else
          push(item({ id: `req:${r.id}`, kind: "request", what: asked, detail: r.feeWaived ? "Fee waived" : r.type === "hours" ? "Advisory hours" : "Design change", projectId: r.projectId, since: r.raisedAt, href: DESK_HREF.projectRequests(r.projectId), action: "Decide", approval: true }));
      }
      for (const inv of openInvites)
        if (inv.personId === person)
          push(item({ id: `invite:${inv.projectId}:${inv.personId}`, kind: "invite", what: `Join ${projectOf(inv.projectId)?.name ?? inv.projectId}`, detail: `From ${firstOf(inv.by)}`, projectId: inv.projectId, since: inv.at, href: DESK_HREF.projectTeam(inv.projectId), action: "Accept", approval: true }));
      for (const p of live) {
        if (p.team.head !== person) continue;
        for (const m of p.milestones)
          if (m.state === "done")
            push(item({ id: `pay:${p.id}:${m.n}`, kind: "payment", what: `Raise letter, instalment ${m.n}`, projectId: p.id, since: m.doneOn ?? m.dueOn, href: `/staff/projects/${p.id}/programme`, action: "Raise", figure: inr(m.total), approval: true }));
      }
      for (const p of live) {
        if (p.team.head !== person && !p.team.architects.includes(person)) continue;
        for (const s of core.designStages(p.id))
          for (const d of s.items)
            if (d.status === "modify" && d.preparedBy === person)
              push(item({ id: `design:${p.id}:${d.id}`, kind: "design", what: `Revise ${d.title.toLowerCase()}`, detail: d.comment, projectId: p.id, since: d.decidedAt ?? TODAY, href: DESK_HREF.architectDesigns, action: "Upload", approval: false }));
      }
      for (const d of core.siteDrawings)
        if (d.status === "awaited" && d.by === person)
          push(item({ id: `drawing:${d.id}`, kind: "drawing", what: `Send ${d.sheet}, ${d.title.toLowerCase()}`, projectId: d.projectId, since: addDays(d.neededBy, -7), due: d.neededBy, href: DESK_HREF.architectDesigns, action: "Send", approval: false }));
    }

    if (me.role === "architect" || me.role === "site") {
      for (const t of core.planTasksFor(person)) {
        if (!t.late || t.state === "done" || t.state === "locked" || t.track === "payment") continue;
        push(item({ id: `plan:${t.id}`, kind: "site", what: t.name, detail: `${t.daysLate} d late`, projectId: t.projectId, since: t.plannedStart, due: t.plannedEnd, href: me.role === "site" ? DESK_HREF.siteStage(t.projectId) : DESK_HREF.project(t.projectId), approval: false }));
      }
    }

    if (me.role === "finance" && me.access.includes("finance")) {
      for (const s of core.paymentStages)
        if (s.state === "client-paid" && s.clientPaidAt)
          push(item({ id: `confirm:${s.projectId}:${s.n}`, kind: "payment", what: `Confirm ${s.instalmentLabel}`, projectId: s.projectId, since: s.clientPaidAt, href: DESK_HREF.financeMoney, action: "Confirm", figure: inr(s.outstanding), approval: true }));
      for (const r of clientRequests)
        if (r.waitingOn === "finance" && r.fee)
          push(item({ id: `fee:${r.id}`, kind: "fee", what: `Bill ${r.title.toLowerCase()}`, projectId: r.projectId, since: r.fee.approvedAt ?? r.raisedAt, href: DESK_HREF.financeMoney, action: "Bill", figure: inr(r.fee.total), approval: true }));
    }

    if (me.role === "bd") {
      for (const p of prospects) {
        if (p.advisor !== person || p.status !== "active") continue;
        if (p.followUpDue)
          push(item({ id: `prospect:${p.id}`, kind: "prospect", what: `Follow up ${p.owner}`, detail: `${p.levelLabel}, ${p.idleDays} d quiet`, since: p.followUpOn, href: DESK_HREF.prospect(p.id), action: "Call", approval: false }));
        else if (toCall(p))
          push(item({ id: `prospect:${p.id}`, kind: "prospect", what: `Call ${p.owner}`, detail: "New enquiry", since: p.registeredAt, href: DESK_HREF.prospect(p.id), action: "Call", approval: false }));
      }
      for (const r of clientRequests)
        if (r.escalation?.open && r.escalation.to === person)
          push(item({ id: `esc:${r.id}`, kind: "escalation", what: r.title, detail: r.escalation.reason, projectId: r.projectId, since: r.escalation.at, href: DESK_HREF.escalations, action: "Settle", approval: true }));
      for (const x of pairs)
        if (!x.repliedAt && advisorOf(x.projectId) === person)
          push(item({ id: `msg:${x.projectId}:${x.at}`, kind: "message", what: `Reply to ${x.from}`, projectId: x.projectId, since: x.at, href: DESK_HREF.project(x.projectId), action: "Reply", approval: false }));
      for (const p of clientProjectsOf(person)) {
        const latest = latestAnswer(p.id);
        if (latest && latest.band === "detractor" && waitedDaysOf(latest.at) <= 30)
          push(item({ id: `nps:${p.id}:${latest.milestone}`, kind: "nps", what: `Call ${p.clients[0] ?? "the client"}`, detail: `Scored ${latest.score}`, projectId: p.id, since: latest.at, href: DESK_HREF.project(p.id), action: "Call", approval: false }));
      }
    }

    // ---- Everything else on the person's register, dated from what created it ----
    for (const t of core.turns(person, "all")) {
      if (has(t.id)) continue;
      let since = addDays(TODAY, -t.days);
      let kind: AttentionKind = "approval";
      let approval = false;
      // A raised letter the client says she has paid is already on the list as "Confirm".
      const letter = /^pay:([^:]+):(\d+)$/.exec(t.id);
      if (letter && has(`confirm:${letter[1]}:${letter[2]}`)) continue;
      if (t.id.startsWith("mr:")) {
        const r = core.requests.find((x) => `mr:${x.no}` === t.id);
        // With no PO yet it has waited since it reached procurement; after one, at its step.
        if (r) since = r.pos.length === 0 && r.sentAt ? r.sentAt : addDays(TODAY, -r.days);
        kind = "material";
        approval = r?.status === "New";
      } else if (t.id.startsWith("draft:")) {
        const d = core.drafts.find((x) => `draft:${x.id}` === t.id);
        if (d?.startedAt) since = d.startedAt;
        kind = "draft";
      } else if (t.id.startsWith("invite:")) {
        // A client's invitation is their own BD person's to chase.
        if (me.role === "bd" && t.projectId && advisorOf(t.projectId) !== person) continue;
        const p = t.projectId ? projectOf(t.projectId) : undefined;
        if (p?.invitedAt) since = p.invitedAt;
        kind = "invite";
      } else if (t.id.startsWith("pay:")) {
        kind = "payment";
        approval = true;
      } else if (t.id.startsWith("bill:")) {
        kind = "payment";
      } else if (t.id.startsWith("stage:")) {
        kind = "site";
      } else if (t.id.startsWith("ex:")) {
        kind = "exception";
      } else if (t.id.startsWith("rev:") || t.id.startsWith("sched:")) {
        kind = "approval";
      } else if (t.id.startsWith("task:")) {
        kind = "task";
      }
      push(item({ id: t.id, kind, what: t.title, detail: t.status?.[0], projectId: t.projectId, since, href: t.action?.href ?? t.href, action: t.action?.label, figure: t.figure, approval, overdue: t.overdue }));
    }
    return out;
  }

  const attentionFor = (person: PersonId): AttentionItem[] => {
    const cached = attentionCache.get(person);
    if (cached) return cached;
    const items = sortAttention(buildAttention(person));
    attentionCache.set(person, items);
    return items;
  };

  const projectsOfPerson = (person: PersonId): ProjectView[] => {
    const me = personOf(person);
    if (!me) return [];
    if (me.role === "client" || CLIENT_IDS.has(person)) return live.filter((p) => CLIENT_PROJECTS.includes(p.id));
    if (me.role === "admin") return live;
    if (me.role === "bd") return live.filter((p) => advisorOf(p.id) === person);
    if (me.role === "architect") return live.filter((p) => p.team.head === person || p.team.architects.includes(person));
    if (me.role === "site") return live.filter((p) => p.team.engineers.includes(person));
    return me.access.includes("finance") ? live : live.filter((p) => p.team.procurement.includes(person));
  };

  const projectsNeedingAttention = (person: PersonId): ProjectAttention[] => {
    const mine = attentionFor(person);
    return projectsOfPerson(person)
      .filter((p) => p.phase !== "handed-over")
      .map((p): ProjectAttention => {
        const reasons: ProjectAttention["reasons"] = [];
        let worst = 0;
        const plan = core.plan(p.id);
        const held = plan?.stages.find((s) => s.state === "held");
        if (held) {
          const days = waitedDaysOf(held.plannedStart);
          worst = Math.max(worst, days);
          reasons.push({ kind: "held", words: `Held for instalment ${held.milestone ?? ""}`.trim(), tone: "late" });
        }
        const late = plan?.tasks.filter((t) => t.late && t.state !== "done" && t.state !== "locked") ?? [];
        if (late.length > 0) {
          worst = Math.max(worst, ...late.map((t) => t.daysLate));
          reasons.push({ kind: "late", words: late.length === 1 ? "1 task late" : `${late.length} tasks late`, tone: "late" });
        }
        const overdue = core.payments(p.id).filter((s) => s.overdueDays > 0);
        for (const s of overdue) {
          worst = Math.max(worst, s.overdueDays);
          reasons.push({ kind: "overdue", words: `${s.instalmentLabel} overdue`, tone: "late" });
        }
        const latest = latestAnswer(p.id);
        if (latest && latest.band === "detractor") reasons.push({ kind: "nps", words: `NPS ${latest.score}`, tone: "late" });
        const escalated = clientRequests.filter((r) => r.projectId === p.id && r.escalation?.open);
        if (escalated.length > 0) {
          worst = Math.max(worst, ...escalated.map((r) => waitedDaysOf(r.escalation?.at ?? TODAY)));
          reasons.push({ kind: "escalation", words: "Escalated", tone: "late" });
        }
        const urgent = mine.filter((x) => x.projectId === p.id && x.tier === "urgent");
        if (urgent.length > 0) {
          worst = Math.max(worst, ...urgent.map((x) => x.waitedDays));
          reasons.push({ kind: "waiting", words: urgent.length === 1 ? "1 urgent" : `${urgent.length} urgent`, tone: "late" });
        }
        const tier: WaitTier =
          held || overdue.length > 0 || urgent.length > 0 || worst >= WAIT_DAYS.urgent ? "urgent" : reasons.length > 0 ? "waiting" : "normal";
        return { projectId: p.id, project: p, reasons, tier, worstDays: worst };
      })
      .filter((x) => x.reasons.length > 0)
      .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.reasons.length - a.reasons.length || b.worstDays - a.worstDays);
  };

  // ---- Appraisals ----
  const appraisal = (person: PersonId, period: { from: string; to: string; label?: string } = APPRAISAL_PERIOD): Appraisal => {
    const me = personOf(person);
    const inPeriod = (at: string) => datePart(at) >= period.from && datePart(at) <= period.to;
    const handled = approvalRecords(person).filter((r) => inPeriod(r.doneAt));
    const worst = handled.reduce<ApprovalRecord | null>((w, r) => (!w || r.delayDays > w.delayDays ? r : w), null);
    const now = attentionFor(person);
    const result: Appraisal = {
      personId: person,
      name: me?.name ?? person,
      role: me?.role ?? "bd",
      period,
      approvals: {
        handled: handled.length,
        avgDelayDays: average(handled.map((r) => r.delayDays)),
        worst,
        records: handled,
      },
      pending: {
        count: now.length,
        approvals: now.filter((x) => x.approval).length,
        urgent: now.filter((x) => x.tier === "urgent").length,
        oldestDays: now.reduce((max, x) => Math.max(max, x.waitedDays), 0),
      },
      overdueNow: now.filter((x) => x.tier === "urgent").length,
    };
    if (me?.role === "bd") {
      const mine = prospects.filter((p) => p.advisor === person);
      result.nps = npsForPerson(person);
      result.engagement = engagement(person);
      result.prospects = {
        registered: mine.filter((p) => inPeriod(p.registeredAt)).length,
        converted: mine.filter((p) => p.convertedAt && inPeriod(p.convertedAt)).length,
        dropped: mine.filter((p) => p.droppedAt && inPeriod(p.droppedAt)).length,
        active: mine.filter((p) => p.status === "active").length,
        followUpsDue: mine.filter((p) => p.followUpDue).length,
      };
    }
    if (me?.role === "architect") {
      const decided = clientRequests.filter((r) => r.decidedBy === person && r.decidedAt && inPeriod(r.decidedAt));
      result.requests = {
        decided: decided.length,
        avgTurnaroundDays: average(decided.map((r) => daysBetween(datePart(r.raisedAt), datePart(r.decidedAt ?? r.raisedAt)))),
        open: clientRequests.filter((r) => r.head === person && r.waitingOn === "head").length,
      };
      if (me.senior) {
        result.nps = npsForPerson(person);
        result.engagement = engagement(person);
      }
    }
    const row = performance.find((r) => r.person === person);
    if (row) result.tasks = { count: row.tasks, onTimePercent: row.onTimePercent, avgDays: row.avgDays };
    return result;
  };

  return {
    prospects,
    prospect: (id) => prospects.find((p) => p.id === id),
    prospectsFor: (person) => prospects.filter((p) => p.advisor === person),
    findDuplicate,
    nextProspectId,
    advisorOf,
    feeRule,
    quoteFee: (type, hours) => quoteFee(chargedHours(type, hours, feeRule), feeRule),
    clientRequests,
    clientRequest: (id) => clientRequests.find((r) => r.id === id),
    requestsFor: (projectId) => openFirst(clientRequests.filter((r) => r.projectId === projectId)),
    requestsForHead: (person) => openFirst(clientRequests.filter((r) => r.head === person)),
    escalationsFor,
    feesFor: (projectId) => clientRequests.filter((r) => r.projectId === projectId && r.fee).map((r) => r.fee as FeeView),
    nextFeeInvoiceNo: nextFeeInvoiceNo(clientRequests),
    npsAnswers,
    npsForProject,
    npsForPerson,
    npsAsk,
    npsFirm,
    engagement,
    approvalRecords,
    appraisal,
    attentionFor,
    projectsNeedingAttention,
    architectTeam,
    invitesFor: (person) => openInvites.filter((x) => x.personId === person),
    architectStrengths,
    suggestArchitects,
    thumbnail,
  };
}
