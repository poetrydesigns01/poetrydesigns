import type { Firm, LetterView, ProjectView } from "@/lib/firm";
import type { Person, PersonId, ProjectId } from "@/lib/firm-data";
import { inr } from "@/lib/format";

// Small pieces the procurement and finance screens share: who may do what, and the money
// words. Every figure on these screens says whether it is before GST or with GST.

/** The accountant's work (money in, bills) needs finance access, which the admin gives. */
export function hasFinance(person: Person | undefined): boolean {
  return !!person && person.access.includes("finance");
}

/** Whether this person buys for this project: they mark its requests seen and link its POs. */
export function procuresFor(person: PersonId, project: ProjectView | undefined): boolean {
  return !!project && project.team.procurement.includes(person);
}

/** Whether this person buys for any project at all. */
export function procuresAny(person: PersonId, firm: Firm): boolean {
  return firm.projects.some((p) => p.team.procurement.includes(person));
}

/** "₹11,89,440 with GST". */
export function withGstWords(amount: number): string {
  return `${inr(amount)} with GST`;
}

/** "₹1,17,600 before GST". */
export function beforeGstWords(amount: number): string {
  return `${inr(amount)} before GST`;
}

const rateFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** A vendor's rate: small rates keep their paise ("₹68.00", "₹69.50"), large ones are whole ("₹390"). */
export function rateWords(rate: number): string {
  return rate < 100 ? rateFormat.format(rate) : inr(rate);
}

/** "per kg", "per bag", or "each" for things counted one by one. */
export function perUnit(unit: string): string {
  return unit === "each" || unit === "nos" ? "each" : `per ${unit}`;
}

/** Still to come on a letter, with GST. */
export function toCome(letter: LetterView): number {
  return Math.max(0, letter.total - letter.received);
}

/** Letters approved by the client and not yet fully received. */
export function approvedOpen(letters: LetterView[]): LetterView[] {
  return letters.filter((l) => l.state === "approved" || l.state === "part-paid");
}

/** Within the chosen project, or everything. */
export function inScope<T extends { projectId: ProjectId }>(items: T[], scope: ProjectId | "all"): T[] {
  return scope === "all" ? items : items.filter((item) => item.projectId === scope);
}

/** The first of a person's names, from a full name. */
export function firstOf(name: string): string {
  return name.split(" ")[0];
}

/** Whole rupees from what was typed: "8,50,000" and "850000" both give 850000. */
export function rupeesFrom(text: string): number {
  const cleaned = text.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return NaN;
  return Math.round(Number(cleaned));
}

/** A rate or a quantity from what was typed, keeping decimals. */
export function numberFrom(text: string): number {
  const cleaned = text.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return NaN;
  return Number(cleaned);
}
