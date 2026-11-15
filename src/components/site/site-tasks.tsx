/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useState } from "react";
import { useScope } from "@/components/register/project-switch";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm, useViewer } from "@/lib/demo-store";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import type { SiteMilestoneView, SiteTaskView } from "@/lib/portal";
import {
  Icon,
  ProgressBar,
  ResourceBadge,
  Segmented,
  byUrgency,
  dateSpan,
  drawingSummary,
  heldUp,
  isMine,
  labourSummary,
  lockWords,
  materialSummary,
  siteTasksOf,
  taskTone,
  type Summary,
} from "./site-kit";
import { milestoneLine } from "./milestone";
import { TaskDetail, TaskFlags } from "./task-card";
import "./site.css";

// The plan's site tasks: the milestone in hand, then the next one (locked until its
// instalment is in). One row per task with its dates, progress and the state of its
// materials, crews and drawings; a row opens in place for updates and requests.

type Filter = "all" | "mine" | "late" | "done" | PersonId;

/** The table's columns from 1280 px. */
const COLS = "xl:grid-cols-[minmax(0,1.9fr)_6.5rem_8rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_1.25rem]";

function Cell({ summary }: { summary: Summary | null }) {
  return summary ? <StatusChip tone={summary.tone}>{summary.words}</StatusChip> : <span className="text-15 text-ink-soft">–</span>;
}

function Row({ task, person, ownerName }: { task: SiteTaskView; person: PersonId; ownerName?: string }) {
  const firm = useFirm();
  const id = useId();
  const [open, setOpen] = useState(false);
  const tone = taskTone(task);
  const mat = materialSummary(task.materials, firm);
  const lab = labourSummary(task);
  const drw = drawingSummary(task);
  const sub = [task.area, ownerName].filter(Boolean).join(" · ");
  const percent = (
    <span className={`figure text-17 ${tone === "late" ? "late-text" : "text-ink"}`}>
      {task.percent}
      <span className="text-13">%</span>
    </span>
  );

  return (
    <li className={`glass-row ${open ? "bg-white/40" : ""}`}>
      <button type="button" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => setOpen(!open)} className="site-row-head">
        {/* Phone to 1279 px: title and number, the bar, then dates and chips. */}
        <span className="grid gap-2 xl:hidden">
          <span className="flex items-start justify-between gap-3">
            <span className="grid min-w-0 gap-0.5">
              <span className="text-15 font-semibold text-ink">{task.title}</span>
              {sub && <span className="truncate text-13 text-ink-soft">{sub}</span>}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {percent}
              <Icon name="chevron" className="site-chevron size-5 text-ink-soft" />
            </span>
          </span>
          <ProgressBar value={task.percent} tone={tone} />
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-13 text-ink-soft">
              <Icon name="calendar" className="size-4.5" />
              {dateSpan(task.plannedStart, task.plannedEnd)}
            </span>
            <TaskFlags task={task} lock={false} />
            {mat && <ResourceBadge icon="box" name="Materials" summary={mat} />}
            {lab && <ResourceBadge icon="crew" name="Labour" summary={lab} />}
            {drw && <ResourceBadge icon="sheet" name="Drawings" summary={drw} />}
          </span>
        </span>

        {/* From 1280 px: one table row. */}
        <span className={`hidden items-center gap-3 xl:grid ${COLS}`}>
          <span className="grid min-w-0 gap-1">
            <span className="truncate text-15 font-semibold text-ink">{task.title}</span>
            {(sub || task.late || task.waitingForClient) && (
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                {sub && <span className="truncate text-13 text-ink-soft">{sub}</span>}
                <TaskFlags task={task} lock={false} />
              </span>
            )}
          </span>
          <span className="text-15 text-ink">{dateSpan(task.plannedStart, task.plannedEnd)}</span>
          <span className="grid gap-1">
            {percent}
            <ProgressBar value={task.percent} tone={tone} />
          </span>
          <span className="min-w-0">
            <span className="sr-only">Materials: </span>
            <Cell summary={mat} />
          </span>
          <span className="min-w-0">
            <span className="sr-only">Labour: </span>
            <Cell summary={lab} />
          </span>
          <span className="min-w-0">
            <span className="sr-only">Drawings: </span>
            <Cell summary={drw} />
          </span>
          <Icon name="chevron" className="site-chevron size-5 text-ink-soft" />
        </span>
      </button>
      {open && <TaskDetail id={`${id}-body`} task={task} person={person} className="xl:grid-cols-2 xl:items-start xl:gap-x-6" />}
    </li>
  );
}

/** One milestone's rows under its name, with a lock while its instalment is not in. */
function Group({
  m,
  tasks,
  person,
  nameOf,
  next = false,
}: {
  m: SiteMilestoneView;
  tasks: SiteTaskView[];
  person: PersonId;
  nameOf: (t: SiteTaskView) => string | undefined;
  next?: boolean;
}) {
  const id = useId();
  return (
    <section className="glass-strong p-1.5 sm:p-2" aria-labelledby={id}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 pt-2 pb-1.5">
        <h2 id={id} className="flex min-w-0 items-center gap-2 text-17 font-semibold text-ink">
          {m.locked && <Icon name="lock" className="size-4.5 shrink-0 text-brass-deep" />}
          <span className="truncate">
            {next ? `Next · ${m.name}` : m.name}
            <span className="font-normal text-ink-soft"> · {m.short}</span>
          </span>
        </h2>
        {m.locked ? (
          <StatusChip tone="locked">
            Locked
            <span className="sr-only">, {lockWords(m.blockedBy)}</span>
          </StatusChip>
        ) : (
          <StatusChip tone="progress">{m.percent}%</StatusChip>
        )}
      </div>
      <div aria-hidden="true" className={`hidden gap-3 px-4 pt-1 pb-1.5 xl:grid ${COLS}`}>
        {["Task", "Dates", "Progress", "Materials", "Labour", "Drawings"].map((h) => (
          <span key={h} className="lettering text-ink-soft">
            {h}
          </span>
        ))}
      </div>
      {tasks.length === 0 ? (
        <p className="px-3 py-3 text-15 text-ink-soft">Nothing here</p>
      ) : (
        <ul className="grid gap-0.5">
          {tasks.map((t) => (
            <Row key={t.id} task={t} person={person} ownerName={nameOf(t)} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function SiteTasks() {
  const firm = useFirm();
  const me = useViewer("site");
  const scope = useScope("site");
  const projectId: ProjectId = scope === "all" ? "iyer" : scope;
  const stage = firm.siteStage(projectId);
  const juniors = firm.people.filter((p) => p.lead === me.id && p.role === "site");
  // Until he picks one, a senior sees every open task and a junior his own. The viewer is
  // read from the tab's state after the first paint, so the default is worked out here.
  const [picked, setFilter] = useState<Filter | null>(null);
  const filter: Filter = picked ?? (me.senior ? "all" : "mine");

  if (!stage) {
    return (
      <div className="site-screen">
        <StaffBoard place="Tasks" headline="No tasks yet" />
      </div>
    );
  }

  const all = siteTasksOf(stage);
  const tests: Record<string, (t: SiteTaskView) => boolean> = {
    all: (t) => t.state !== "done",
    mine: (t) => isMine(t, me.id) && t.state !== "done",
    late: heldUp,
    done: (t) => t.state === "done",
  };
  const test = (f: Filter) => tests[f] ?? ((t: SiteTaskView) => isMine(t, f as PersonId) && t.state !== "done");
  const options: { id: Filter; label: string }[] = [
    { id: "all", label: "Open" },
    { id: "mine", label: "Mine" },
    ...juniors.map((j) => ({ id: j.id as Filter, label: j.first })),
    { id: "late", label: "Held up" },
    { id: "done", label: "Done" },
  ];
  // Whose a task is, where the list mixes people: the plan's assignee, never the viewer.
  const nameOf = (t: SiteTaskView) => (t.assignee && t.assignee !== me.id ? t.assigneeName.split(" ")[0] : undefined);
  const current = stage.tasks.filter(test(filter)).sort(byUrgency);
  const next = (stage.next?.tasks ?? []).filter(test(filter)).sort(byUrgency);

  return (
    <div className="site-screen">
      <StaffBoard place="Tasks" headline={stage.short} state={milestoneLine(stage)} />

      <Segmented
        label="Show"
        value={filter}
        onChange={setFilter}
        options={options.map((o) => ({ ...o, count: all.filter(test(o.id)).length }))}
      />

      <Group m={stage} tasks={current} person={me.id} nameOf={nameOf} />
      {stage.next && next.length > 0 && <Group m={stage.next} tasks={next} person={me.id} nameOf={nameOf} next />}
    </div>
  );
}
