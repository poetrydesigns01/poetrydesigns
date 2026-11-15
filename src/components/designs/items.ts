"use client";

import { client } from "@/lib/demo-data";
import { useDemo, useFirm, useProjection } from "@/lib/demo-store";
import { datePart, formatDate, formatTime } from "@/lib/format";
import type { DesignItemStatus, DesignItemVersionView, DesignItemView, DesignStageView } from "@/lib/portal";
import type { ProjectedDesign } from "@/lib/projection";

// The client's design items, read once for the table and the viewer. Every item in the three
// stages comes from firm.designStages; a sheet that lives outside the stages (the kitchen
// specification) is read from the older projection so its links keep working.

export const PROJECT = "iyer" as const;

export type DrawingKind = "plan" | "elevation" | "boq" | "spec";

export type ItemView = Omit<DesignItemView, "stage" | "preparedBy" | "projectId"> & {
  kind: DrawingKind;
  /** Rear and side elevations: the front drawn the other way round. */
  mirrored: boolean;
};

const KIND: Record<DesignItemView["stage"], DrawingKind> = {
  "floor-plan": "plan",
  elevation: "elevation",
  approvals: "boq",
  estimate: "boq",
  selections: "spec",
};

/** "11 Nov 2026, 4:12 pm"; a plain date gives "11 Nov 2026". */
export function proofStamp(at?: string): string {
  if (!at) return "";
  const time = formatTime(at);
  return time ? `${formatDate(datePart(at))}, ${time}` : formatDate(datePart(at));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** The three design stages of the client's project, in order. */
export function useDesignStages(): DesignStageView[] {
  return useFirm().designStages(PROJECT);
}

function fromStage(item: DesignItemView): ItemView {
  return { ...item, kind: KIND[item.stage], mirrored: item.stage === "elevation" && item.id !== "pd-elev-final" };
}

const OLD_STATUS: Record<ProjectedDesign["status"], Exclude<DesignItemStatus, "not-uploaded">> = {
  awaiting: "waiting",
  approved: "approved",
  "changes-requested": "modify",
};

const WORDS: Record<DesignItemStatus, { words: string; tone: DesignItemView["tone"] }> = {
  waiting: { words: "Waiting", tone: "waiting" },
  approved: { words: "Approved", tone: "done" },
  modify: { words: "Modify requested", tone: "progress" },
  "not-uploaded": { words: "Not uploaded", tone: "locked" },
};

/** One item for the viewer, with the stage it belongs to (null outside the three stages). */
export function useDesignItem(id: string): { item: ItemView | null; stage: DesignStageView | null } {
  const stages = useDesignStages();
  const projection = useProjection();
  const demo = useDemo();

  for (const stage of stages) {
    const found = stage.items.find((item) => item.id === id);
    if (found) return { item: fromStage(found), stage };
  }

  const old = projection.designs.find((row) => row.design.id === id);
  if (!old) return { item: null, stage: null };

  const decision = demo.designDecisions[id];
  const viewedAt = (version: number) =>
    demo.events.find((e) => e.kind === "design.viewed" && e.designId === id && e.version === version)?.at;
  const versions: DesignItemVersionView[] = old.design.versions.map((v, index, all) => {
    const latest = index === all.length - 1;
    const status = latest ? OLD_STATUS[old.status] : OLD_STATUS[v.status];
    const decidedAt = latest && decision?.at ? decision.at : v.decidedOn;
    return {
      version: v.version,
      uploadedAt: v.uploadedOn,
      note: v.note,
      viewedAt: viewedAt(v.version) ?? (status !== "waiting" ? decidedAt : undefined),
      status,
      decidedAt: status === "waiting" ? undefined : decidedAt,
      comment: latest ? (decision?.comment ?? v.comment) : v.comment,
    };
  });
  const latest = versions[versions.length - 1];
  return {
    item: {
      id,
      taskId: `${PROJECT}-${id}`,
      milestone: null,
      neededBy: null,
      workflowName: old.design.title,
      stageLabel: old.design.kind === "Specification" ? "Specification" : "Drawing",
      title: old.design.title,
      sheet: old.design.sheet,
      preparedByName: old.latest.uploadedBy,
      version: latest.version,
      uploadedAt: latest.uploadedAt,
      viewedAt: latest.viewedAt,
      viewed: !!latest.viewedAt,
      status: latest.status,
      statusWords: WORDS[latest.status].words,
      tone: WORDS[latest.status].tone,
      decidedAt: latest.decidedAt,
      comment: latest.comment,
      note: latest.note,
      versions,
      kind: old.design.drawing === "spec" ? "spec" : old.design.drawing,
      mirrored: false,
    },
    stage: null,
  };
}

/** Who the view-only mark names. */
export const VIEWER_NAME = client.name;

/**
 * The designs in the workflow's order, in groups that fold: before construction one group per
 * stage (floor plan drafts, elevations, design and cost approvals, final estimate); during
 * construction the selections, one group per milestone.
 */
export type DesignGroup = {
  key: string;
  phase: "before" | "during";
  /** "Floor plan", or the selections of a milestone: "Switches · Main gate & wicket gate". */
  title: string;
  /** The construction milestone, for selections. */
  milestone: number | null;
  stage: DesignStageView;
  items: DesignItemView[];
  approved: number;
  total: number;
  waiting: number;
  modify: number;
  uploaded: number;
  locked: boolean;
  /** The newest decision, once all are approved. */
  lastDecidedAt?: string;
  /** The earliest date a decision is needed, while any is open. */
  neededBy: string | null;
};

function groupOf(key: string, phase: DesignGroup["phase"], title: string, stage: DesignStageView, items: DesignItemView[]): DesignGroup {
  const open = items.filter((i) => i.status !== "approved");
  return {
    key,
    phase,
    title,
    milestone: items[0]?.milestone ?? null,
    stage,
    items,
    approved: items.length - open.length,
    total: items.length,
    waiting: items.filter((i) => i.status === "waiting").length,
    modify: items.filter((i) => i.status === "modify").length,
    uploaded: items.filter((i) => i.status !== "not-uploaded").length,
    locked: stage.locked,
    lastDecidedAt: open.length === 0 ? items.map((i) => i.decidedAt ?? "").sort().pop() || undefined : undefined,
    neededBy: open.map((i) => i.neededBy ?? "").filter(Boolean).sort()[0] ?? null,
  };
}

export function designGroups(stages: DesignStageView[]): DesignGroup[] {
  return stages.flatMap((stage) => {
    if (stage.stage !== "selections") return [groupOf(stage.stage, "before", stage.label, stage, stage.items)];
    const byMilestone = new Map<number, DesignItemView[]>();
    for (const item of stage.items) {
      const n = item.milestone ?? 0;
      byMilestone.set(n, [...(byMilestone.get(n) ?? []), item]);
    }
    return [...byMilestone.entries()]
      .sort(([a], [b]) => a - b)
      .map(([n, items]) => groupOf(`m${n}`, "during", items.map((i) => i.title).join(" · "), stage, items));
  });
}

/** A group opens by itself when something in it waits for her. */
export function opensByItself(group: DesignGroup): boolean {
  return !group.locked && group.waiting + group.modify > 0;
}
