/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { dayWords } from "@/components/admin/admin-data";
import { Empty, Icon, Initials, Panel } from "@/components/admin/glass-kit";
import { usePause } from "@/components/register/recording-pause";
import { useStaffRole } from "@/components/register/staff-shell";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { ProjectView } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import type { Tone } from "@/lib/portal";
import { mondayOf, type PlanStageView, type PlanTaskView, type PlanView } from "@/lib/workflow-plan";
import { WORKFLOW_TASKS, type WorkflowRole } from "@/lib/workflow-template";
import { Gantt, GanttKey, projectGantt, stageLabel, weeksWords } from "./gantt";

// The project's plan on the Programme tab: the week chart (stages, instalments, today, extra
// days in brick), then every task by stage with its owner, planned weeks and status. The
// admin generates the plan from the workflow template when a project has none, and gives a
// task to someone else from its owner cell. Everyone else reads.

const ADMIN: PersonId = "shalini";

/** The plan's finance owner (see teamFor in firm.ts). */
const FINANCE: PersonId = "divya";

/**
 * The people a task can go to: the project's own people for its manager's role, so a task
 * never goes to someone who cannot see the project. The current owner always stays listed.
 */
function teamFor(p: ProjectView, role: WorkflowRole): PersonId[] {
  if (role === "architect") return [p.team.head, ...p.team.architects];
  if (role === "site") return p.team.engineers.length > 0 ? p.team.engineers : [p.team.head];
  if (role === "finance") return [FINANCE, ...p.team.procurement];
  if (role === "business") return [p.onboardedBy, p.team.poc];
  return [];
}

export function ProjectPlanTab({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const role = useStaffRole();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  const plan = firm.plan(projectId);
  const admin = role === "admin";

  if (!plan) {
    return admin ? (
      <GeneratePlan projectId={projectId} signedOn={p.signedOn} />
    ) : (
      <section className="glass p-4">
        <Empty>No plan yet</Empty>
      </section>
    );
  }

  return (
    <div className="grid gap-4">
      <PlanChart projectId={projectId} />
      <PlanTasks plan={plan} canAssign={admin} />
    </div>
  );
}

// ---- The chart ----

function PlanChart({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const timeline = firm.timeline(projectId);
  if (!timeline) return null;
  const { cols, rows, markers, today } = projectGantt(timeline);
  const todayCol = today >= 0 ? cols[today] : undefined;
  return (
    <Panel
      title="Programme"
      strong
      aside={
        <span className="flex flex-wrap items-center gap-1.5">
          {todayCol && <StatusChip tone="progress">Today {todayCol.label}</StatusChip>}
          <span className="glass-chip">
            <Icon name="clock" className="size-3.5" />
            {dayWords(timeline.handoverExpected)}
            {timeline.extraDays > 0 && <span className="late-text">+{timeline.extraDays} d</span>}
          </span>
        </span>
      }
    >
      <div className="grid gap-3">
        <Gantt caption="Programme by week" cols={cols} rows={rows} markers={markers} today={today} />
        <GanttKey
          items={[
            { tone: "done", words: "Done" },
            { tone: "current", words: "Under way" },
            { tone: "waiting", words: "Held for payment" },
            { tone: "locked", words: "To come" },
            { tone: "late", words: "Extra days" },
          ]}
        />
      </div>
    </Panel>
  );
}

// ---- Generating a plan ----

function GeneratePlan({ projectId, signedOn }: { projectId: ProjectId; signedOn?: string }) {
  const demo = useDemo();
  const pause = usePause();
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  // The week the client signed (P1), as the BD's own Generate form has it.
  const [start, setStart] = useState(() => mondayOf(signedOn ?? TODAY));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null || !start) return;
    const preStart = mondayOf(start);
    pause.start({
      what: `The plan from ${dayWords(preStart)}`,
      origin: button.current,
      commit: () => demo.record({ kind: "plan.generated", projectId, preStart, by: ADMIN }),
    });
  };

  return (
    <section aria-label="Generate plan" className="glass-dark grid gap-4 p-5 sm:p-6">
      <div className="grid gap-1">
        <p className="lettering text-lime/75">No plan yet</p>
        <h2 className="text-22 font-semibold">Generate from template</h2>
        <p className="text-15 text-lime/75">
          {WORKFLOW_TASKS.length} tasks · 16 stages · owners by role
        </p>
      </div>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[minmax(0,16rem)_auto] sm:items-end sm:justify-start">
        <label htmlFor={`${id}-start`} className="grid gap-1.5">
          <span className="lettering text-lime/75">Sign-up week</span>
          <input
            id={`${id}-start`}
            type="date"
            required
            className="glass-field min-h-12 w-full px-3 text-17 text-ink"
            value={start}
            onChange={(e) => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setStart(mondayOf(e.target.value));
            }}
          />
        </label>
        <button ref={button} type="submit" className="btn btn-primary min-h-12" aria-disabled={pause.pending !== null ? true : undefined}>
          Generate plan
        </button>
      </form>
    </section>
  );
}

// ---- Tasks by stage ----

function stageChip(s: PlanStageView): { words: string; tone: Tone | null } {
  if (s.state === "done") return { words: "Done", tone: "done" };
  if (s.state === "current") return { words: `${s.percent}%`, tone: "progress" };
  if (s.state === "held") return { words: "Held", tone: "waiting" };
  if (s.locked) return { words: "Locked", tone: "locked" };
  return { words: "To come", tone: null };
}

function taskChip(t: PlanTaskView): { words: string; tone: Tone | null } {
  if (t.state === "done") return { words: "Done", tone: "done" };
  if (t.state === "locked") return { words: "Locked", tone: "locked" };
  if (t.state === "in-progress") {
    if (t.late) return { words: `${t.daysLate} d late`, tone: "late" };
    if (t.track === "payment") return { words: "Due", tone: "waiting" };
    if (t.clientApproves && t.percent < 100) return { words: "With client", tone: "waiting" };
    return { words: t.percent > 0 ? `${t.percent}%` : "Under way", tone: "progress" };
  }
  if (t.late) return { words: `${t.daysLate} d late`, tone: "late" };
  return { words: "To come", tone: null };
}

function Chip({ c }: { c: { words: string; tone: Tone | null } }) {
  return c.tone ? <StatusChip tone={c.tone}>{c.words}</StatusChip> : <span className="glass-chip">{c.words}</span>;
}

const ROW = "md:grid-cols-[minmax(0,1fr)_12rem_5.5rem_7rem]";

export function PlanTasks({ plan, canAssign }: { plan: PlanView; canAssign: boolean }) {
  const [open, setOpen] = useState<string[]>(() => (plan.currentStage ? [plan.currentStage] : []));
  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const done = plan.tasks.filter((t) => t.state === "done").length;

  return (
    <Panel
      title="Tasks"
      strong
      aside={
        <span className="figure text-15 text-ink-soft">
          {done} / {plan.tasks.length}
        </span>
      }
    >
      <div aria-hidden="true" className={`lettering hidden gap-x-3 px-3 pb-1 text-ink-soft md:grid ${ROW}`}>
        <span>Task</span>
        <span>Owner</span>
        <span>Weeks</span>
        <span>Status</span>
      </div>
      <ol className="grid gap-1">
        {plan.stages.map((s) => {
          const isOpen = open.includes(s.id);
          const chip = stageChip(s);
          const { tag, label } = stageLabel(s);
          const panelId = `stage-${plan.projectId}-${s.id}`;
          return (
            <li key={s.id} className="grid">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={isOpen ? panelId : undefined}
                onClick={() => toggle(s.id)}
                className={`glass-row grid min-h-12 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2 text-left ${
                  plan.currentStage === s.id ? "bg-white/50" : ""
                }`}
              >
                <svg
                  viewBox="0 0 20 20"
                  className={`size-4 text-ink-soft transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M8 5l5 5-5 5" />
                </svg>
                <span className="flex min-w-0 items-baseline gap-2">
                  {tag && <span className="figure shrink-0 text-15 font-semibold">{tag}</span>}
                  <span className="truncate text-15 font-semibold">{label}</span>
                  <span className="figure shrink-0 text-13 text-ink-soft">{weeksWords(s.clock, s.fromWeek, s.toWeek)}</span>
                </span>
                <Chip c={chip} />
              </button>
              {isOpen && (
                <ul id={panelId} className="grid gap-0.5 pt-1 pb-2 md:pl-7">
                  {s.tasks.map((t) => (
                    <TaskRow key={t.id} task={t} canAssign={canAssign} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

function TaskRow({ task, canAssign }: { task: PlanTaskView; canAssign: boolean }) {
  const firm = useFirm();
  const owner = task.assignee ? firm.person(task.assignee) : undefined;
  const support = task.supportPeople.map((id) => firm.person(id)?.first ?? id).join(", ");
  return (
    <li className={`glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2 ${ROW}`}>
      <span className="min-w-0 text-15 md:col-auto">
        <span className={task.state === "done" ? "text-ink-soft" : "text-ink"}>{task.name}</span>
        {task.clientApproves && <span className="ml-1.5 glass-chip align-middle">Client</span>}
      </span>
      <span className="col-span-2 row-start-2 flex min-w-0 items-center gap-2 md:col-span-1 md:row-start-auto" title={support ? `With ${support}` : undefined}>
        {canAssign && task.state !== "done" ? (
          <OwnerSelect task={task} />
        ) : (
          <>
            <Initials name={owner?.name ?? "–"} />
            <span className="truncate text-15">{owner?.first ?? "–"}</span>
          </>
        )}
      </span>
      <span className="figure hidden text-13 text-ink-soft md:inline">{weeksWords(task.clock, task.fromWeek, task.toWeek)}</span>
      <span className="col-start-2 row-start-1 flex items-center justify-end gap-1.5 md:col-start-auto md:row-start-auto md:justify-start">
        <span className="figure text-13 text-ink-soft md:hidden">{weeksWords(task.clock, task.fromWeek, task.toWeek)}</span>
        <Chip c={taskChip(task)} />
      </span>
    </li>
  );
}

function OwnerSelect({ task }: { task: PlanTaskView }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const [choice, setChoice] = useState<PersonId | null>(null);
  const project = firm.project(task.projectId);
  const team = project ? teamFor(project, task.manager) : [];
  const people = firm.people.filter((p) => (p.active && team.includes(p.id)) || p.id === task.assignee);
  const whatFor = (to: PersonId) => `${task.name} to ${firm.person(to)?.name ?? to}`;
  // Nobody else on the project for this role: the owner as plain text, no picker.
  if (people.length <= 1 && task.assignee) {
    const owner = firm.person(task.assignee);
    return (
      <>
        <Initials name={owner?.name ?? "–"} />
        <span className="truncate text-15">{owner?.first ?? "–"}</span>
      </>
    );
  }
  // While its pause runs, the select shows the new owner; on Cancel it goes back.
  const shown = choice && pause.pending?.what === whatFor(choice) ? choice : (task.assignee ?? "");

  return (
    <label className="block w-full min-w-0">
      <span className="sr-only">Owner of {task.name}</span>
      <select
        className="glass-field min-h-11 w-full cursor-pointer px-2 text-15 text-ink"
        value={shown}
        onChange={(e) => {
          const to = e.target.value as PersonId;
          if (!to || to === task.assignee) return;
          setChoice(to);
          const origin = e.currentTarget;
          pause.start({
            what: whatFor(to),
            origin,
            commit: () =>
              demo.record({
                kind: "plan.task-assigned",
                projectId: task.projectId,
                taskId: task.templateId,
                to,
                from: task.assignee ?? undefined,
                by: ADMIN,
              }),
          });
        }}
      >
        {!task.assignee && <option value="">–</option>}
        {people.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}

