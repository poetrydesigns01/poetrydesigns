import { TODAY, withGst } from "./demo-data";
import type { Firm } from "./firm";
import { cottageEstimate, templateOf, type CategoryId, type ProjectId, type TemplateMilestone } from "./firm-data";
import { addDays, inr } from "./format";

// The estimate as pure arithmetic, so a server page, a client sheet and a check can all
// work it out. Part A is the house: built-up area at the category's rate, plus add-ons,
// with GST. Part B is the work around it, each item with its formula written out.

export type EstimateInput = {
  projectId: ProjectId;
  name: string;
  clients: string[];
  category: CategoryId;
  /** Built-up area in sq ft. */
  area: number;
  /** Before GST, per sq ft. */
  rate: number;
  addOns: { name: string; amount: number }[];
  /** Plot perimeter in ft, for the compound wall. */
  plotPerimeter: number;
  /** Before GST. A compound wall's amount is worked out from the perimeter. */
  partB: { id: string; name: string; amount: number }[];
  issuedOn: string;
  /** Payment amounts before GST, n 0 to 10, when they are not simply the percentages. */
  schedule?: number[];
  scheduleNote?: string;
  /** Milestones 1 to 10 from the category template as the admin left it. The seed template when absent. */
  milestones?: TemplateMilestone[];
};

export type EstimateRow = { name: string; formula: string; amount: number; gst: number; total: number };

export type EstimateResult = {
  partA: { base: number; addOns: number; amount: number; gst: number; total: number };
  partB: { items: EstimateRow[]; amount: number; gst: number; total: number };
  grandTotal: number;
  validUntil: string;
  schedule: { n: number; name: string; percent: number; amount: number; gst: number; total: number }[];
};

const WALL_RATE = 2000;
const WALL_FIXED = 300000;

function wallFormula(perimeter: number): string {
  return `${perimeter.toLocaleString("en-IN")} ft × ${inr(WALL_RATE)} + ${inr(WALL_FIXED)}`;
}

/** Works out an estimate. Pure: the same input always gives the same figures. */
export function estimate(input: EstimateInput): EstimateResult {
  const base = Math.round(input.area * input.rate);
  const addOns = input.addOns.reduce((sum, a) => sum + a.amount, 0);
  const a = withGst(base + addOns);
  const items: EstimateRow[] = input.partB
    .map((item) => {
      const wall = item.id === "compound";
      const amount = wall ? input.plotPerimeter * WALL_RATE + WALL_FIXED : item.amount;
      const formula = wall ? wallFormula(input.plotPerimeter) : inr(amount);
      return { name: item.name, formula, ...withGst(amount) };
    })
    .filter((item) => item.amount > 0);
  const b = withGst(items.reduce((sum, item) => sum + item.amount, 0));
  const rows = [{ n: 0, name: "Sign-up", percent: 5 }, ...(input.milestones ?? templateOf(input.category).milestones)];
  const schedule = rows.map((row, i) => {
    const amount = input.schedule?.[i] ?? Math.round((a.amount * row.percent) / 100);
    return { n: row.n, name: row.name, percent: row.percent, ...withGst(amount) };
  });
  return {
    partA: { base, addOns, amount: a.amount, gst: a.gst, total: a.total },
    partB: { items, amount: b.amount, gst: b.gst, total: b.total },
    grandTotal: a.total + b.total,
    validUntil: addDays(input.issuedOn, 15),
    schedule,
  };
}

/** The estimate as it stands for a project: the cottage's revised one, Kulkarni's draft, or as signed. */
export function estimateInputFor(projectId: ProjectId, firm: Firm): EstimateInput | null {
  const project = firm.project(projectId);
  if (projectId === "iyer-cottage") {
    return {
      projectId,
      name: project?.name ?? "Iyer Farm Cottage",
      clients: project?.clients ?? [],
      category: "farmhouse",
      area: cottageEstimate.partA.area,
      rate: cottageEstimate.partA.rate,
      addOns: cottageEstimate.addOns,
      plotPerimeter: project?.plotPerimeter ?? 420,
      partB: [
        { id: "compound", name: "Compound wall, gate and setback works", amount: 0 },
        { id: "sump", name: "Underground sump", amount: 150000 },
      ],
      issuedOn: cottageEstimate.issuedOn,
      schedule: cottageEstimate.schedule,
      scheduleNote: cottageEstimate.gapNote,
    };
  }
  if (projectId === "kulkarni") {
    const draft = firm.drafts.find((d) => d.id === "kulkarni");
    const s1 = draft?.step1;
    const s2 = draft?.step2;
    if (!s2) return null;
    return {
      projectId,
      name: s1?.name ?? project?.name ?? "Kulkarni Eco Home",
      clients: s1?.clients ?? project?.clients ?? [],
      category: s2.category,
      area: s2.area,
      rate: s2.rate,
      addOns: s2.addOns,
      plotPerimeter: s1?.plotPerimeter ?? project?.plotPerimeter ?? 0,
      partB: s2.partB,
      issuedOn: TODAY,
      // A new project starts from the template as it stands now, edits included.
      milestones: firm.templates.find((t) => t.id === s2.category)?.milestones,
    };
  }
  if (!project) return null;
  return {
    projectId,
    name: project.name,
    clients: project.clients,
    category: project.category,
    // As signed: the original value at the category's rate.
    area: Math.round(project.originalValue / project.ratePerSqFt),
    rate: project.ratePerSqFt,
    addOns: [],
    plotPerimeter: project.plotPerimeter,
    partB: [
      { id: "compound", name: "Compound wall, gate and setback works", amount: 0 },
      { id: "sump", name: "Underground sump", amount: 150000 },
    ],
    issuedOn: (project.signedOn ?? project.onboardedOn ?? TODAY).slice(0, 10),
  };
}
