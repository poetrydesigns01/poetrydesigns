/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useId, useState, type MouseEvent, type ReactNode } from "react";
import { field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { PersonId } from "@/lib/firm-data";
import { addDays, daysBetween, formatShortDate } from "@/lib/format";
import type { SiteTaskView, TaskMaterialView } from "@/lib/portal";
import {
  Icon,
  ProgressBar,
  ResourceBadge,
  dateSpan,
  drawingSummary,
  labourSummary,
  materialChip,
  lockWords,
  materialSummary,
  requestHref,
  taskTone,
  type IconName,
} from "./site-kit";

// One site task as a card. Closed, it is the title, the progress bar and three status
// chips (material, crew, drawing). Open, it lists those resources with one action each and
// takes a quick progress update.

const TRADES = [
  "Bar bending crew",
  "Shuttering crew",
  "Masonry crew",
  "Pour crew and pump",
  "Tiling crew",
  "Electrician",
  "Plumber",
  "Helper",
];

function Section({ icon, title, action, children }: { icon: IconName; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <p className="lettering flex items-center gap-1.5 text-ink-soft">
          <Icon name={icon} className="size-4.5 text-laterite" />
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Steps to tick, or a ±10 stepper, and one Update press (with the pause). */
function ProgressEditor({ task, person }: { task: SiteTaskView; person: PersonId }) {
  const demo = useDemo();
  const pause = usePause();
  const id = useId();
  const steps = task.steps ?? [];
  const [stepsDone, setStepsDone] = useState(task.stepsDone ?? 0);
  const [value, setValue] = useState(task.percent);
  const percent = steps.length > 0 ? Math.round((stepsDone / steps.length) * 100) : value;
  const changed = steps.length > 0 ? stepsDone !== (task.stepsDone ?? 0) : value !== task.percent;
  const busy = pause.pending !== null;

  const save = (event: MouseEvent<HTMLButtonElement>) => {
    if (busy || !changed) return;
    const { record } = demo;
    const body = {
      kind: "site-task.progress" as const,
      projectId: task.projectId,
      taskId: task.id,
      percent,
      stepsDone: steps.length > 0 ? stepsDone : undefined,
      by: person,
    };
    pause.start({ what: `${task.title}, ${percent}%`, origin: event.currentTarget, commit: () => record(body) });
  };

  return (
    <div className="grid gap-2" role="group" aria-labelledby={id}>
      <p id={id} className="lettering text-ink-soft">
        Update progress
      </p>
      {steps.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {steps.map((step, i) => {
            const done = i < stepsDone;
            return (
              <button
                key={step}
                type="button"
                aria-pressed={done}
                onClick={() => setStepsDone(done && i === stepsDone - 1 ? i : i + 1)}
                className="chip justify-start gap-2"
              >
                <span className={`grid size-5 place-items-center rounded-full border ${done ? "border-lime" : "border-ink/30"}`}>
                  {done && <Icon name="check" className="size-3.5" />}
                </span>
                <span className="min-w-0 text-15">{step}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            className="btn btn-glass btn-icon"
            aria-label="10% less"
            disabled={value <= 0}
            onClick={() => setValue(Math.max(0, Math.ceil(value / 10) * 10 - 10))}
          >
            −
          </button>
          <output className="glass-inner figure grid min-w-20 flex-1 place-items-center text-22" aria-live="polite">
            {value}%
          </output>
          <button
            type="button"
            className="btn btn-glass btn-icon"
            aria-label="10% more"
            disabled={value >= 100}
            onClick={() => setValue(Math.min(100, Math.floor(value / 10) * 10 + 10))}
          >
            +
          </button>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="figure text-15 text-ink-soft">
          {task.percent}% → <span className="text-ink">{percent}%</span>
        </span>
        <button type="button" className="btn btn-glass btn-sm" aria-disabled={busy || !changed ? true : undefined} onClick={save}>
          Update
        </button>
      </div>
    </div>
  );
}

function MaterialRow({ task, m }: { task: SiteTaskView; m: TaskMaterialView }) {
  const firm = useFirm();
  const chip = materialChip(m, firm);
  const toRequest = m.status === "to-request" && !m.requestNo;
  const late = toRequest && m.daysToRequest < 0;
  const words = (
    <span className="grid min-w-0 flex-1 basis-44 gap-0.5">
      <span className="text-15 text-ink">{m.label}</span>
      <span className="flex flex-wrap gap-x-3 text-13 text-ink-soft">
        <span>Need {formatShortDate(m.neededBy)}</span>
        {toRequest ? (
          late ? (
            <span className="late-text">Request {-m.daysToRequest} d late</span>
          ) : (
            <span>Request by {formatShortDate(m.requestBy)}</span>
          )
        ) : (
          m.requestNo && <span className="underline underline-offset-2">{m.requestNo.replace("MR-2026-", "MR ")}</span>
        )}
        {m.poNos.length > 0 && <span>{m.poNos.map((no) => no.replace("PO-2026-", "PO ")).join(", ")}</span>}
      </span>
    </span>
  );
  if (!toRequest && m.requestNo) {
    return (
      <li>
        <Link
          href={`/staff/site/requests/${m.requestNo}`}
          className="glass-inner flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-2 transition-colors hover:bg-white/70"
        >
          {words}
          <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
        </Link>
      </li>
    );
  }
  return (
    <li className="glass-inner flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-3 py-2">
      {words}
      {toRequest ? (
        <Link href={requestHref(task, m)} className="btn btn-glass gap-1.5 btn-sm">
          <Icon name="plus" className="size-4.5" />
          Request
        </Link>
      ) : (
        <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
      )}
    </li>
  );
}

/** Ask for a crew or a service: trade, days, start. Sent with the pause. */
function WorkOrderForm({ task, person, onDone }: { task: SiteTaskView; person: PersonId; onDone: () => void }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const ids = useId();
  const trades = [...new Set([...TRADES, ...firm.workOrders.map((w) => w.trade)])];
  const [trade, setTrade] = useState(task.workOrders[0]?.trade ?? TRADES[0]);
  const [days, setDays] = useState(3);
  const [startOn, setStartOn] = useState(task.plannedStart >= TODAY ? task.plannedStart : addDays(TODAY, 1));
  const busy = pause.pending !== null;

  const send = (event: MouseEvent<HTMLButtonElement>) => {
    if (busy) return;
    const { record } = demo;
    const body = { kind: "work-order.requested" as const, projectId: task.projectId, taskId: task.id, trade, days, startOn, by: person };
    pause.start({
      verb: "Sending",
      what: `${trade} for ${task.title}`,
      origin: event.currentTarget,
      commit: () => {
        record(body);
        onDone();
      },
    });
  };

  return (
    <div className="glass-inner grid gap-3 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-trade`} className="lettering text-ink-soft">
            Crew or service
          </label>
          <select id={`${ids}-trade`} value={trade} onChange={(e) => setTrade(e.target.value)} className={`${field} mt-1`}>
            {trades.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${ids}-start`} className="lettering text-ink-soft">
            Start
          </label>
          <input
            id={`${ids}-start`}
            type="date"
            min={TODAY}
            value={startOn}
            onChange={(e) => e.target.value && setStartOn(e.target.value)}
            className={`${field} mt-1`}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2" role="group" aria-label="Days">
          <button
            type="button"
            className="btn btn-glass btn-icon"
            aria-label="One day less"
            disabled={days <= 1}
            onClick={() => setDays(days - 1)}
          >
            −
          </button>
          <output className="figure min-w-16 text-center text-17" aria-live="polite">
            {days} {days === 1 ? "day" : "days"}
          </output>
          <button type="button" className="btn btn-glass btn-icon" aria-label="One day more" onClick={() => setDays(days + 1)}>
            +
          </button>
        </div>
        <button type="button" className="btn btn-glass gap-1.5 btn-sm" aria-disabled={busy ? true : undefined} onClick={send}>
          <Icon name="send" className="size-4.5" />
          Send work order
        </button>
      </div>
    </div>
  );
}

/** A task opened: a quick progress update, then its materials, crews and drawings, one action each. */
export function TaskDetail({
  id,
  task,
  person,
  className = "",
}: {
  id?: string;
  task: SiteTaskView;
  person: PersonId;
  className?: string;
}) {
  const [ordering, setOrdering] = useState(false);
  return (
    <div id={id} className={`grid gap-4 border-t border-ink/10 px-4 pt-3 pb-4 ${className}`}>
      {task.locked ? (
        <p className="flex items-center gap-2 text-15 text-ink">
          <Icon name="lock" className="size-4.5 text-brass-deep" />
          {lockWords(task.n)}
        </p>
      ) : (
        task.track !== "design" && <ProgressEditor key={`${task.percent}-${task.stepsDone ?? 0}`} task={task} person={person} />
      )}

      {!(task.track === "design" && task.materials.length === 0) && (
        <Section
          icon="box"
          title="Materials"
          action={
            <Link href={requestHref(task)} className="link inline-flex min-h-11 items-center text-15 text-ink">
              Request
            </Link>
          }
        >
          {task.materials.length === 0 ? (
            <p className="text-15 text-ink-soft">None</p>
          ) : (
            <ul className="grid gap-1.5">
              {task.materials.map((m) => (
                <MaterialRow key={m.key} task={task} m={m} />
              ))}
            </ul>
          )}
        </Section>
      )}

      <Section
        icon="crew"
        title="Labour and services"
        action={
          <button
            type="button"
            className="link inline-flex min-h-11 items-center text-15 text-ink"
            aria-expanded={ordering}
            onClick={() => setOrdering(!ordering)}
          >
            {ordering ? "Close" : "Work order"}
          </button>
        }
      >
        {ordering && <WorkOrderForm task={task} person={person} onDone={() => setOrdering(false)} />}
        {task.workOrders.length === 0 ? (
          !ordering && <p className="text-15 text-ink-soft">None</p>
        ) : (
          <ul className="grid gap-1.5">
            {task.workOrders.map((w) => (
              <li key={w.id} className="glass-inner flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
                <div className="grid min-w-0 flex-1 basis-44 gap-0.5">
                  <p className="text-15 text-ink">{w.trade}</p>
                  <p className="text-13 text-ink-soft">
                    {[w.crew, `${w.days} d from ${formatShortDate(w.startOn)}`, w.id.replace("WO-2026-", "WO ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <StatusChip tone={w.tone}>{w.statusWords}</StatusChip>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {task.drawings.length > 0 && (
        <Section icon="sheet" title="Drawings">
          <ul className="grid gap-1.5">
            {task.drawings.map((d) => (
              <li key={d.id} className="glass-inner flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2">
                <div className="grid min-w-0 flex-1 basis-44 gap-0.5">
                  <p className="text-15 text-ink">
                    <span className="figure">{d.sheet}</span> {d.title}
                  </p>
                  <p className="text-13 text-ink-soft">
                    {d.byName} ·{" "}
                    {d.status === "received" && d.receivedAt ? `In ${formatShortDate(d.receivedAt)}` : `Due ${formatShortDate(d.neededBy)}`}
                  </p>
                </div>
                <StatusChip tone={d.tone}>
                  {d.status === "received" ? "Received" : d.daysLate > 0 ? `${d.daysLate} d late` : "Awaited"}
                </StatusChip>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

/** Late, locked, or with the client: the chips a task's head carries. */
export function TaskFlags({
  task,
  lock = true,
}: {
  task: SiteTaskView;
  /** False under a head that already says locked. */ lock?: boolean;
}) {
  return (
    <>
      {task.late && <StatusChip tone="late">{task.state === "not-started" ? "Late start" : "Late"}</StatusChip>}
      {lock && task.locked && <StatusChip tone="locked">Locked</StatusChip>}
      {task.waitingForClient && !task.locked && <StatusChip tone="waiting">With client</StatusChip>}
    </>
  );
}

export function TaskCard({
  task,
  person,
  ownerName,
}: {
  task: SiteTaskView;
  person: PersonId;
  /** Shown when the list mixes people's tasks. */
  ownerName?: string;
}) {
  const ids = useId();
  const firm = useFirm();
  const [open, setOpen] = useState(false);
  const tone = taskTone(task);
  const mat = materialSummary(task.materials, firm);
  const lab = labourSummary(task);
  const drw = drawingSummary(task);
  const startsIn = daysBetween(TODAY, task.plannedStart);
  const next = task.materials.find((m) => m.status === "to-request" && !m.requestNo);
  const resources = Boolean(mat || lab || drw || next);

  return (
    <article className="glass" aria-labelledby={`${ids}-title`}>
      <button
        type="button"
        className={`site-task-head ${resources ? "site-task-head-tight" : ""}`}
        aria-expanded={open}
        aria-controls={`${ids}-body`}
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="grid min-w-0 gap-0.5">
            <span id={`${ids}-title`} className="text-17 font-semibold text-ink">
              {task.title}
            </span>
            {(task.area || ownerName) && (
              <span className="truncate text-13 text-ink-soft">{[task.area, ownerName].filter(Boolean).join(" · ")}</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className={`figure text-22 ${tone === "late" ? "late-text" : "text-ink"}`}>
              {task.percent}
              <span className="text-15">%</span>
            </span>
            <Icon name="chevron" className="site-chevron size-5 text-ink-soft" />
          </span>
        </span>
        <ProgressBar value={task.percent} tone={tone} />
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-13 text-ink-soft">
            <Icon name="calendar" className="size-4.5" />
            {dateSpan(task.plannedStart, task.plannedEnd)}
          </span>
          <TaskFlags task={task} />
          {task.state === "not-started" && !task.locked && !task.late && startsIn > 0 && startsIn <= 7 && (
            <StatusChip tone="waiting">Starts in {startsIn} d</StatusChip>
          )}
        </span>
      </button>

      {resources && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-3">
          {mat && <ResourceBadge icon="box" name="Materials" summary={mat} />}
          {lab && <ResourceBadge icon="crew" name="Labour" summary={lab} />}
          {drw && <ResourceBadge icon="sheet" name="Drawings" summary={drw} />}
          {next && (
            <Link href={requestHref(task, next)} className="btn btn-glass btn-sm ml-auto gap-1.5" aria-label={`Request ${next.label}`}>
              <Icon name="plus" className="size-4.5" />
              Request
            </Link>
          )}
        </div>
      )}

      {open && <TaskDetail id={`${ids}-body`} task={task} person={person} />}
    </article>
  );
}
