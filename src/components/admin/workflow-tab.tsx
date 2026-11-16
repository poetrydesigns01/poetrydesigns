/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { Gantt, GanttKey, stageLabel, templateGantt, weeksWords } from "@/components/project/gantt";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import { ROLE_WORDS, TRACK_WORDS, WORKFLOW_TEMPLATE, type WorkflowTask } from "@/lib/workflow-template";
import { Count, Icon, Panel } from "./glass-kit";

// The workflow every project plan is generated from, as Poetry's workbook lays it out: the
// stages on their weeks with the instalments, then each stage's tasks with the task manager
// and the supporting team, and the projects that have a plan. Read only.

export function WorkflowTab() {
  const t = WORKFLOW_TEMPLATE;
  const chart = templateGantt();
  const tasks = t.stages.reduce((n, s) => n + s.tasks.length, 0);
  return (
    <div className="grid gap-5">
      <section aria-label="Workflow at a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Stages" value={String(t.stages.length)} />
        <Tile label="Tasks" value={String(tasks)} />
        <Tile label="Weeks" value={`${t.preWeeks} + ${t.constructionWeeks}`} />
        <Tile label="Instalments" value={String(t.instalments.length)} />
      </section>

      <Panel title="Weeks" strong>
        <div className="grid gap-3">
          <Gantt caption="Workflow by week" cols={chart.cols} rows={chart.rows} />
          <GanttKey
            items={[
              { tone: "due", words: "Due ahead" },
              { tone: "free", words: "Reached" },
            ]}
          />
        </div>
      </Panel>

      <Panel title="Instalments" aside={<span className="glass-chip">+{Math.round(t.gstRate * 100)}% GST</span>}>
        <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 xl:grid-cols-11">
          {t.instalments.map((i) => (
            <li key={i.n} className="glass-inner grid content-start gap-0.5 px-2.5 py-2">
              <span className="lettering text-ink-soft">{i.n === 0 ? "Sign-up" : `No. ${i.n}`}</span>
              <span className="figure text-17 font-semibold">{i.percent}%</span>
              <span className="figure text-13 text-ink-soft">{weeksWords(i.clock, i.week, i.week)}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <StageList />
      <PlansList />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass grid content-start gap-1 p-4">
      <p className="lettering text-ink-soft">{label}</p>
      <p className="figure text-22">{value}</p>
    </div>
  );
}

const TRACK_TONE = { design: "progress", engineering: "locked", payment: "waiting", approval: "done" } as const;

function StageList() {
  const [open, setOpen] = useState<string[]>(["planning-design"]);
  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  return (
    <Panel title="Stages and tasks" strong>
      <div aria-hidden="true" className="lettering hidden grid-cols-[minmax(0,1fr)_7rem_11rem_minmax(0,12rem)] gap-x-3 px-3 pb-1 pl-10 text-ink-soft md:grid">
        <span>Task</span>
        <span>Track</span>
        <span>Manager</span>
        <span>Support</span>
      </div>
      <ol className="grid gap-1">
        {WORKFLOW_TEMPLATE.stages.map((s) => {
          const isOpen = open.includes(s.id);
          const { tag, label } = stageLabel(s);
          const panelId = `wf-${s.id}`;
          return (
            <li key={s.id} className="grid">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={isOpen ? panelId : undefined}
                onClick={() => toggle(s.id)}
                className="glass-row grid min-h-12 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-2 px-3 py-2 text-left"
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
                  <span className="truncate text-15 font-semibold" title={s.name}>
                    {label}
                  </span>
                  <span className="figure shrink-0 text-13 text-ink-soft">{weeksWords(s.clock, s.from, s.to)}</span>
                </span>
                <Count n={s.tasks.length} />
              </button>
              {isOpen && (
                <ul id={panelId} className="grid gap-0.5 pt-1 pb-2 md:pl-7">
                  {s.tasks.map((task) => (
                    <TaskLine key={task.id} task={task} />
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

function TaskLine({ task }: { task: WorkflowTask }) {
  const support = task.support.map((r) => ROLE_WORDS[r]).join(", ");
  return (
    <li className="glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2 md:grid-cols-[minmax(0,1fr)_7rem_11rem_minmax(0,12rem)]">
      <span className="min-w-0 text-15">
        {task.name}
        {task.clientApproves && <span className="ml-1.5 glass-chip align-middle">Client</span>}
        {/* The workbook's owner is shown; in the portal the architect prepares these. */}
        {task.portal && task.portal.manager !== task.manager && (
          <span className="ml-1.5 glass-chip align-middle">Drawn by {ROLE_WORDS[task.portal.manager].replace("Project ", "").toLowerCase()}</span>
        )}
      </span>
      <span>
        <StatusChip tone={TRACK_TONE[task.track]}>{TRACK_WORDS[task.track]}</StatusChip>
      </span>
      <span className="col-span-2 text-15 font-semibold md:col-span-1">
        {ROLE_WORDS[task.manager]}
        {support && <span className="font-normal text-ink-soft md:hidden"> · {support}</span>}
      </span>
      <span className="hidden text-13 text-ink-soft md:inline">{support || "–"}</span>
    </li>
  );
}

function PlansList() {
  const firm = useFirm();
  return (
    <Panel title="Project plans" aside={<Count n={firm.projects.filter((p) => firm.plan(p.id)).length} />}>
      <ul className="grid gap-1">
        {firm.projects.map((p) => {
          const plan = firm.plan(p.id);
          const draft = p.phase === "draft";
          const href = draft ? `/staff/projects/${p.id}` : `/staff/projects/${p.id}/programme`;
          return (
            <li key={p.id}>
              <Link href={href} className="glass-row grid min-h-12 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2">
                <span className="grid min-w-0">
                  <span className="truncate text-15 font-semibold">{p.name}</span>
                  {p.code && <span className="figure text-13 text-ink-soft">{p.code}</span>}
                </span>
                {plan ? (
                  <StatusChip tone={p.phase === "handed-over" ? "done" : "progress"}>
                    {p.phase === "handed-over" ? "Handed over" : plan.currentMilestone ? `M${plan.currentMilestone}` : "Pre-construction"}
                  </StatusChip>
                ) : (
                  <StatusChip tone={draft ? "locked" : "waiting"}>{draft ? "Draft" : "No plan"}</StatusChip>
                )}
                <Icon name="arrow" className="size-4 text-ink-soft" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
