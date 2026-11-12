import { site as iyerSite, TODAY } from "@/lib/demo-data";
import type { Firm, MilestoneView, ProjectView, RequestView } from "@/lib/firm";
import {
  seedRequests,
  type CatalogueItem,
  type CatalogueUnit,
  type FirmEvent,
  type PersonId,
  type PhotoKind,
  type ProjectId,
} from "@/lib/firm-data";
import { daysBetween, formatShortDate } from "@/lib/format";
import { STOREYS } from "@/lib/house-model";
import type { StoreyGroup } from "@/lib/projection";

// The words and small sums the site engineer's screens share: which stage a site is at,
// how a material line is said in a sentence, and the quantities a thumb can pick.

export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The sites a person can request for and report on: the projects being built with them on the team. */
export function sitesFor(firm: Firm, person: PersonId): ProjectView[] {
  return firm.projects.filter((p) => p.phase === "building" && p.team.engineers.includes(person));
}

/**
 * A milestone's name as the project carries it. It was copied from the category template
 * when the project opened, so a farmhouse shows farmhouse stages, and a later change to
 * the template does not rename a site's stages under it.
 */
export function stageName(project: ProjectView, n: number): string {
  return project.milestones.find((m) => m.n === n)?.name ?? `Milestone ${n}`;
}

/** "the second floor and roof slab", for a sentence. */
export function stageWords(project: ProjectView, n: number): string {
  return `the ${lowerFirst(stageName(project, n))}`;
}

/** "second floor", for a short row title. */
export function stageShort(project: ProjectView, n: number): string {
  return lowerFirst(stageName(project, n)).split(/,| and /)[0].replace(/ structure$/, "");
}

/** The stage the site is working on now. */
export function underWay(project: ProjectView): MilestoneView | undefined {
  return project.milestones.find((m) => m.state === "under-way");
}

/** The last stage marked done, with or without its payment yet. */
export function lastDone(project: ProjectView): MilestoneView | undefined {
  return [...project.milestones].reverse().find((m) => m.n > 0 && m.doneOn && m.state !== "under-way" && m.state !== "to-come");
}

/**
 * One sentence on how the site stands. For Iyer Residence it is the slab curing, as the
 * client's house says; elsewhere it is the stage under way and the site's note on it.
 */
export function siteSentence(project: ProjectView): string {
  if (project.id === "iyer") {
    const day = daysBetween(iyerSite.curing.startedOn, TODAY);
    if (day >= 0 && day <= iyerSite.curing.days) return `Slab curing, day ${day} of ${iyerSite.curing.days}.`;
  }
  const m = underWay(project);
  if (!m) return `${project.name} has no stage under way.`;
  const name = stageName(project, m.n);
  return m.siteNote ? `${name} is under way. ${upperFirst(m.siteNote)}.` : `${name} is under way.`;
}

/** The storeys of the house mark that a milestone builds, to hatch on the project mark. */
export function storeysOf(project: ProjectView, n: number): number[] {
  if (project.category === "farmhouse") {
    if (n <= 1) return [0];
    if (n === 2) return [1];
    if (n === 3) return [2];
    return [];
  }
  return STOREYS.filter((storey) => storey.milestoneId === n).map((storey) => storey.id);
}

/** The floor a milestone is about, for a thread post. City villas only; null means the whole house. */
export function groupOf(project: ProjectView, n: number): StoreyGroup | null {
  if (project.category === "farmhouse") return null;
  return STOREYS.find((storey) => storey.milestoneId === n)?.group ?? null;
}

// ---- Material lines ----

/** "cement", "steel", "solid blocks", "PVC conduit": the material as it is said in a sentence. */
export function nounOf(item: CatalogueItem): string {
  const bare = item.name.replace(/\s*\(.*\)$/, "");
  return /^[A-Z]{2}/.test(bare) ? bare : lowerFirst(bare);
}

/** The unit as it is said after a number. */
export function unitWords(item: CatalogueItem): string {
  return item.unit === "nos" ? "" : item.unit;
}

/** "50 bags of cement, OPC 53 grade"; blocks are counted: "3,000 solid blocks, 6 inch". */
export function linePhrase(item: CatalogueItem, sub: string, qty: number): string {
  const n = qty.toLocaleString("en-IN");
  return item.unit === "nos" ? `${n} ${nounOf(item)}, ${sub}` : `${n} ${item.unit} of ${nounOf(item)}, ${sub}`;
}

/** "120 bags of cement", or "400 solid blocks" when the unit is a count. */
export function amountWords(item: CatalogueItem, qty: number): string {
  const n = qty.toLocaleString("en-IN");
  return item.unit === "nos" ? `${n} ${nounOf(item)}` : `${n} ${item.unit} of ${nounOf(item)}`;
}

/** "bags", or "solid blocks" when the unit is a count. */
export function howManyWords(item: CatalogueItem): string {
  return item.unit === "nos" ? nounOf(item) : item.unit;
}

/** The quantities a thumb can pick at once, by unit. Anything else goes in the field. */
export const PRESETS: Record<CatalogueUnit, number[]> = {
  bags: [10, 25, 50, 100],
  kg: [100, 250, 500, 1000],
  "cu ft": [100, 250, 500, 1000],
  nos: [500, 1000, 2000, 3000],
  "sq ft": [200, 500, 1000, 2000],
  lengths: [20, 50, 100, 200],
};

/** One press of the stepper, by unit. */
export const STEP: Record<CatalogueUnit, number> = {
  bags: 5,
  kg: 50,
  "cu ft": 50,
  nos: 100,
  "sq ft": 100,
  lengths: 10,
};

/** The number the next request will carry, worked out at the moment it is recorded. */
export function nextRequestNo(events: FirmEvent[]): string {
  const numbers = [...seedRequests.map((r) => r.no), ...events.flatMap((e) => (e.kind === "request.raised" ? [e.no] : []))];
  const top = numbers.reduce((max, no) => Math.max(max, Number(no.slice("MR-2026-".length)) || 0), 0);
  return `MR-2026-${String(top + 1).padStart(4, "0")}`;
}

/** "Steel, 500 of 850 kg ordered." or "120 bags of cement delivered 7 Nov.", for the board picture's words. */
export function requestShortWords(r: RequestView, item: CatalogueItem | undefined): string {
  const line = r.lines[0];
  const name = item ? upperFirst(nounOf(item)) : line.material;
  const unit = item ? unitWords(item) || nounOf(item) : line.unit;
  if (r.deliveredAt) {
    const day = r.deliveredAt.slice(0, 10);
    return `${item ? upperFirst(amountWords(item, line.qty)) : name} delivered ${day === TODAY ? "today" : formatShortDate(day)}.`;
  }
  if (r.queued) return `${name}, waiting to send.`;
  const ordered = r.ordered[line.id] ?? 0;
  if (ordered <= 0) return `${name}, ${line.qty.toLocaleString("en-IN")} ${unit} asked for, none ordered yet.`;
  if (ordered >= line.qty) return `${name}, all ${line.qty.toLocaleString("en-IN")} ${unit} ordered.`;
  return `${name}, ${ordered.toLocaleString("en-IN")} of ${line.qty.toLocaleString("en-IN")} ${unit} ordered.`;
}

/** The sample photos a site engineer can pick from in the demo, by project. */
export function photoChoices(projectId: ProjectId): PhotoKind[] {
  return projectId === "nair"
    ? ["tiles", "sand", "blocks", "columns", "steel", "curing"]
    : ["columns", "steel", "curing", "shuttering", "slab-pour", "blocks"];
}

export const PHOTO_WORDS: Record<PhotoKind, string> = {
  "slab-pour": "Slab pour",
  shuttering: "Shuttering",
  curing: "Curing",
  columns: "Column steel",
  blocks: "Block wall",
  tiles: "Tiling",
  steel: "Steel bundle",
  sand: "Sand heap",
};
