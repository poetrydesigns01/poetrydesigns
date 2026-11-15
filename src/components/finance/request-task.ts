import type { Firm, RequestView } from "@/lib/firm";
import { seedSiteTasks } from "@/lib/portal-data";
import { milestoneStage } from "@/lib/workflow-template";

// Which plan task a material request is for: the task the site picked when raising it, or
// the seeded task that lists it. A request with neither sits under its milestone's work.

export type RequestTask = {
  /** Plan task id ("iyer-m4-ff-blocks"), or `${projectId}-m${n}` when the request names no task. */
  key: string;
  milestone: number;
  /** "FF block work", or the milestone's own words when the request names no task. */
  name: string;
};

export function requestTask(r: RequestView, firm: Firm): RequestTask {
  const id = r.taskId ?? seedSiteTasks.find((t) => t.requests.some((ref) => ref.split("#")[0] === r.no))?.id;
  const task = id ? firm.plan(r.projectId)?.tasks.find((t) => t.id === id) : undefined;
  if (task) return { key: task.id, milestone: task.milestone ?? r.n, name: task.name };
  return { key: `${r.projectId}-m${r.n}`, milestone: r.n, name: milestoneStage(r.n)?.short ?? `Milestone ${r.n}` };
}

/** "M4 · FF block work". */
export function taskWords(t: RequestTask): string {
  return t.milestone > 0 ? `M${t.milestone} · ${t.name}` : t.name;
}
