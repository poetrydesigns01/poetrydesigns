import type { Firm, ProjectView } from "@/lib/firm";
import type { Tone } from "@/lib/portal";

// The admin's sums over a set of projects, and each project's health as a chip. Money is
// before GST except what clients still owe on raised stages, which is with GST.

export type Portfolio = {
  contract: number;
  received: number;
  /** Raised stages not yet received, with GST. */
  outstanding: number;
  dueStages: number;
  overdue: number;
  workDone: number;
  margin: number;
  marginPercent: number | null;
  cash: number;
  spent: number;
  costs: number;
  /** Designs and cost revisions waiting for a client. */
  approvals: number;
  openRequests: number;
  lateRequests: number;
};

export function portfolio(projects: ProjectView[], firm: Firm): Portfolio {
  const ids = new Set(projects.map((p) => p.id));
  const sum = (f: (p: ProjectView) => number) => projects.reduce((t, p) => t + f(p), 0);
  const building = projects.filter((p) => p.margin !== null);
  const margin = building.reduce((t, p) => t + (p.margin ?? 0), 0);
  const workDone = building.reduce((t, p) => t + p.workDone, 0);
  const stages = firm.paymentStages.filter((s) => ids.has(s.projectId) && (s.state === "due" || s.state === "client-paid"));
  let approvals = 0;
  for (const p of projects) {
    const items = firm.designStages(p.id).flatMap((s) => s.items);
    approvals +=
      items.length > 0
        ? items.filter((i) => i.status === "waiting").length
        : firm.designs.filter((d) => d.projectId === p.id && d.status === "awaiting").length;
  }
  approvals += firm.revisions.filter((r) => ids.has(r.projectId) && r.status === "with-client").length;
  const open = firm.requests.filter(
    (r) => ids.has(r.projectId) && !r.queued && (r.status === "New" || r.status === "Seen" || r.status === "PO in part"),
  );
  return {
    contract: sum((p) => p.contractValue),
    received: sum((p) => p.received),
    outstanding: stages.reduce((t, s) => t + s.outstanding, 0),
    dueStages: stages.length,
    overdue: stages.filter((s) => s.overdueDays > 0).length,
    workDone,
    margin,
    marginPercent: workDone > 0 ? (margin / workDone) * 100 : null,
    cash: sum((p) => p.cash),
    spent: sum((p) => p.spent),
    costs: sum((p) => p.costs),
    approvals,
    openRequests: open.length,
    lateRequests: open.filter((r) => r.late).length,
  };
}

/** A project's health in two words and a tone: a loss is brick. */
export function healthOf(p: Pick<ProjectView, "phase" | "margin" | "cash">): { words: string; tone: Tone } {
  if (p.phase === "draft") return { words: "Draft", tone: "locked" };
  if (p.phase === "handed-over") return { words: "Handed over", tone: "done" };
  if (p.margin === null) return { words: "In design", tone: "progress" };
  if (p.margin < 0) return { words: "Losing money", tone: "late" };
  if (p.cash < 0) return { words: "Short of cash", tone: "late" };
  return { words: "Healthy", tone: "done" };
}
