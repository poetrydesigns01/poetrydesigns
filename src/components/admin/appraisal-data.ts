/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { APPRAISAL_PERIOD } from "@/lib/bd-data";
import { TODAY } from "@/lib/demo-data";
import type { Appraisal, ApprovalRecord } from "@/lib/desk";
import type { Person, PersonId } from "@/lib/firm-data";
import { addDays } from "@/lib/format";

// The periods an appraisal can cover, who is appraised, and the orders the team table sorts
// by. The figures themselves come from firm.appraisal (lib/desk.ts).

export type PeriodId = "cycle" | "quarter" | "year";

export type Period = { id: PeriodId; from: string; to: string; label: string };

export const PERIODS: Period[] = [
  { id: "cycle", from: APPRAISAL_PERIOD.from, to: APPRAISAL_PERIOD.to, label: APPRAISAL_PERIOD.label },
  { id: "quarter", from: addDays(TODAY, -90), to: TODAY, label: "Last 90 days" },
  // India's financial year opens on 1 April.
  { id: "year", from: `${TODAY.slice(0, 4)}-04-01`, to: TODAY, label: "Year to date" },
];

export const PERIOD_OPTIONS = PERIODS.map((p) => ({ id: p.id, label: p.id === "cycle" ? "Cycle" : p.id === "quarter" ? "90 days" : "Year" }));

export function periodOf(id: string | null | undefined): Period {
  return PERIODS.find((p) => p.id === id) ?? PERIODS[0];
}

/** Everyone on the staff but the admin, who appraises them. */
export function appraised(people: Person[]): Person[] {
  return people.filter((p) => p.role !== "client" && p.role !== "admin");
}

/** The staff ids the report route opens. */
export const APPRAISED_IDS: PersonId[] = [
  "rohan",
  "kavya",
  "vikram",
  "lakshmi",
  "ananya",
  "karan",
  "suresh",
  "manjunath",
  "ravi",
  "prakash",
  "imran",
  "divya",
];

export type TeamSort = "delay" | "overdue" | "handled" | "name";

export const TEAM_SORTS: { id: TeamSort; label: string }[] = [
  { id: "delay", label: "Delay" },
  { id: "overdue", label: "Overdue" },
  { id: "handled", label: "Handled" },
  { id: "name", label: "A to Z" },
];

export function sortTeam(rows: Appraisal[], sort: TeamSort): Appraisal[] {
  const by = (a: Appraisal, b: Appraisal) => a.name.localeCompare(b.name);
  return [...rows].sort((a, b) => {
    if (sort === "delay") return (b.approvals.avgDelayDays ?? -1) - (a.approvals.avgDelayDays ?? -1) || by(a, b);
    if (sort === "overdue") return b.overdueNow - a.overdueNow || b.pending.oldestDays - a.pending.oldestDays || by(a, b);
    if (sort === "handled") return b.approvals.handled - a.approvals.handled || by(a, b);
    return by(a, b);
  });
}

/** "2.5 d", "–". */
export function daysWords(days: number | null | undefined): string {
  if (days === null || days === undefined) return "–";
  return `${Number.isInteger(days) ? days : days.toFixed(1)} d`;
}

/** An answer slower than this many days reads in brick. */
export const SLOW_DAYS = 5;

export const KIND_WORDS: Record<ApprovalRecord["kind"], string> = {
  request: "Client request",
  fee: "Fee billed",
  escalation: "Escalation",
  letter: "Demand letter",
  material: "Material request",
  receipt: "Payment confirmed",
  review: "Task review",
  invite: "Invitation",
};

export const ROLE_WORDS: Record<Person["role"], string> = {
  client: "Client",
  bd: "Business development",
  architect: "Architect",
  site: "Site",
  finance: "Procurement and finance",
  admin: "Admin",
};
