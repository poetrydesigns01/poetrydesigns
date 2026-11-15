/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useState } from "react";
import { dated, day, Empty, IconCheck, Panel } from "@/components/architect/glass-ui";
import { planChip, PlanStrip, STAGE_TONE, weekNowLabel, weeksLabel, type StripRow } from "@/components/architect/plan-bits";
import { field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { DraftView, Firm } from "@/lib/firm";
import type { ProjectId } from "@/lib/firm-data";
import { datePart, shortWeekdayDate } from "@/lib/format";
import type { Tone } from "@/lib/portal";
import { defaultConstructionStart, mondayOf, stageDates, type PlanTaskView, type PlanView } from "@/lib/workflow-plan";
import { WORKFLOW_TEMPLATE } from "@/lib/workflow-template";

// The end of onboarding: the project code and the plan generated from Poetry's workflow
// template, every stage on its planned weeks. Also every task the workbook gives the business
// team (as manager or support), which BD follows on Today. The floor plan drafts and the 3D
// elevation options fold into one row each, with a count of the client's approvals.

/** Short words for the business team's tasks; any other falls back to the workbook's name. */
const BD_WORDS: Record<string, string> = {
  "su-advance": "Sign-up advance",
  "pd-brief": "Design brief",
  "fa-pre-structure": "Design & cost approval",
  "fa-estimate": "Final estimate",
  "fa-advance": "Mobilisation advance",
  "in-final": "Final inspection",
  "ho-noc": "NOC",
};

export type BdTask = {
  /** The task, or for a folded group one task spanning the group's weeks and state. */
  t: PlanTaskView;
  plan: PlanView;
  label: string;
  /** Client approvals done out of the group's, for a folded group. */
  count?: { done: number; of: number };
  chip: { tone: Tone; words: string };
};

/** Several plan tasks as one: their weeks end to end, done only when all are. */
function foldTasks(id: string, tasks: PlanTaskView[]): PlanTaskView {
  const first = tasks[0];
  const last = tasks.reduce((a, b) => (b.plannedEnd > a.plannedEnd ? b : a), first);
  const allDone = tasks.every((t) => t.state === "done");
  const state: PlanTaskView["state"] = allDone
    ? "done"
    : tasks.every((t) => t.state === "locked")
      ? "locked"
      : tasks.some((t) => t.state === "in-progress" || t.state === "done")
        ? "in-progress"
        : "not-started";
  const daysLate = Math.max(0, ...tasks.map((t) => t.daysLate));
  const doneOns = tasks.map((t) => t.doneOn).filter((d): d is string => !!d).sort();
  return {
    ...first,
    id,
    fromWeek: Math.min(...tasks.map((t) => t.fromWeek)),
    toWeek: Math.max(...tasks.map((t) => t.toWeek)),
    plannedStart: tasks.reduce((a, t) => (t.plannedStart < a ? t.plannedStart : a), first.plannedStart),
    plannedEnd: last.plannedEnd,
    state,
    percent: Math.round(tasks.reduce((n, t) => n + t.percent, 0) / tasks.length),
    doneOn: allDone ? doneOns[doneOns.length - 1] : undefined,
    late: tasks.some((t) => t.late),
    daysLate,
  };
}

/** A plan's business-team tasks with one chip each; client approvals read the client's design items. */
export function bdTasksOf(firm: Firm, id: ProjectId): BdTask[] {
  const plan = firm.plan(id);
  if (!plan) return [];
  const items = firm.designStages(id).flatMap((s) => s.items);
  const mine = plan.tasks.filter((t) => t.manager === "business" || t.support.includes("business"));
  const out: BdTask[] = [];
  const folded = new Set<string>();
  for (const t of mine) {
    const group = t.group;
    if (group) {
      if (folded.has(group)) continue;
      folded.add(group);
      const members = mine.filter((x) => x.group === group);
      const approvals = members.filter((x) => x.clientApproves);
      const memberItems = members.map((x) => items.find((i) => i.id === x.templateId)).filter((i) => !!i);
      const merged = foldTasks(`${t.projectId}-${group.toLowerCase().replace(/\W+/g, "-")}`, members);
      let chip = planChip(plan, merged);
      if (merged.state !== "done" && memberItems.some((i) => i.status === "modify")) chip = { tone: "progress", words: "Modify asked" };
      else if (merged.state !== "done" && memberItems.some((i) => i.status === "waiting"))
        chip = { tone: "waiting", words: memberItems.some((i) => i.status === "waiting" && i.viewed) ? "Client viewed" : "With client" };
      out.push({
        t: merged,
        plan,
        label: group,
        count: approvals.length > 0 ? { done: approvals.filter((x) => x.state === "done").length, of: approvals.length } : undefined,
        chip,
      });
      continue;
    }
    const item = items.find((i) => i.id === t.templateId);
    let chip = planChip(plan, t);
    if (t.state === "done" && t.instalment !== undefined) chip = { tone: "done", words: t.doneOn ? `Received ${day(t.doneOn)}` : "Received" };
    else if (t.state === "in-progress" && t.instalment !== undefined && !t.late) chip = { tone: "waiting", words: "Due" };
    else if (t.state !== "done" && item?.status === "waiting") chip = { tone: "waiting", words: item.viewed ? "Client viewed" : "With client" };
    else if (t.state !== "done" && item?.status === "modify") chip = { tone: "progress", words: "Modify asked" };
    out.push({ t, plan, label: BD_WORDS[t.templateId] ?? t.name, chip });
  }
  return out;
}

/** The stages as strip rows, coloured by where each stands. */
export function stripRows(plan: PlanView): StripRow[] {
  return plan.stages.map((s) => ({
    id: s.id,
    label: s.milestone ? `M${s.milestone} ${s.short}` : s.name,
    clock: s.clock,
    from: s.fromWeek,
    to: s.toWeek,
    tone: STAGE_TONE[s.state],
    start: s.plannedStart,
    end: s.plannedEnd,
  }));
}

/** The plan's week on the strip: construction once it has begun, else pre-construction. */
export function todayOf(plan: PlanView) {
  return plan.todayWeek >= 1
    ? { clock: "construction" as const, week: plan.todayWeek }
    : { clock: "pre" as const, week: plan.todayPreWeek };
}

/** One business-team task as a row. */
export function BdTaskRow({ task, project }: { task: BdTask; project?: string }) {
  const { t, chip, count } = task;
  return (
    <li className="glass-row flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <span className="min-w-0 flex-[1_1_11rem]">
        <span className="block truncate text-15 text-ink">
          {task.label}
          {count && <span className="figure ml-2 text-13 text-ink-soft">{`${count.done}/${count.of}`}</span>}
        </span>
        <span className="block truncate text-13 text-ink-soft">
          {[project, weeksLabel(t.clock, t.fromWeek, t.toWeek)].filter(Boolean).join(" · ")}
          <span className="hidden sm:inline">{` · ${day(t.plannedStart)} – ${day(t.plannedEnd)}`}</span>
        </span>
      </span>
      <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
    </li>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-inner min-w-0 p-3">
      <p className="lettering text-ink-soft">{label}</p>
      <p className="figure mt-1 text-22 leading-tight wrap-anywhere text-ink">{value}</p>
    </div>
  );
}

/** Before generating: the code, the sign-up week to start from, and the plan as it would fall. */
function Generate({ draft, id }: { draft: DraftView; id: ProjectId }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const startId = useId();
  const p = firm.project(id);
  const signed = draft.step3?.signedOn ?? (draft.openedAt ? datePart(draft.openedAt) : TODAY);
  const [start, setStart] = useState(() => mondayOf(signed));
  if (!p) return null;

  const anchors = { preStart: start, constructionStart: defaultConstructionStart(start) };
  const rows: StripRow[] = WORKFLOW_TEMPLATE.stages.map((s) => {
    const dates = stageDates(anchors, s.id);
    return {
      id: s.id,
      label: s.milestone ? `M${s.milestone} ${s.short}` : s.name,
      clock: s.clock,
      from: s.from,
      to: s.to,
      tone: "locked",
      start: dates.start,
      end: dates.end,
    };
  });
  const handover = stageDates(anchors, "handover").end;

  const generate = (origin: HTMLElement) => {
    if (pause.pending !== null) return;
    const { record } = demo;
    const from = start;
    pause.start({
      what: `Plan for ${p.name}, from ${shortWeekdayDate(from)}`,
      origin,
      commit: () => record({ kind: "plan.generated", projectId: id, preStart: from, by: "rohan" }),
    });
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Figure label="Project code" value={p.code} />
        <div className="glass-inner grid min-w-0 content-start gap-1 p-3">
          <label htmlFor={startId} className="lettering text-ink-soft">
            Sign-up week
          </label>
          <input
            id={startId}
            type="date"
            className={`${field} min-w-0`}
            value={start}
            onChange={(e) => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setStart(mondayOf(e.target.value));
            }}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Figure label="Handover" value={dated(handover)} />
        </div>
      </div>
      <PlanStrip rows={rows} label="Planned weeks" />
      <div>
        <button
          type="button"
          className="btn btn-primary min-h-12 gap-2"
          aria-disabled={pause.pending !== null}
          onClick={(e) => generate(e.currentTarget)}
        >
          Generate plan
        </button>
      </div>
    </div>
  );
}

/** After: the code, the weeks, and the business team's tasks on it. */
function Generated({ id, plan }: { id: ProjectId; plan: PlanView }) {
  const firm = useFirm();
  const p = firm.project(id);
  const tasks = bdTasksOf(firm, id);
  const handover = plan.stages[plan.stages.length - 1]?.plannedEnd;
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Figure label="Project code" value={p?.code ?? plan.code} />
        <Figure label="Sign-up week" value={dated(plan.preStart)} />
        <div className="col-span-2 sm:col-span-1">
          <Figure label="Handover" value={handover ? dated(handover) : "—"} />
        </div>
      </div>
      <PlanStrip rows={stripRows(plan)} today={todayOf(plan)} label="Planned weeks" />
      <section aria-label="Business team" className="grid gap-1">
        <h3 className="px-1 text-15 font-semibold text-ink">Business team</h3>
        {tasks.length === 0 ? (
          <Empty>None</Empty>
        ) : (
          <ul className="grid grid-cols-1 gap-1">
            {tasks.map((task) => (
              <BdTaskRow key={task.t.id} task={task} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function PlanPanel({ draft }: { draft: DraftView }) {
  const firm = useFirm();
  const id = draft.projectId;
  if (!draft.opened || !id) return null;
  const plan = firm.plan(id);
  return (
    <Panel
      title="Plan"
      aside={
        plan ? (
          <>
            <span className="figure text-13 text-ink-soft">{weekNowLabel(plan)}</span>
            <StatusChip tone="done">
              <span className="inline-flex items-center gap-1">
                <IconCheck /> {`Generated ${day(plan.generatedAt)}`}
              </span>
            </StatusChip>
          </>
        ) : (
          <StatusChip tone="waiting">Not generated</StatusChip>
        )
      }
    >
      {plan ? <Generated id={id} plan={plan} /> : <Generate draft={draft} id={id} />}
    </Panel>
  );
}
