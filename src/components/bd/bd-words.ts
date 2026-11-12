import { TODAY } from "@/lib/demo-data";
import type { DraftView, ProjectView } from "@/lib/firm";
import { formatDate } from "@/lib/format";

// Small sayings shared by the business development screens. Pure, so pages and drafts
// say the same thing the same way.

const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });

/** "2026-11-11" to "November". A date with an argument, so no clock is read. */
export function monthName(iso: string): string {
  return monthFormat.format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));
}

/** "2026-11" for the demo's day. */
export const THIS_MONTH = TODAY.slice(0, 7);

/** "1 client onboarded in November." */
export function onboardedWords(n: number): string {
  return `${n} ${n === 1 ? "client" : "clients"} onboarded in ${monthName(TODAY)}.`;
}

/**
 * Reads the pin out of a Google Maps link: `?q=13.139,77.487`, `query=` or `ll=`, or the
 * `@13.139,77.487,17z` form. Null when the link carries no pin.
 */
export function parseMaps(link: string): { lat: number; lng: number } | null {
  const text = link.trim();
  if (!text) return null;
  const query = /[?&](?:q|query|ll)=(-?\d{1,3}(?:\.\d+)?)\s*(?:,|%2C)\s*(-?\d{1,3}(?:\.\d+)?)/i.exec(text);
  const at = /@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/.exec(text);
  const match = query ?? at;
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** "Coordinates 13.1390, 77.4870". */
export function coordinateWords(lat: number, lng: number): string {
  return `Coordinates ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/** The pipeline word split for a turn margin: "Building" over "Milestone 4". */
export function phaseMargin(p: ProjectView): { margin: string; sub?: string } {
  const [head, ...rest] = p.stageWords.split(", ");
  const tail = rest.join(", ");
  return { margin: head, sub: tail ? tail.charAt(0).toUpperCase() + tail.slice(1) : undefined };
}

/** "Signed in 13 Jan 2026." or "Not signed in yet." */
export function signInWords(p: ProjectView): string {
  return p.clientSignedInOn ? `Signed in ${formatDate(p.clientSignedInOn)}.` : "Not signed in yet.";
}

/** The name a draft goes by: what step 1 calls it, or Kulkarni Eco Home for the seeded one. */
export function draftName(d: Pick<DraftView, "id" | "step1">): string {
  if (d.step1?.name) return d.step1.name;
  if (d.id === "kulkarni") return "Kulkarni Eco Home";
  const surname = d.step1?.clients[0]?.split(" ").slice(-1)[0];
  return surname ? `${surname} home` : "New project";
}

/** "Aditi and Mohan": the first names of the people on an agreement. */
export function firstNames(clients: string[]): string {
  const firsts = clients.map((name) => name.split(" ")[0]).filter(Boolean);
  if (firsts.length <= 1) return firsts[0] ?? "the client";
  return `${firsts.slice(0, -1).join(", ")} and ${firsts[firsts.length - 1]}`;
}

/** Every project BD onboarded and that is past drafting, newest first. */
export function pipeline(projects: ProjectView[]): ProjectView[] {
  return projects
    .filter((p) => p.phase !== "draft" && p.onboardedBy === "rohan")
    .sort((a, b) => (b.onboardedOn ?? "").localeCompare(a.onboardedOn ?? ""));
}
