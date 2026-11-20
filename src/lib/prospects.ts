/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import {
  DUPLICATE_MONTHS,
  PROSPECT_IDLE_DAYS,
  seedProspects,
  type AssetClass,
  type Enquiry,
  type ProductPreference,
  type ProspectLevel,
  type SeedDeskEvent,
} from "./bd-data";
import { TODAY } from "./demo-data";
import type { CategoryId, DraftId, DraftStep1, FirmEvent, PersonId, ProjectId } from "./firm-data";
import { addDays, datePart, daysBetween } from "./format";
import type { Tone } from "./portal";

// Prospects before they sign up ("Under discussion"), worked out from the seed and the tab's
// events, and the duplicate rule: a phone or email held by a prospect or a customer
// registered in the last twelve months cannot be registered again. Pure; no clock.

/** The pre-conversion section's name. "Onboarding" is kept for customers who paid the sign-up. */
export const UNDER_DISCUSSION = "Under discussion";
export const ONBOARDING = "Onboarding";

export const PROSPECT_LEVELS: { level: ProspectLevel; label: string; name: string }[] = [
  { level: 0, label: "Level 0", name: "Qualified lead" },
  { level: 1, label: "Level 1", name: "Wants to meet" },
  { level: 2, label: "Level 2", name: "Engaged again" },
  { level: 3, label: "Level 3", name: "Discussing terms" },
];

export const SERVICE_WORDS = { design: "Design", turnkey: "Turnkey" } as const;
export const ASSET_WORDS: Record<AssetClass, string> = {
  villa: "Villa",
  farmhouse: "Farmhouse",
  commercial: "Commercial",
  resort: "Resort",
};
export const PRODUCT_WORDS: Record<ProductPreference, string> = { conventional: "Conventional", eco: "Eco Home" };
export const FACING_WORDS = { E: "East", W: "West", N: "North", S: "South" } as const;
export const CAPTURE_WORDS = { office: "At the office", online: "Online form", phone: "By phone" } as const;

export type ProspectStatus = "active" | "dropped" | "converted";

export type ProspectStep = {
  kind: "registered" | "level" | "edited" | "dropped" | "reopened" | "reassigned" | "converted";
  at: string;
  by: PersonId;
  level?: ProspectLevel;
  note?: string;
  from?: PersonId;
  to?: PersonId;
};

export type ProspectView = Enquiry & {
  id: string;
  advisor: PersonId;
  level: ProspectLevel;
  /** "Level 2". */
  levelLabel: string;
  /** "Engaged again". */
  levelName: string;
  status: ProspectStatus;
  /** "Level 2", "Dropped", "Signed up". */
  statusWords: string;
  tone: Tone;
  registeredAt: string;
  registeredOn: string;
  registeredBy: PersonId;
  /** The last level change (or the registration). */
  lastMoveAt: string;
  /** Days since `lastMoveAt`. */
  idleDays: number;
  /** Active with no level change for PROSPECT_IDLE_DAYS or more. */
  followUpDue: boolean;
  /** When the follow-up fell due: lastMoveAt plus PROSPECT_IDLE_DAYS. */
  followUpOn: string;
  droppedAt?: string;
  dropReason?: string;
  convertedAt?: string;
  draftId?: DraftId;
  projectId?: ProjectId;
  signUp?: { amount: number; on: string; reference: string };
  /** The layout code for the project code: given, or the layout name's initials. */
  layoutShort: string;
  /** The portal category the enquiry points to. */
  category: CategoryId;
  /** The phone and email stay held until this day. */
  holdsUntil: string;
  history: ProspectStep[];
};

/** The last ten digits of a phone number, or "" when it has fewer than ten. */
/** A new enquiry (level 0, not yet quiet) for its advisor to call. With a follow-up due, these are BD's Today rows. */
export function toCall(p: Pick<ProspectView, "status" | "level" | "followUpDue" | "idleDays">): boolean {
  return p.status === "active" && !p.followUpDue && p.level === 0 && p.idleDays < PROSPECT_IDLE_DAYS;
}

export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : "";
}

/** An email as it is matched: trimmed and lower case. */
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

/** The same day `months` months later (earlier when negative), "YYYY-MM-DD". */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = datePart(iso).split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** "Hesaraghatta Green Farms" gives "HGF" (letters and digits, upper case, at most 6). */
export function layoutInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, "")[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 6);
}

/** "40 x 60 ft" gives 200 (feet of boundary); 0 when the dimensions are not two numbers. */
export function perimeterOf(dimensions: string): number {
  const numbers = dimensions.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  return numbers.length === 2 ? Math.round(2 * (numbers[0] + numbers[1])) : 0;
}

/** The portal category an enquiry points to: an Eco Home, a farmhouse (or resort), else a city villa. */
export function categoryOf(enquiry: Pick<Enquiry, "assetClass" | "product">): CategoryId {
  if (enquiry.product === "eco") return "eco";
  if (enquiry.assetClass === "farmhouse" || enquiry.assetClass === "resort") return "farmhouse";
  return "city-villa";
}

/** What a converted prospect fills in on onboarding step 1. */
export function draftStep1Of(p: ProspectView): DraftStep1 {
  return {
    clients: [p.owner],
    email: p.email,
    phone: p.phone,
    address: p.locality ? `${p.locality}, Bengaluru` : "",
    layout: p.layoutShort,
    plotNo: p.plotNo ?? "",
    maps: "",
    lat: 0,
    lng: 0,
    plotPerimeter: perimeterOf(p.plotDimensions),
    underWay: false,
  };
}

type ProspectEvent = Extract<
  FirmEvent | SeedDeskEvent,
  {
    kind:
      | "prospect.registered"
      | "prospect.edited"
      | "prospect.level-set"
      | "prospect.dropped"
      | "prospect.reopened"
      | "prospect.reassigned"
      | "prospect.converted";
  }
>;

const PROSPECT_KINDS = new Set<string>([
  "prospect.registered",
  "prospect.edited",
  "prospect.level-set",
  "prospect.dropped",
  "prospect.reopened",
  "prospect.reassigned",
  "prospect.converted",
]);

/** Every prospect, the seed's and the tab's, newest registration first. */
export function deriveProspects(events: FirmEvent[]): ProspectView[] {
  type Working = {
    id: string;
    enquiry: Enquiry;
    advisor: PersonId;
    registeredAt: string;
    registeredBy: PersonId;
    level: ProspectLevel;
    lastMoveAt: string;
    dropped?: { at: string; reason: string };
    converted?: ProspectView["signUp"] & { at: string; draftId: DraftId };
    projectId?: ProjectId;
    history: ProspectStep[];
  };
  const list: Working[] = seedProspects.map((s) => {
    const history: ProspectStep[] = [{ kind: "registered", at: s.registeredAt, by: s.advisor, level: 0 }];
    for (const l of s.levels) history.push({ kind: "level", at: l.at, by: s.advisor, level: l.level, note: l.note });
    if (s.dropped) history.push({ kind: "dropped", at: s.dropped.at, by: s.advisor, note: s.dropped.reason });
    if (s.converted) history.push({ kind: "converted", at: s.converted.at, by: s.advisor });
    const lastLevel = s.levels[s.levels.length - 1];
    return {
      id: s.id,
      enquiry: { ...s.enquiry },
      advisor: s.advisor,
      registeredAt: s.registeredAt,
      registeredBy: s.advisor,
      level: lastLevel?.level ?? 0,
      lastMoveAt: lastLevel?.at ?? s.registeredAt,
      dropped: s.dropped,
      converted: s.converted ? { ...s.converted.signUp, at: s.converted.at, draftId: s.converted.draftId } : undefined,
      projectId: s.converted?.projectId,
      history,
    };
  });

  for (const e of events) {
    if (!PROSPECT_KINDS.has(e.kind)) continue;
    const ev = e as ProspectEvent;
    if (ev.kind === "prospect.registered") {
      if (list.some((p) => p.id === ev.prospect.id)) continue;
      list.push({
        id: ev.prospect.id,
        enquiry: { ...ev.prospect.enquiry },
        advisor: ev.prospect.advisor,
        registeredAt: ev.at,
        registeredBy: ev.by,
        level: 0,
        lastMoveAt: ev.at,
        history: [{ kind: "registered", at: ev.at, by: ev.by, level: 0 }],
      });
      continue;
    }
    const p = list.find((x) => x.id === ev.prospectId);
    if (!p) continue;
    if (ev.kind === "prospect.edited") {
      p.enquiry = { ...p.enquiry, ...ev.patch };
      p.history.push({ kind: "edited", at: ev.at, by: ev.by });
    } else if (ev.kind === "prospect.level-set") {
      if (p.dropped || p.converted) continue;
      p.level = ev.level;
      p.lastMoveAt = ev.at;
      p.history.push({ kind: "level", at: ev.at, by: ev.by, level: ev.level, note: ev.note });
    } else if (ev.kind === "prospect.dropped") {
      if (p.converted) continue;
      p.dropped = { at: ev.at, reason: ev.reason };
      p.history.push({ kind: "dropped", at: ev.at, by: ev.by, note: ev.reason });
    } else if (ev.kind === "prospect.reopened") {
      if (!p.dropped || p.converted) continue;
      p.dropped = undefined;
      p.lastMoveAt = ev.at;
      p.history.push({ kind: "reopened", at: ev.at, by: ev.by, note: ev.note });
    } else if (ev.kind === "prospect.reassigned") {
      p.history.push({ kind: "reassigned", at: ev.at, by: ev.by, from: ev.from, to: ev.to, note: ev.reason });
      p.advisor = ev.to;
      // A dropped lead given to someone comes back into discussion with them.
      if (p.dropped && !p.converted) {
        p.dropped = undefined;
        p.lastMoveAt = ev.at;
      }
    } else if (ev.kind === "prospect.converted") {
      if (p.converted || p.dropped) continue;
      p.converted = { ...ev.signUp, at: ev.at, draftId: ev.draftId };
      p.projectId = ev.draftId === "kulkarni" ? "kulkarni" : undefined;
      p.history.push({ kind: "converted", at: ev.at, by: ev.by });
    }
  }

  return list
    .map((p): ProspectView => {
      const status: ProspectStatus = p.converted ? "converted" : p.dropped ? "dropped" : "active";
      const meta = PROSPECT_LEVELS[p.level];
      const idleDays = Math.max(0, daysBetween(datePart(p.lastMoveAt), TODAY));
      const registeredOn = datePart(p.registeredAt);
      return {
        ...p.enquiry,
        id: p.id,
        advisor: p.advisor,
        level: p.level,
        levelLabel: meta.label,
        levelName: meta.name,
        status,
        statusWords: status === "converted" ? "Signed up" : status === "dropped" ? "Dropped" : meta.label,
        tone: status === "converted" ? "done" : status === "dropped" ? "locked" : p.level >= 2 ? "progress" : "waiting",
        registeredAt: p.registeredAt,
        registeredOn,
        registeredBy: p.registeredBy,
        lastMoveAt: p.lastMoveAt,
        idleDays,
        followUpDue: status === "active" && idleDays >= PROSPECT_IDLE_DAYS,
        followUpOn: addDays(datePart(p.lastMoveAt), PROSPECT_IDLE_DAYS),
        droppedAt: p.dropped?.at,
        dropReason: p.dropped?.reason,
        convertedAt: p.converted?.at,
        draftId: p.converted?.draftId,
        projectId: p.projectId,
        signUp: p.converted ? { amount: p.converted.amount, on: p.converted.on, reference: p.converted.reference } : undefined,
        layoutShort: p.enquiry.layoutCode || layoutInitials(p.enquiry.layoutName),
        category: categoryOf(p.enquiry),
        holdsUntil: addMonths(registeredOn, DUPLICATE_MONTHS),
        history: p.history,
      };
    })
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
}

/** Anyone who holds a phone and email: a prospect, or a customer (a project or an onboarding draft). */
export type ContactHolder = {
  kind: "prospect" | "customer";
  /** The prospect id, or the project id. */
  ref: string;
  name: string;
  phone: string;
  email: string;
  holder: PersonId;
  /** "YYYY-MM-DD". */
  since: string;
};

export type DuplicateMatch = {
  kind: "prospect" | "customer";
  ref: string;
  /** The person or family registered. */
  name: string;
  /** The BD person who holds them. */
  holder: PersonId;
  since: string;
  /** What matched. */
  on: "phone" | "email";
};

/**
 * The first holder whose phone (last 10 digits) or email (trimmed, lower case) matches and who
 * was registered within DUPLICATE_MONTHS before `at`. `except` skips a prospect being edited.
 */
export function findDuplicateIn(
  holders: ContactHolder[],
  phone: string,
  email: string,
  at: string = TODAY,
  except?: string,
): DuplicateMatch | null {
  const p = phoneKey(phone);
  const m = emailKey(email);
  if (!p && !m) return null;
  const from = addMonths(datePart(at), -DUPLICATE_MONTHS);
  const live = holders
    .filter((h) => h.ref !== except && h.since >= from && h.since <= datePart(at))
    .sort((a, b) => a.since.localeCompare(b.since));
  for (const h of live) {
    const on = p && phoneKey(h.phone) === p ? "phone" : m && emailKey(h.email) === m ? "email" : null;
    if (on) return { kind: h.kind, ref: h.ref, name: h.name, holder: h.holder, since: h.since, on };
  }
  return null;
}
