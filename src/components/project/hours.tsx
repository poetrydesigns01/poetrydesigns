/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useState, type FormEvent } from "react";
import { dayWords } from "@/components/admin/admin-data";
import { Count, Empty, Icon, Meter, Panel } from "@/components/admin/glass-kit";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { useStaffRole } from "@/components/register/staff-shell";
import { StatusChip } from "@/components/register/status-chip";
import { stampNow } from "@/lib/clock";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm, useProjection } from "@/lib/demo-store";
import type { CreditAddition, FirmEvent, Pool, ProjectId } from "@/lib/firm-data";
import { formatStampShort, hours, inr } from "@/lib/format";
import { ClientRequests } from "./requests";

// The client's requests on this project (more hours, design changes), answered by the Project
// Head with the fee worked out on approval; then the two pools as cards with a meter, the
// sessions logged against them, and hours bought. Only the admin changes a pool (with a
// reason, kept in the log) or adds hours the client paid for offline.

const POOL_NAME = { before: "Before construction", during: "During construction" } as const;

type Form = "add" | "change" | null;

export function ProjectHours({ projectId }: { projectId: ProjectId }) {
  const demo = useDemo();
  const firm = useFirm();
  const projection = useProjection();
  const role = useStaffRole();
  const [form, setForm] = useState<Form>(null);
  const p = firm.project(projectId);
  const credit = firm.credits.find((c) => c.projectId === projectId);
  // BD sees only what was escalated to them; routine hour and design requests are the head's.
  const bd = role === "bd";
  const requests = firm.requestsFor(projectId).filter((r) => !bd || r.escalation);
  const requestsTitle = bd ? "Escalations" : "Requests";
  const noRequests = bd ? "No escalations" : "No requests";
  if (!p || p.phase === "draft") return null;
  if (!credit) return <ClientRequests title={requestsTitle} requests={requests} empty={noRequests} />;

  const sessions =
    projectId === "iyer"
      ? projection.credits.sessions.map((s) => ({ id: s.id, date: s.date, topic: s.topic, with: s.with, hours: s.hours }))
      : firm.time
          .filter((t) => t.consultation && t.projectId === projectId)
          .map((t) => ({
            id: t.id,
            date: t.date,
            topic: firm.tasks.find((task) => task.id === t.taskId)?.title ?? "Consultation",
            with: firm.person(t.person)?.name ?? t.person,
            hours: t.hours,
          }))
          .sort((a, b) => b.date.localeCompare(a.date));
  // Hours used before the portal kept sessions, as one line, so the list adds up to the used figure.
  const usedInAll = credit.before.used + credit.during.used;
  const earlierHours = Math.round((usedInAll - sessions.reduce((sum, s) => sum + s.hours, 0)) * 4) / 4;
  const edits = demo.events.filter(
    (e): e is Extract<FirmEvent, { kind: "credits.edited" }> => e.kind === "credits.edited" && e.projectId === projectId,
  );
  const last = edits[edits.length - 1];
  const addedTo = (pool: "before" | "during") =>
    credit.added.filter((a) => a.pool === pool).reduce((sum, a) => sum + a.hours, 0);
  const admin = role === "admin";
  const nothingBought = credit.added.length === 0;

  const openForm = (next: Form) => setForm((f) => (f === next ? null : next));

  return (
    <div className="grid gap-5">
      <ClientRequests id="requests" title={requestsTitle} requests={requests} empty={noRequests} />

      <section aria-label="The pools" className="grid gap-3 sm:grid-cols-2">
        {(["before", "during"] as const).map((pool) => (
          <PoolCard
            key={pool}
            name={POOL_NAME[pool]}
            pool={credit[pool]}
            added={addedTo(pool)}
            current={credit.current === pool}
          />
        ))}
      </section>

      {(admin || last) && (
        <div className="flex flex-wrap items-center gap-3">
          {admin && (
            <>
              <button
                type="button"
                className={`btn min-h-12 gap-2 ${form === "add" ? "btn-glass" : "btn-primary"}`}
                aria-expanded={form === "add"}
                onClick={() => openForm("add")}
              >
                <Icon name="plus" />
                Add hours
              </button>
              <button
                type="button"
                className="btn btn-glass min-h-12"
                aria-expanded={form === "change"}
                onClick={() => openForm("change")}
              >
                Change a pool
              </button>
            </>
          )}
          {last && (
            <span className="glass-chip">
              {POOL_NAME[last.pool]}: {hours(last.from)} → {hours(last.to)} · {formatStampShort(last.at)}
            </span>
          )}
        </div>
      )}

      {admin && form === "add" && (
        <AddBoughtHours
          projectId={projectId}
          projectName={p.name}
          current={credit.current}
          rate={firm.feeRule.ratePerHour}
          onDone={() => setForm(null)}
        />
      )}
      {admin && form === "change" && (
        <ChangeHours projectId={projectId} before={credit.before} during={credit.during} onDone={() => setForm(null)} />
      )}

      <div className={`grid items-start gap-5 ${nothingBought ? "" : "lg:grid-cols-2"}`}>
        <Panel
          title="Sessions"
          aside={
            <span className="flex flex-wrap items-center gap-2">
              {nothingBought && <span className="glass-chip">No hours bought</span>}
              <Count n={sessions.length} />
            </span>
          }
          strong
        >
          {sessions.length === 0 && earlierHours <= 0 ? (
            <Empty>No hours used yet.</Empty>
          ) : (
            <ul className="grid gap-1">
              {sessions.map((s) => (
                <li key={s.id} className="glass-row flex items-center justify-between gap-4 px-3 py-2.5">
                  <span className="grid min-w-0">
                    <span className="truncate text-15 font-semibold">{s.topic}</span>
                    <span className="truncate text-13 text-ink-soft">
                      {dayWords(s.date)} · {s.with}
                    </span>
                  </span>
                  <span className="figure whitespace-nowrap text-15">{hours(s.hours)}</span>
                </li>
              ))}
              {earlierHours > 0 && (
                <li className="glass-row flex items-center justify-between gap-4 px-3 py-2.5">
                  <span className="grid min-w-0">
                    <span className="text-15 font-semibold">Earlier sessions</span>
                    <span className="text-13 text-ink-soft">Before the portal</span>
                  </span>
                  <span className="figure whitespace-nowrap text-15">{hours(earlierHours)}</span>
                </li>
              )}
            </ul>
          )}
        </Panel>

        {!nothingBought && (
          <Panel title="Bought" aside={<Count n={credit.added.length} />}>
            <ul className="grid gap-1">
              {credit.added.map((a) => (
                <li key={a.id} className="glass-row flex items-center justify-between gap-4 px-3 py-2.5">
                  <span className="grid min-w-0">
                    <span className="text-15 font-semibold">+{hours(a.hours)}</span>
                    <span className="text-13 text-ink-soft">
                      {POOL_NAME[a.pool]} · {dayWords(a.receivedOn)} · {a.reference}
                    </span>
                  </span>
                  <span className="figure whitespace-nowrap text-15">{inr(a.amount)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}

function PoolCard({ name, pool, added, current }: { name: string; pool: Pool; added: number; current: boolean }) {
  const left = pool.granted - pool.used;
  const over = left < 0;
  return (
    <div className="glass grid content-start gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-17 font-semibold">{name}</h2>
        {current && <StatusChip tone="progress">In use</StatusChip>}
      </div>
      <p className={`figure text-32 leading-none ${over ? "font-semibold text-brick" : "text-ink"}`}>
        {over ? `${hours(-left)} over` : `${hours(left)} left`}
      </p>
      <Meter value={pool.granted > 0 ? pool.used / pool.granted : 0} tone={over ? "late" : current ? "progress" : "done"} label={`${name}, used`} />
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-13 text-ink-soft">
        <span>
          Used <span className="figure text-ink">{hours(pool.used)}</span>
        </span>
        <span>
          Given <span className="figure text-ink">{hours(pool.granted)}</span>
        </span>
        {added > 0 && <span>+{hours(added)} bought</span>}
      </p>
    </div>
  );
}

/**
 * Admin only: add hours the client has paid for offline, with the payment and a reason,
 * through the pause. Filled in from a request when one is being answered.
 */
function AddBoughtHours({
  projectId,
  projectName,
  current,
  rate,
  onDone,
}: {
  projectId: ProjectId;
  projectName: string;
  current: "before" | "during";
  /** The admin's fee an hour, before GST. */
  rate: number;
  onDone: () => void;
}) {
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const [count, setCount] = useState("");
  const [pool, setPool] = useState<"before" | "during">(current);
  const [amount, setAmount] = useState<string | null>(null);
  const [receivedOn, setReceivedOn] = useState(TODAY);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const value = Number(count);
  // Prefilled at the fee an hour until the admin types what was actually paid.
  const paid = amount === null ? (Number.isFinite(value) ? value * rate : 0) : Number(amount);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    if (!count || !Number.isFinite(value) || value <= 0 || Math.round(value * 2) !== value * 2)
      return setError("Hours in halves, such as 5 or 2.5.");
    if (!(paid > 0)) return setError("Amount received, before GST.");
    if (!reference.trim()) return setError("Add the payment reference.");
    const why = reason.trim();
    if (!why) return setError("Add the reason.");
    setError("");
    const ref = reference.trim();
    pause.start({
      what: `${hours(value)} for ${projectName}`,
      commit: () => {
        const addition: CreditAddition = {
          id: `add-${projectId}-${getDemoSnapshot().events.length + 1}`,
          projectId,
          hours: value,
          pool,
          by: "shalini",
          at: stampNow(),
          amount: paid,
          receivedOn,
          reference: ref,
          reason: why,
        };
        demo.record({ kind: "credits.added", addition, by: "shalini" });
        setCount("");
        setAmount(null);
        setReference("");
        setReason("");
        onDone();
      },
    });
  };

  return (
    <Panel title="Add hours" strong>
      <form onSubmit={submit} className="grid gap-4 px-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hours" htmlFor={`${ids}-hours`}>
            <input
              autoFocus
              id={`${ids}-hours`}
              type="number"
              inputMode="decimal"
              min={0.5}
              step={0.5}
              className={field}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </Field>
          <Field label="Received, before GST" hint={`${inr(rate)} an hour`} htmlFor={`${ids}-amount`}>
            <input
              id={`${ids}-amount`}
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              className={field}
              value={amount ?? (paid > 0 ? String(paid) : "")}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
        </div>
        <ChipGroup label="Pool">
          {(["before", "during"] as const).map((k) => (
            <Chip key={k} pressed={pool === k} onClick={() => setPool(k)}>
              {POOL_NAME[k]}
            </Chip>
          ))}
        </ChipGroup>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Received on" htmlFor={`${ids}-on`}>
            <input
              id={`${ids}-on`}
              type="date"
              className={field}
              value={receivedOn}
              max={TODAY}
              onChange={(e) => setReceivedOn(e.target.value || TODAY)}
            />
          </Field>
          <Field label="UTR / cheque" htmlFor={`${ids}-ref`}>
            <input
              id={`${ids}-ref`}
              type="text"
              className={field}
              value={reference}
              autoComplete="off"
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
          <Field label="Reason" htmlFor={`${ids}-reason`}>
            <input
              id={`${ids}-reason`}
              type="text"
              className={field}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </div>
        {error && (
          <p className="text-15 font-semibold text-brick" role="alert">
            {error}
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-primary min-h-12 w-full sm:w-auto" aria-disabled={pause.pending ? true : undefined}>
            {value > 0 ? `Add ${hours(value)}` : "Add hours"}
          </button>
        </div>
      </form>
    </Panel>
  );
}

/** Admin only: set a pool's hours to a new figure, with a reason. */
function ChangeHours({
  projectId,
  before,
  during,
  onDone,
}: {
  projectId: ProjectId;
  before: Pool;
  during: Pool;
  onDone: () => void;
}) {
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const [pool, setPool] = useState<"before" | "during" | null>(null);
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const from = pool === "before" ? before.granted : pool === "during" ? during.granted : 0;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    const value = Number(to);
    if (!pool) return setError("Choose the pool.");
    if (!to || !Number.isFinite(value) || value < 0 || Math.round(value * 2) !== value * 2)
      return setError("Hours in halves, such as 10 or 10.5.");
    if (value === from) return setError(`Already ${hours(from)}.`);
    if (!reason.trim()) return setError("Add the reason.");
    setError("");
    const why = reason.trim();
    pause.start({
      what: `${POOL_NAME[pool]} hours from ${from} to ${value}`,
      commit: () => {
        demo.record({ kind: "credits.edited", projectId, pool, from, to: value, reason: why, by: "shalini" });
        setTo("");
        setReason("");
        setPool(null);
        onDone();
      },
    });
  };

  return (
    <Panel title="Change a pool" strong aside={pool ? <span className="glass-chip">Now {hours(from)}</span> : undefined}>
      <form onSubmit={submit} className="grid gap-4 px-1">
        <ChipGroup label="Pool">
          {(["before", "during"] as const).map((k) => (
            <Chip key={k} pressed={pool === k} onClick={() => setPool(k)}>
              {POOL_NAME[k]}
            </Chip>
          ))}
        </ChipGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New hours" htmlFor={`${ids}-to`}>
            <input
              id={`${ids}-to`}
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              className={field}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Field label="Reason" htmlFor={`${ids}-why`}>
            <input id={`${ids}-why`} className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        {error && (
          <p className="text-15 font-semibold text-brick" role="alert">
            {error}
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-primary min-h-12 w-full sm:w-auto" aria-disabled={pause.pending ? true : undefined}>
            Save
          </button>
        </div>
      </form>
    </Panel>
  );
}
