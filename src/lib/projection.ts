import {
  changes,
  credits as iyerCredits,
  designs,
  milestones,
  project,
  TODAY,
  withGst,
  type Change,
  type ChangeStatus,
  type Design,
  type DesignStatus,
  type DesignVersion,
  type Milestone,
} from "./demo-data";
import {
  LOW_HOURS,
  designSummaries,
  people,
  projects,
  seedAdditions,
  seedLog,
  seedPosts,
  seedReceipts,
  seedTasks,
  type CreditAddition,
  type FirmEvent,
  type LogEntry,
  type PersonId,
  type PhotoKind,
  type Pool,
  type Post,
  type ProjectId,
  type Receipt,
} from "./firm-data";
import {
  addDays,
  datePart,
  dayCount,
  formatDate,
  formatShortDate,
  hours,
  inr,
  inrDelta,
  listWords,
} from "./format";

// One pure function turns the decisions made in this tab into everything a screen
// shows: totals, dates, counts and sentences. No component works these out itself,
// and nothing here reads a clock or touches storage.

export type MoneyState = "paid" | "approved" | "due" | "under-way" | "to-come";
export type StoreyGroup = "ground" | "first" | "second";

/** One half of a milestone split in two, once she has approved the split. */
export type ProjectedPart = {
  /** "5a", "5b". */
  label: string;
  percent: number;
  /** Before GST. */
  amount: number;
  /** With GST. */
  total: number;
  money: MoneyState;
};

export type ProjectedMilestone = Milestone & {
  /** "approved" is a raised milestone she has approved and the bank has not yet paid in full. */
  money: MoneyState;
  /** Before GST, including changes approved in this tab. */
  agreedAmount: number;
  /** agreedAmount plus what the changes being tried would add. */
  triedAmount: number;
  /** With GST. */
  agreedTotal: number;
  /** With GST. */
  triedTotal: number;
  /** Short names of tried changes landing here, e.g. ["the jacuzzi"]. */
  triedBy: string[];
  /** With GST: everything recorded as received for this milestone. */
  received: number;
  /** Set once a split of this milestone is approved. */
  parts?: [ProjectedPart, ProjectedPart];
};

export type ProjectedChange = Change & { trying: boolean; addendum?: string };

export type ProjectedDesign = { design: Design; latest: DesignVersion; status: DesignStatus; date: string };

export type WaitingItem = {
  key: string;
  kind: "stage" | "payment" | "schedule" | "drawing" | "specification" | "change";
  title: string;
  detail: string;
  figure?: string;
  href: string;
  cta: string;
  anchor: string;
  group: StoreyGroup;
  /** Why it cannot be approved yet, when something else must come first. */
  blockedBy?: string;
};

export type AgreedItem = {
  key: string;
  title: string;
  detail: string;
  date: string;
  figure?: string;
  href?: string;
  anchor: string;
  group: StoreyGroup;
};

export type Session = {
  id: string;
  date: string;
  phase: string;
  topic: string;
  with: string;
  hours: number;
};

export type ScheduleChange = {
  n: number;
  /** Percents of the contract value, e.g. [5, 5]. */
  parts: [number, number];
  /** Before GST. */
  amounts: [number, number];
  /** With GST. */
  totals: [number, number];
  reason: string;
  by: string;
  at: string;
  status: "waiting" | "approved" | "changes-asked";
  comment?: string;
};

export type Projection = {
  changes: ProjectedChange[];
  pending: ProjectedChange[];
  tried: ProjectedChange[];
  /** Approved value before GST: 87,10,000 at the start. */
  agreedValue: number;
  /** agreedValue plus the cost of the changes being tried. */
  triedValue: number;
  triedCost: number;
  triedDays: number;
  /** ISO date: the planned handover plus the delay of changes approved in this tab. */
  handoverAgreed: string;
  /** ISO date: handoverAgreed plus triedDays. */
  handoverTried: string;
  milestones: ProjectedMilestone[];
  /** The milestone still waiting for her approval, or null. */
  due: ProjectedMilestone | null;
  /** With GST, as agreed. */
  paid: number;
  total: number;
  stillToPay: number;
  designs: ProjectedDesign[];
  /** In this order: the stage, the payment, a schedule change, drawings and specifications, changes. */
  waiting: WaitingItem[];
  /** The agreement and everything approved since, oldest first. */
  agreed: AgreedItem[];
  /** The payment stop the site has reached: 3. */
  todayStop: number;
  trialSentence: string | null;
  /** The work behind the milestone that is raised and not yet paid in full. */
  stage: {
    n: number;
    doneOn: string;
    doneBy: string;
    acceptedAt: string | null;
    photos: PhotoKind[];
  } | null;
  scheduleChange: ScheduleChange | null;
  credits: {
    before: Pool;
    during: Pool;
    /** In the current pool. */
    left: number;
    low: boolean;
    /** Hours used beyond the current pool. */
    over: number;
    requested: { hours: number; at: string } | null;
    added: CreditAddition[];
    /** Newest first. */
    sessions: Session[];
  };
  /** Meera's approval log, newest first: the seed plus this tab. */
  log: LogEntry[];
  /** The Iyer thread, newest first: the seed plus this tab. */
  posts: Post[];
  receiptsFor(n: number): Receipt[];
  /** Anchor key to "YYYY-MM-DDTHH:mm" of her approval. */
  approvedAt: Record<string, string>;
};

type DesignDecision = {
  status: DesignStatus;
  comment?: string;
  note?: string;
  decidedOn: string;
  at?: string;
  /** The version decided; older saved decisions have none and mean the seed's last version. */
  version?: number;
};

/** The part of the demo state that derive() reads. */
export type DeriveInput = {
  designDecisions: Record<string, DesignDecision>;
  changeDecisions: Record<string, { status: ChangeStatus; comment?: string; note?: string; decidedOn: string; at?: string }>;
  paymentApproved: boolean;
  trying: string[];
  creditsRequested?: boolean;
  events?: FirmEvent[];
};

// Which floor of the house each mark belongs to. The positions are in house-model.ts.
const GROUPS: Record<string, StoreyGroup> = {
  "pay:3": "first",
  "design:terrace-plan": "second",
  "design:kitchen-spec": "ground",
  "design:first-floor-plan": "first",
  "design:ground-floor-plan": "ground",
  "design:front-elevation": "ground",
  "change:terrace-jacuzzi": "second",
  "change:living-glazing": "ground",
  "change:study-room": "first",
  agreement: "ground",
};

/** The floor an anchor sits on. Marks nobody has placed yet fall to the ground floor. */
export function groupOf(anchor: string): StoreyGroup {
  return GROUPS[anchor] ?? "ground";
}

/** The floor a milestone's work belongs to on a city villa, or null when it is not one floor. */
function storeyOfMilestone(n: number): StoreyGroup | null {
  if (n === 1 || n === 2) return "ground";
  if (n === 3) return "first";
  if (n === 4) return "second";
  return null;
}

const MONEY: Record<Milestone["status"], MoneyState> = {
  paid: "paid",
  "awaiting-approval": "due",
  "in-progress": "under-way",
  upcoming: "to-come",
};

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** What a set of changes adds to one milestone, before GST. */
function landing(list: Change[], milestoneId: number): number {
  return sum(list.flatMap((change) => change.lands.filter((l) => l.milestoneId === milestoneId).map((l) => l.amount)));
}

/** The milestone that was waiting for her approval when the demo starts: 3. */
const SEED_DUE = milestones.find((m) => m.status === "awaiting-approval")?.id ?? -1;

const CLIENTS = new Set<PersonId>(["meera", "arjun"]);

// ---- The record: events read as log lines and thread posts ----

/** A person's full name, for people added in the demo too. */
export function personName(id: PersonId, events: FirmEvent[] = []): string {
  const added = events.find((e) => e.kind === "person.added" && e.person.id === id);
  if (added && added.kind === "person.added") return added.person.name;
  return people.find((p) => p.id === id)?.name ?? id;
}

function projectName(id: ProjectId): string {
  return projects.find((p) => p.id === id)?.name ?? id;
}

function milestoneOf(projectId: ProjectId, n: number) {
  return projects.find((p) => p.id === projectId)?.milestones.find((m) => m.n === n);
}

/** "0034" from "PD/DL/2026-27/0034". */
export function letterShort(letterNo: string): string {
  return letterNo.slice(-4);
}

function taskTitle(taskId: string, events: FirmEvent[]): { title: string; person: PersonId; short?: string } | null {
  const seed = seedTasks.find((t) => t.id === taskId);
  if (seed) return { title: seed.title, person: seed.person, short: seed.short };
  const assigned = events.find((e) => e.kind === "task.assigned" && e.task.id === taskId);
  return assigned && assigned.kind === "task.assigned"
    ? { title: assigned.task.title, person: assigned.task.person, short: assigned.task.short }
    : null;
}

function designTitle(projectId: ProjectId, designId: string): string {
  if (projectId === "iyer") return designs.find((d) => d.id === designId)?.title ?? designId;
  return designSummaries.find((d) => d.designId === designId)?.title ?? designId;
}

/** One event as a line in the audit trail, or null for events that are not recorded there. */
export function logEntryOf(event: FirmEvent, events: FirmEvent[]): LogEntry | null {
  const name = (id: PersonId) => personName(id, events);
  const base = {
    id: `log-${event.id}`,
    at: event.at,
    by: event.by,
    kind: (CLIENTS.has(event.by) ? "client" : "staff") as LogEntry["kind"],
  };
  const total = (projectId: ProjectId, n: number) => withGst(milestoneOf(projectId, n)?.amount ?? 0).total;
  const stageName = (projectId: ProjectId, n: number) => lowerFirst(milestoneOf(projectId, n)?.name ?? `milestone ${n}`);
  switch (event.kind) {
    case "request.raised":
      return {
        ...base,
        projectId: event.projectId,
        action: event.queued ? `Raised ${event.no} with no signal; it waits to be sent.` : `Raised ${event.no}.`,
      };
    case "request.sent":
      return { ...base, action: `Sent ${event.no} once the signal came back.` };
    case "request.seen":
      return { ...base, action: `Marked ${event.no} seen.` };
    case "po.linked":
      return {
        ...base,
        projectId: event.po.projectId,
        action: `Uploaded ${event.po.no} for ${event.po.requestNo}.`,
      };
    case "request.delivered":
      return { ...base, action: `Marked ${event.no} delivered.` };
    case "stage.done":
      return {
        ...base,
        projectId: event.projectId,
        action: `Marked ${projectName(event.projectId)} milestone ${event.n} done, with ${
          event.photos.length === 1 ? "1 photo" : `${event.photos.length} photos`
        }.`,
        detail: event.note || undefined,
      };
    case "payment.raised":
      return {
        ...base,
        projectId: event.projectId,
        action: `Raised the payment for ${projectName(event.projectId)} milestone ${event.n}, letter ${event.letterNo}.`,
      };
    case "stage.accepted":
      return { ...base, projectId: event.projectId, action: `Accepted the ${stageName(event.projectId, event.n)} as finished.` };
    case "payment.approved":
      return {
        ...base,
        projectId: event.projectId,
        action: `Approved payment for milestone ${event.n}, ${inr(total(event.projectId, event.n))}.`,
        detail: event.note || undefined,
      };
    case "receipt.recorded": {
      const { receipt } = event;
      const letter = milestoneOf(receipt.projectId, receipt.n)?.letterNo;
      return {
        ...base,
        projectId: receipt.projectId,
        action: `Recorded ${inr(receipt.amount)} from the ${receipt.source === "bank" ? "bank" : "client"} for ${projectName(
          receipt.projectId,
        )} ${letter ? `letter ${letterShort(letter)}` : `milestone ${receipt.n}`}.`,
      };
    }
    case "bill.entered":
      return {
        ...base,
        projectId: event.projectId,
        action: `Entered bill ${event.billNo}${event.poNo ? ` for ${event.poNo}` : ""}, ${inr(event.amount)} before GST.`,
      };
    case "revision.raised":
      return {
        ...base,
        projectId: event.projectId,
        action: `Raised a cost revision on ${projectName(event.projectId)}, ${lowerFirst(event.item)}, ${inrDelta(
          event.amount,
        )} and ${dayCount(event.days)}.`,
      };
    case "schedule.proposed":
      return {
        ...base,
        projectId: event.projectId,
        action: `Proposed paying milestone ${event.n} in two parts.`,
        reason: event.reason,
      };
    case "schedule.decided":
      return {
        ...base,
        projectId: event.projectId,
        action:
          event.status === "approved"
            ? `Approved paying milestone ${event.n} in two parts.`
            : `Asked for changes to the split of milestone ${event.n}.`,
        detail: event.comment || undefined,
      };
    case "milestone.revised":
      return {
        ...base,
        projectId: event.projectId,
        action: `Moved milestone ${event.n} from ${event.from} to ${event.to}.`,
        reason: event.reason,
      };
    case "estimate.approved":
      return {
        ...base,
        projectId: "iyer-cottage",
        action: "Approved the final estimate for Iyer Farm Cottage, Addendum 1.",
        detail: event.note || undefined,
      };
    case "cottage-schedule.approved":
      return { ...base, projectId: "iyer-cottage", action: "Approved the payment schedule for Iyer Farm Cottage." };
    case "credits.requested":
      return { ...base, projectId: event.projectId, action: `Asked for ${hours(event.hours)} more of advisory time.` };
    case "credits.added":
      return {
        ...base,
        projectId: event.addition.projectId,
        action: `Added ${hours(event.addition.hours)} to ${projectName(event.addition.projectId)} after ${inr(
          event.addition.amount,
        )} received.`,
        reason: event.addition.reason || undefined,
      };
    case "credits.edited":
      return {
        ...base,
        projectId: event.projectId,
        action: `Changed the ${event.pool === "before" ? "before construction" : "during construction"} hours on ${projectName(
          event.projectId,
        )} from ${event.from} to ${event.to}.`,
        reason: event.reason,
      };
    case "time.logged":
      return null;
    case "task.assigned":
      return {
        ...base,
        projectId: event.task.projectId,
        action: `Gave ${name(event.task.person)} a task, ${lowerFirst(event.task.title)}.`,
      };
    case "task.submitted":
    case "task.accepted":
    case "task.sent-back": {
      const task = taskTitle(event.taskId, events);
      const what = task ? lowerFirst(task.title) : event.taskId;
      const verb =
        event.kind === "task.submitted"
          ? `Submitted ${what}.`
          : event.kind === "task.accepted"
            ? `Accepted ${task ? `${name(task.person)}'s ` : ""}${task?.short ?? what}.`
            : `Sent ${what} back${task ? ` to ${name(task.person)}` : ""}.`;
      return { ...base, action: verb, detail: event.note || undefined };
    }
    case "design.uploaded":
      return {
        ...base,
        projectId: event.projectId,
        action: `Uploaded the ${lowerFirst(designTitle(event.projectId, event.designId))}, version ${event.version}.`,
      };
    case "design.decided":
      return {
        ...base,
        projectId: event.projectId,
        action:
          event.status === "approved"
            ? `Approved the ${lowerFirst(designTitle(event.projectId, event.designId))}, version ${event.version}.`
            : `Asked for changes to the ${lowerFirst(designTitle(event.projectId, event.designId))}, version ${event.version}.`,
        detail: event.comment || undefined,
      };
    case "change.decided": {
      const change = changes.find((c) => c.id === event.changeId);
      const short = change?.short ?? event.changeId;
      return {
        ...base,
        projectId: event.projectId,
        action:
          event.status === "approved"
            ? `Approved ${short}, ${inrDelta(change?.cost ?? 0)} and ${dayCount(change?.delayDays ?? 0)}.`
            : event.status === "changes-asked"
              ? `Asked for changes to the price of ${short}.`
              : `Declined ${short}.`,
        detail: event.comment || undefined,
      };
    }
    case "post.added":
      return { ...base, projectId: event.post.projectId, action: `Posted in the ${projectName(event.post.projectId)} thread.` };
    case "draft.saved":
      return {
        ...base,
        action: `Saved step ${event.step} of the ${event.draftId === "kulkarni" ? "Kulkarni Eco Home" : "new"} draft.`,
      };
    case "workspace.opened": {
      const opened = projects.find((p) => p.id === event.projectId);
      return {
        ...base,
        projectId: event.projectId,
        action: `Opened ${projectName(event.projectId)} and invited ${listWords(opened?.clients.slice(0, 1) ?? [])}.`,
      };
    }
    case "invite.resent": {
      const invited = projects.find((p) => p.id === event.projectId);
      return {
        ...base,
        projectId: event.projectId,
        action: `Sent the invite to ${invited?.clients[0] ?? "the client"} again.`,
      };
    }
    case "person.added":
      return { ...base, action: `Added ${event.person.name}, ${lowerFirst(event.person.title)}.`, reason: event.reason };
    case "person.changed":
      return { ...base, action: event.change, reason: event.reason };
    case "access.given":
      return {
        ...base,
        action: `Gave ${name(event.personId)} finance access on ${
          event.scope === "all" ? "all projects" : listWords(event.scope.map(projectName))
        }.`,
        reason: event.reason,
      };
    case "head.changed":
      return {
        ...base,
        projectId: event.projectId,
        action: `Made ${name(event.to)} Project Head of ${projectName(event.projectId)} in place of ${name(event.from)}.`,
        reason: event.reason,
      };
    case "member.added":
      return {
        ...base,
        action: `Added ${name(event.personId)} to ${event.team}${
          event.sites.length > 0 ? ` for ${listWords(event.sites.map(projectName))}` : ""
        }.`,
      };
    case "vendor.added":
      return { ...base, action: `Added vendor ${event.vendor.name}.` };
    case "catalogue.changed":
      return { ...base, action: event.change, reason: event.reason };
    case "template.changed":
      return { ...base, action: event.change };
    case "record.deleted":
      return { ...base, kind: "deleted", action: `Deleted ${event.what}.`, reason: event.reason };
  }
}

/** The audit trail: the seed and every event that is recorded there, newest first. */
export function recordLog(events: FirmEvent[]): LogEntry[] {
  const live = events.map((event) => logEntryOf(event, events)).filter((entry): entry is LogEntry => entry !== null);
  return newestFirst([...seedLog, ...live]);
}

/** Sorts by time, newest first. Entries made at the same minute keep the later one first. */
export function newestFirst<T extends { at: string }>(list: T[]): T[] {
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.at.localeCompare(a.item.at) || b.index - a.index)
    .map(({ item }) => item);
}

/** Every thread post on every project, newest first: the seed, posts made here and posts that events write. */
export function threadPosts(events: FirmEvent[]): Post[] {
  const live: Post[] = [];
  for (const event of events) {
    const id = `p-${event.id}`;
    const by = event.by;
    const at = event.at;
    switch (event.kind) {
      case "post.added":
        live.push(event.post);
        break;
      case "stage.done":
        live.push({
          id,
          projectId: event.projectId,
          by,
          at,
          text: event.note || `${milestoneOf(event.projectId, event.n)?.name ?? `Milestone ${event.n}`} is finished.`,
          photos: event.photos,
          storey: event.projectId === "iyer" ? storeyOfMilestone(event.n) : null,
          kind: "post",
        });
        break;
      case "design.uploaded":
        live.push({
          id,
          projectId: event.projectId,
          by,
          at,
          text: `${designTitle(event.projectId, event.designId)} version ${event.version} is up. ${event.note}`.trim(),
          photos: [],
          storey: event.projectId === "iyer" ? groupOf(`design:${event.designId}`) : null,
          kind: "version",
        });
        break;
      case "revision.raised":
        live.push({
          id,
          projectId: event.projectId,
          by,
          at,
          text: `Priced ${lowerFirst(event.item)}: ${inr(event.amount)} before GST and ${dayCount(
            event.days,
          )}. The revised specification ${event.specSheet} is in Changes.`,
          photos: [],
          storey: null,
          kind: "revision",
        });
        break;
      case "design.decided":
      case "change.decided":
      case "payment.approved":
      case "stage.accepted":
      case "schedule.decided":
      case "estimate.approved":
      case "cottage-schedule.approved": {
        const entry = logEntryOf(event, events);
        if (!entry) break;
        const anchor =
          event.kind === "design.decided"
            ? `design:${event.designId}`
            : event.kind === "change.decided"
              ? `change:${event.changeId}`
              : null;
        const projectId: ProjectId = event.kind === "cottage-schedule.approved" ? "iyer-cottage" : event.projectId;
        live.push({
          id,
          projectId,
          by,
          at,
          text: `${personName(by, events)} ${lowerFirst(entry.action)}`,
          photos: [],
          storey:
            projectId !== "iyer"
              ? null
              : anchor
                ? groupOf(anchor)
                : "n" in event
                  ? storeyOfMilestone(event.n)
                  : null,
          kind: "decision",
        });
        break;
      }
      default:
        break;
    }
  }
  return newestFirst([...seedPosts, ...live]);
}

/** Every receipt on every project: the seed, one "Earlier payment" per other paid milestone, and this tab's. */
export function allReceipts(events: FirmEvent[]): Receipt[] {
  const earlier: Receipt[] = [];
  for (const p of projects) {
    for (const m of p.milestones) {
      if (m.state !== "paid") continue;
      if (seedReceipts.some((r) => r.projectId === p.id && r.n === m.n)) continue;
      earlier.push({
        id: `r-${p.id}-${m.n}`,
        projectId: p.id,
        n: m.n,
        amount: withGst(m.amount).total,
        source: "client",
        reference: "Earlier payment",
        on: m.paidOn ?? "",
        by: "divya",
      });
    }
  }
  const live = events.flatMap((e) => (e.kind === "receipt.recorded" ? [e.receipt] : []));
  return [...seedReceipts, ...earlier, ...live];
}

/** Is the split of a milestone waiting, approved or sent back? The newest proposal wins. */
export function scheduleChangeOf(
  projectId: ProjectId,
  events: FirmEvent[],
  amountOf: (n: number) => number,
): ScheduleChange | null {
  let proposed: Extract<FirmEvent, { kind: "schedule.proposed" }> | null = null;
  let decided: Extract<FirmEvent, { kind: "schedule.decided" }> | null = null;
  for (const e of events) {
    if (e.kind === "schedule.proposed" && e.projectId === projectId) {
      proposed = e;
      decided = null;
    } else if (e.kind === "schedule.decided" && proposed && e.projectId === projectId && e.n === proposed.n) {
      decided = e;
    }
  }
  if (!proposed) return null;
  const whole = amountOf(proposed.n);
  const [first, second] = proposed.parts;
  const firstAmount = Math.round((whole * first) / (first + second));
  const amounts: [number, number] = [firstAmount, whole - firstAmount];
  return {
    n: proposed.n,
    parts: proposed.parts,
    amounts,
    totals: [withGst(amounts[0]).total, withGst(amounts[1]).total],
    reason: proposed.reason,
    by: personName(proposed.by, events),
    at: proposed.at,
    status: decided ? decided.status : "waiting",
    comment: decided?.comment,
  };
}

/** The newest version of an Iyer design, counting versions uploaded in this tab. */
export function latestVersionOf(designId: string, events: FirmEvent[] = []): number {
  const design = designs.find((d) => d.id === designId);
  const seedLast = design ? design.versions[design.versions.length - 1].version : 0;
  return events.reduce(
    (latest, e) =>
      e.kind === "design.uploaded" && e.projectId === "iyer" && e.designId === designId ? Math.max(latest, e.version) : latest,
    seedLast,
  );
}

/** Her approvals before the demo, by anchor. */
const SEED_APPROVED: Record<string, string> = {
  agreement: "2026-01-14T18:20",
  "design:ground-floor-plan": "2026-02-14T21:10",
  "design:first-floor-plan": "2026-03-02T20:45",
  "design:front-elevation": "2026-03-20T19:05",
  "change:study-room": "2026-03-28T20:05",
  "pay:1": "2026-05-25T18:40",
  "pay:2": "2026-08-20T21:02",
};

export function derive(state: DeriveInput): Projection {
  const events = state.events ?? [];
  const iyerEvents = events.filter((e) => !("projectId" in e) || e.projectId === "iyer");

  // Addenda are numbered in the order she approved them, which is the order the decisions
  // were recorded in, so a number that has been given out never changes afterwards.
  const firstAddendum = changes.filter((change) => change.addendum).length + 1;
  const approvedInOrder = Object.keys(state.changeDecisions).filter(
    (id) =>
      state.changeDecisions[id].status === "approved" && changes.find((c) => c.id === id)?.status === "pending",
  );
  // Changes, with the decisions made in this tab applied.
  const projectedChanges: ProjectedChange[] = changes.map((change) => {
    const decision = state.changeDecisions[change.id];
    const status = decision?.status ?? change.status;
    const place = approvedInOrder.indexOf(change.id);
    return {
      ...change,
      ...decision,
      addendum: place < 0 ? change.addendum : `Addendum ${firstAddendum + place}`,
      trying: status === "pending" && state.trying.includes(change.id),
    };
  });
  const pending = projectedChanges.filter((change) => change.status === "pending");
  const tried = pending.filter((change) => change.trying);
  // The sample milestone amounts already hold every change that was approved before today.
  const approvedHere = projectedChanges.filter(
    (change) => change.status === "approved" && changes.find((c) => c.id === change.id)?.status === "pending",
  );

  const agreedValue = sum(milestones.map((m) => m.amount)) + sum(approvedHere.map((change) => change.cost));
  const triedCost = sum(tried.map((change) => change.cost));
  const triedDays = sum(tried.map((change) => change.delayDays));
  const handoverAgreed = addDays(project.handoverOn, sum(approvedHere.map((change) => change.delayDays)));
  const handoverTried = addDays(handoverAgreed, triedDays);

  const receipts = allReceipts(events).filter((r) => r.projectId === "iyer");
  const receiptsFor = (n: number) => receipts.filter((r) => r.n === n);
  const find = <K extends FirmEvent["kind"]>(kind: K, n: number) =>
    iyerEvents.find((e): e is Extract<FirmEvent, { kind: K }> => e.kind === kind && "n" in e && e.n === n);

  const agreedAmountOf = (id: number) =>
    (milestones.find((m) => m.id === id)?.amount ?? 0) + landing(approvedHere, id);
  const scheduleChange = scheduleChangeOf("iyer", iyerEvents, agreedAmountOf);

  const projectedMilestones: ProjectedMilestone[] = milestones.map((milestone) => {
    const agreedAmount = agreedAmountOf(milestone.id);
    const triedAmount = agreedAmount + landing(tried, milestone.id);
    const agreedTotal = withGst(agreedAmount).total;
    const raisedEvent = find("payment.raised", milestone.id);
    // The waiting milestone's approval is also kept in `paymentApproved`, which the same
    // write sets; both are needed before it counts.
    const approvedEvent =
      milestone.id === SEED_DUE && !state.paymentApproved ? undefined : find("payment.approved", milestone.id);
    const doneEvent = find("stage.done", milestone.id);
    const acceptedEvent = find("stage.accepted", milestone.id);
    const raised = milestone.status === "paid" || milestone.status === "awaiting-approval" || !!raisedEvent;
    const approved =
      milestone.status === "paid" ||
      (milestone.id === SEED_DUE ? state.paymentApproved : !!approvedEvent);
    const mine = receiptsFor(milestone.id);
    const received = sum(mine.map((r) => r.amount));
    let money: MoneyState = MONEY[milestone.status];
    if (raised) money = received >= agreedTotal ? "paid" : approved ? "approved" : "due";
    const projected: ProjectedMilestone = {
      ...milestone,
      workCompletedOn: milestone.workCompletedOn ?? (doneEvent ? datePart(doneEvent.at) : undefined),
      letterNo: milestone.letterNo ?? raisedEvent?.letterNo,
      letterIssuedOn: milestone.letterIssuedOn ?? (raisedEvent ? datePart(raisedEvent.at) : undefined),
      raisedAt: milestone.raisedAt ?? raisedEvent?.at,
      raisedBy: milestone.raisedBy ?? (raisedEvent ? personName(raisedEvent.by, events) : undefined),
      acceptedAt: milestone.acceptedAt ?? acceptedEvent?.at,
      approvedAt: milestone.approvedAt ?? approvedEvent?.at,
      paidOn: milestone.paidOn ?? (money === "paid" && mine.length > 0 ? mine[mine.length - 1].on : undefined),
      money,
      agreedAmount,
      triedAmount,
      agreedTotal,
      triedTotal: withGst(triedAmount).total,
      triedBy: tried.filter((change) => change.lands.some((l) => l.milestoneId === milestone.id)).map((c) => c.short),
      received,
    };
    if (scheduleChange?.status === "approved" && scheduleChange.n === milestone.id) {
      const half = (i: 0 | 1): ProjectedPart => ({
        label: `${milestone.id}${i === 0 ? "a" : "b"}`,
        percent: (milestone.percent * scheduleChange.parts[i]) / (scheduleChange.parts[0] + scheduleChange.parts[1]),
        amount: scheduleChange.amounts[i],
        total: scheduleChange.totals[i],
        money,
      });
      projected.parts = [half(0), half(1)];
    }
    return projected;
  });
  const due = projectedMilestones.find((milestone) => milestone.money === "due") ?? null;
  const paid = sum(projectedMilestones.filter((m) => m.money === "paid").map((m) => m.agreedTotal));
  const total = sum(projectedMilestones.map((m) => m.agreedTotal));

  // A version uploaded in this tab is added to its design and waits for her again. A
  // decision belongs to the version it was made on.
  const projectedDesigns: ProjectedDesign[] = designs.map((seedDesign) => {
    const uploads = iyerEvents.filter(
      (e): e is Extract<FirmEvent, { kind: "design.uploaded" }> =>
        e.kind === "design.uploaded" && e.designId === seedDesign.id,
    );
    const newest = uploads[uploads.length - 1];
    const design: Design =
      uploads.length === 0
        ? seedDesign
        : {
            ...seedDesign,
            neededBefore: newest.neededBefore ?? seedDesign.neededBefore,
            versions: [
              ...seedDesign.versions,
              ...uploads.map(
                (e): DesignVersion => ({
                  version: e.version,
                  uploadedOn: datePart(e.at),
                  uploadedBy: personName(e.by, events),
                  note: e.note,
                  status: "awaiting",
                }),
              ),
            ],
          };
    const last = design.versions[design.versions.length - 1];
    const seedLast = seedDesign.versions[seedDesign.versions.length - 1].version;
    const decision = state.designDecisions[design.id];
    const applies = decision && (decision.version ?? seedLast) === last.version;
    const latest: DesignVersion = applies
      ? { ...last, status: decision.status, decidedOn: decision.decidedOn, comment: decision.comment ?? last.comment }
      : last;
    return { design, latest, status: latest.status, date: latest.decidedOn ?? latest.uploadedOn };
  });

  // The stage behind the milestone that is raised and not yet paid in full.
  const open = projectedMilestones.filter((m) => m.money === "due" || m.money === "approved");
  const raisedNow = open[open.length - 1];
  const seedStage = raisedNow ? milestoneOf("iyer", raisedNow.id) : undefined;
  const doneHere = raisedNow ? find("stage.done", raisedNow.id) : undefined;
  const stage = raisedNow
    ? {
        n: raisedNow.id,
        doneOn: raisedNow.workCompletedOn ?? "",
        doneBy: doneHere
          ? personName(doneHere.by, events)
          : seedStage?.doneBy
            ? personName(seedStage.doneBy, events)
            : "",
        acceptedAt: raisedNow.acceptedAt ?? null,
        photos: doneHere?.photos ?? seedStage?.photos ?? [],
      }
    : null;

  const waiting: WaitingItem[] = [];
  for (const milestone of projectedMilestones) {
    if (milestone.money !== "due" || milestone.acceptedAt) continue;
    const anchor = `pay:${milestone.id}`;
    waiting.push({
      key: `stage:${milestone.id}`,
      kind: "stage",
      title: `Accept the ${lowerFirst(milestone.name)} as finished`,
      detail: `${
        milestone.workCompletedOn ? `The site marked it done on ${formatShortDate(milestone.workCompletedOn)}. ` : ""
      }Accepting it is a separate record from approving the payment.`,
      href: "/client/payments#stage",
      cta: "Review stage",
      anchor,
      group: storeyOfMilestone(milestone.id) ?? groupOf(anchor),
    });
  }
  if (due) {
    const anchor = `pay:${due.id}`;
    waiting.push({
      key: anchor,
      kind: "payment",
      title: `Payment for the ${lowerFirst(due.name)}`,
      detail: `${
        due.workCompletedOn ? `The work was finished on ${formatShortDate(due.workCompletedOn)}. ` : ""
      }Approving it writes the demand letter for your bank.`,
      figure: inr(due.agreedTotal),
      href: "/client/payments#due",
      cta: "Review payment",
      anchor,
      group: groupOf(anchor),
      blockedBy: due.acceptedAt ? undefined : "Accept the stage as finished first.",
    });
  }
  if (scheduleChange?.status === "waiting") {
    const anchor = `pay:${scheduleChange.n}`;
    waiting.push({
      key: `schedule:${scheduleChange.n}`,
      kind: "schedule",
      title: `A change to your schedule: milestone ${scheduleChange.n} in two parts`,
      detail: scheduleChange.reason,
      href: "/client/payments#schedule-change",
      cta: "Review change",
      anchor,
      group: groupOf(anchor),
    });
  }
  for (const { design, latest, status } of projectedDesigns) {
    if (status !== "awaiting") continue;
    const isDrawing = design.kind === "Drawing";
    waiting.push({
      key: design.anchor,
      kind: isDrawing ? "drawing" : "specification",
      title: `${design.title}, version ${latest.version}`,
      detail: `${latest.uploadedBy} uploaded it on ${formatShortDate(latest.uploadedOn)}.${
        design.neededBefore ? ` It is needed ${design.neededBefore}.` : ""
      }`,
      href: `/client/designs/${design.id}`,
      cta: isDrawing ? "Review drawing" : "Review specification",
      anchor: design.anchor,
      group: groupOf(design.anchor),
    });
  }
  for (const change of pending) {
    waiting.push({
      key: change.anchor,
      kind: "change",
      title: change.title,
      detail: `${change.delayDays > 0 ? `Adds ${dayCount(change.delayDays)}.` : "Adds no days."}${
        change.validUntil ? ` This price is held until ${formatShortDate(change.validUntil)}.` : ""
      }`,
      figure: inr(change.cost),
      href: "/client/changes#waiting",
      cta: "Review change",
      anchor: change.anchor,
      group: groupOf(change.anchor),
    });
  }

  const approvedAt: Record<string, string> = { ...SEED_APPROVED };
  for (const { design, status } of projectedDesigns) {
    const decision = state.designDecisions[design.id];
    if (status === "approved" && decision?.at) approvedAt[design.anchor] = decision.at;
  }
  for (const change of projectedChanges) {
    const decision = state.changeDecisions[change.id];
    if (change.status === "approved" && decision?.at) approvedAt[change.anchor] = decision.at;
  }
  for (const milestone of projectedMilestones) {
    if (milestone.approvedAt && !(`pay:${milestone.id}` in approvedAt)) approvedAt[`pay:${milestone.id}`] = milestone.approvedAt;
  }
  if (scheduleChange?.status === "approved") {
    const decided = iyerEvents.filter((e) => e.kind === "schedule.decided" && e.status === "approved");
    const last = decided[decided.length - 1];
    if (last) approvedAt[`schedule:${scheduleChange.n}`] = last.at;
  }

  const agreed: AgreedItem[] = [
    {
      key: "agreement",
      title: "Construction agreement",
      detail: `Signed on ${formatDate(project.agreementSignedOn)}.`,
      date: project.agreementSignedOn,
      anchor: "agreement",
      group: groupOf("agreement"),
    },
  ];
  for (const { design, latest, status, date } of projectedDesigns) {
    if (status !== "approved") continue;
    agreed.push({
      key: design.anchor,
      title: `${design.title}, version ${latest.version}`,
      detail: `Approved on ${formatDate(date)}.`,
      date,
      href: `/client/designs/${design.id}`,
      anchor: design.anchor,
      group: groupOf(design.anchor),
    });
  }
  for (const change of projectedChanges) {
    if (change.status !== "approved") continue;
    const date = change.decidedOn ?? change.raisedOn;
    agreed.push({
      key: change.anchor,
      title: change.addendum ? `${change.title}, ${change.addendum}` : change.title,
      detail: `Approved on ${formatDate(date)}. It added ${inr(change.cost)}.`,
      date,
      figure: inr(change.cost),
      href: "/client/changes",
      anchor: change.anchor,
      group: groupOf(change.anchor),
    });
  }
  // A payment approved in this tab is her word too, so it takes a seal where its peg stood,
  // and keeps it once the bank and she have paid.
  for (const milestone of projectedMilestones) {
    const approvedHereToo =
      milestone.id === SEED_DUE ? state.paymentApproved : !!find("payment.approved", milestone.id);
    if (!approvedHereToo || (milestone.money !== "approved" && milestone.money !== "paid")) continue;
    const anchor = `pay:${milestone.id}`;
    const on = milestone.approvedAt ? datePart(milestone.approvedAt) : TODAY;
    const banked = sum(receiptsFor(milestone.id).filter((r) => r.source === "bank").map((r) => r.amount));
    agreed.push({
      key: anchor,
      title: `Payment for the ${lowerFirst(milestone.name)}`,
      detail:
        milestone.money === "paid"
          ? `Approved on ${formatDate(on)}. Paid in full.`
          : milestone.received > 0
            ? `Approved on ${formatDate(on)}. Part paid: ${inr(banked || milestone.received)} from your ${
                banked ? "bank" : "own account"
              }.`
            : `Approved on ${formatDate(on)}. Waiting for your bank to release the payment.`,
      date: on,
      figure: inr(milestone.agreedTotal),
      href: "/client/payments",
      anchor,
      group: groupOf(anchor),
    });
  }
  // ISO dates sort as text. The sort is stable, so things approved on one day keep the order above.
  agreed.sort((a, b) => a.date.localeCompare(b.date));

  // The stop the site has reached is the last milestone whose work is finished. The house is
  // drawn for the seed's stops, so this does not move with stages marked done in the demo.
  const reached = milestones.filter((m) => m.status === "paid" || m.status === "awaiting-approval");
  const todayStop = reached.length > 0 ? reached[reached.length - 1].id : 0;

  const trialSentence =
    tried.length === 0
      ? null
      : `Trying, not approved: ${listWords(tried.map((change) => change.short))}. Your home would cost ${inr(
          agreedValue + triedCost,
        )} before GST and ${
          triedDays > 0 ? `handover would move to ${formatDate(handoverTried)}` : "the handover date would not move"
        }.`;

  // Advisory hours: the seed pools, hours bought, edits by the admin and consultations logged here.
  const before: Pool = { ...iyerCredits.preConstruction };
  const during: Pool = { ...iyerCredits.construction };
  const added: CreditAddition[] = seedAdditions.filter((a) => a.projectId === "iyer");
  const sessions: Session[] = iyerCredits.entries.map((entry, i) => ({ ...entry, id: `cr${i + 1}` }));
  let requested: { hours: number; at: string } | null =
    state.creditsRequested && !events.some((e) => e.kind === "credits.requested" && e.projectId === "iyer")
      ? { hours: 5, at: TODAY }
      : null;
  for (const e of iyerEvents) {
    if (e.kind === "credits.added" && e.addition.projectId === "iyer") {
      added.push(e.addition);
      (e.addition.pool === "before" ? before : during).granted += e.addition.hours;
      requested = null;
    } else if (e.kind === "credits.edited") {
      (e.pool === "before" ? before : during).granted = e.to;
    } else if (e.kind === "credits.requested") {
      requested = { hours: e.hours, at: e.at };
    } else if (e.kind === "time.logged" && e.entry.consultation && e.entry.projectId === "iyer") {
      during.used += e.entry.hours;
      sessions.push({
        id: e.entry.id,
        date: e.entry.date,
        phase: "Construction",
        topic: e.entry.topic ?? "Consultation",
        with: personName(e.entry.person, events),
        hours: e.entry.hours,
      });
    }
  }
  sessions.sort((a, b) => b.date.localeCompare(a.date));
  const left = during.granted - during.used;

  const log = recordLog(events).filter(
    (entry) => entry.projectId === "iyer" && (entry.kind === "client" || entry.id === "l1"),
  );

  return {
    changes: projectedChanges,
    pending,
    tried,
    agreedValue,
    triedValue: agreedValue + triedCost,
    triedCost,
    triedDays,
    handoverAgreed,
    handoverTried,
    milestones: projectedMilestones,
    due,
    paid,
    total,
    stillToPay: total - paid,
    designs: projectedDesigns,
    waiting,
    agreed,
    todayStop,
    trialSentence,
    stage,
    scheduleChange,
    credits: {
      before,
      during,
      left,
      low: left <= LOW_HOURS,
      over: Math.max(0, during.used - during.granted),
      requested,
      added,
      sessions,
    },
    log,
    posts: threadPosts(events).filter((post) => post.projectId === "iyer"),
    receiptsFor,
    approvedAt,
  };
}
