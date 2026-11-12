"use client";

import { useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { dayWords } from "@/components/admin/admin-data";
import { TeakCut } from "@/components/instruments/teak-cut";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { SampleTag } from "@/components/register/sample-tag";
import { useStaffRole } from "@/components/register/staff-shell";
import { Stamp } from "@/components/register/stamp";
import { stampNow } from "@/lib/clock";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm, useProjection } from "@/lib/demo-store";
import type { CreditRequestView, StampView } from "@/lib/firm";
import { HOUR_PRICE, type CreditAddition, type FirmEvent, type Pool, type ProjectId } from "@/lib/firm-data";
import { formatStampShort, hours, inr } from "@/lib/format";

// The client's advisory hours on this project: the two pools as lengths of teak, every
// session logged against them, hours bought and added, and hours asked for. Only the admin
// can change a pool's hours, with a reason, and the change is written to the log. The admin
// can also add hours the client has paid for offline, as business development does; an open
// request opens that form already filled in.

const POOL_NAME = { before: "Before construction", during: "During construction" } as const;

function poolWords(pool: Pool, current: boolean): string {
  const left = pool.granted - pool.used;
  const over = left < 0 ? `${hours(-left)} over.` : `${hours(left)} left.`;
  return `${hours(pool.granted)} given, ${hours(pool.used)} used, ${over}${current ? " This is the pool in use now." : ""}`;
}

export function ProjectHours({ projectId }: { projectId: ProjectId }) {
  const demo = useDemo();
  const firm = useFirm();
  const projection = useProjection();
  const role = useStaffRole();
  const [answering, setAnswering] = useState<CreditRequestView | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const p = firm.project(projectId);
  const credit = firm.credits.find((c) => c.projectId === projectId);
  if (!p || p.phase === "draft") return null;
  if (!credit) return <p className="py-4 text-17 text-ink-soft">No advisory hours are set for this project yet.</p>;

  const sessions =
    projectId === "iyer"
      ? projection.credits.sessions.map((s) => ({
          id: s.id,
          date: s.date,
          words: `${s.topic}, with ${s.with}`,
          hours: s.hours,
        }))
      : firm.time
          .filter((t) => t.consultation && t.projectId === projectId)
          .map((t) => ({
            id: t.id,
            date: t.date,
            words: `${firm.tasks.find((task) => task.id === t.taskId)?.title ?? "Consultation"}, with ${firm.person(t.person)?.name ?? t.person}`,
            hours: t.hours,
          }))
          .sort((a, b) => b.date.localeCompare(a.date));
  // Hours used before the portal kept sessions, as one line, so the list adds up to the used figure.
  const usedInAll = credit.before.used + credit.during.used;
  const earlierHours = Math.round((usedInAll - sessions.reduce((sum, s) => sum + s.hours, 0)) * 4) / 4;
  const edits = demo.events.filter(
    (e): e is Extract<FirmEvent, { kind: "credits.edited" }> =>
      e.kind === "credits.edited" && e.projectId === projectId,
  );
  const last = edits[edits.length - 1];
  const lastEdit = last
    ? { words: `${POOL_NAME[last.pool]} hours changed from ${last.from} to ${last.to}`, at: last.at, by: last.by }
    : undefined;
  const requests = firm.creditRequests.filter((r) => r.projectId === projectId);
  const addedTo = (pool: "before" | "during") =>
    credit.added.filter((a) => a.pool === pool).reduce((sum, a) => sum + a.hours, 0);

  return (
    <div className="grid gap-12">
      <section aria-label="The pools" className="grid gap-6">
        <h2 className="register-title">The hours</h2>
        <div className="grid gap-8 lg:grid-cols-2">
          {(["before", "during"] as const).map((pool) => (
            <div key={pool} className="grid content-start gap-2">
              <h3 className="text-17 font-semibold">{POOL_NAME[pool]}</h3>
              <TeakCut
                granted={credit[pool].granted}
                used={credit[pool].used}
                added={addedTo(pool)}
                label={poolWords(credit[pool], credit.current === pool)}
              />
            </div>
          ))}
        </div>
        {credit.low && credit.over === 0 && <p className="text-17 font-semibold">Hours are low in the pool in use.</p>}
        {credit.over > 0 && <p className="text-17 font-semibold">Over the allowance. Logging is never blocked.</p>}
      </section>

      {role === "admin" && (
        <div className="staff-columns">
          <AddBoughtHours
            key={answering?.id ?? "unasked"}
            projectId={projectId}
            projectName={p.name}
            current={credit.current}
            request={answering}
            clientWords={p.clientWord === "Meera" ? "Meera" : "The client"}
            inputRef={addRef}
            onDone={() => setAnswering(null)}
          />
          <ChangeHours projectId={projectId} before={credit.before} during={credit.during} lastEdit={lastEdit} />
        </div>
      )}
      {role !== "admin" && lastEdit && (
        <p>
          <Stamp stamp={lastEdit} />
        </p>
      )}

      <div className="staff-columns">
        <section aria-label="Sessions" className="grid content-start gap-3">
          <h2 className="register-title">Sessions</h2>
          {sessions.length === 0 && earlierHours <= 0 ? (
            <p className="py-4 text-17 text-ink-soft">No hours have been used on this project yet.</p>
          ) : (
            <ul className="sheet-rows ruled">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-17">{s.words}</span>
                    <span className="lettering text-ink-soft">{dayWords(s.date)}</span>
                  </span>
                  <span className="figure whitespace-nowrap text-17">{hours(s.hours)}</span>
                </li>
              ))}
              {earlierHours > 0 && (
                <li className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-17">Earlier sessions</span>
                    <span className="lettering text-ink-soft">Logged before the portal, as one total</span>
                  </span>
                  <span className="figure whitespace-nowrap text-17">{hours(earlierHours)}</span>
                </li>
              )}
            </ul>
          )}
        </section>

        <section aria-label="Hours bought and asked for" className="grid content-start gap-3">
          <h2 className="register-title flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span>Bought and asked for</span>
            {/* The admin's form carries the price's tag, and a tag is said once a screen. */}
            {role !== "admin" && <SampleTag>{`${inr(HOUR_PRICE)} an hour before GST is a sample`}</SampleTag>}
          </h2>
          {credit.added.length === 0 && requests.length === 0 ? (
            <p className="py-4 text-17 text-ink-soft">No hours have been bought or asked for.</p>
          ) : (
            <ul className="sheet-rows ruled">
              {credit.added.map((a) => (
                <li key={a.id} className="grid gap-0.5">
                  <p className="text-17">
                    {hours(a.hours)} added to {POOL_NAME[a.pool].toLowerCase()}
                  </p>
                  <p className="max-w-[56ch] text-15 text-ink-soft">
                    By {firm.person(a.by)?.name ?? a.by}, {formatStampShort(a.at)}, after {inr(a.amount)} before GST was
                    received on {dayWords(a.receivedOn)}, {a.reference}. {a.reason}
                  </p>
                </li>
              ))}
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-17">
                      {r.by} asked for {hours(r.hours)}
                    </p>
                    <p className="text-15 text-ink-soft">
                      {dayWords(r.at)}. {r.open ? "Not added yet. The hours are added once the payment is in." : "Added."}
                    </p>
                  </div>
                  {role === "admin" && r.open && answering?.id !== r.id && (
                    <button
                      type="button"
                      className="btn btn-quiet min-h-11"
                      onClick={() => {
                        setAnswering(r);
                        // The form is filled in for this request, and its first field takes focus.
                        window.setTimeout(() => addRef.current?.focus(), 0);
                      }}
                    >
                      Add these hours
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Admin only: add hours the client has paid for offline, with the payment and a reason,
 * through the pause. The client sees them on their hours page and the accountant among the
 * hours bought. Filled in from a request when one is being answered.
 */
function AddBoughtHours({
  projectId,
  projectName,
  current,
  request,
  clientWords,
  inputRef,
  onDone,
}: {
  projectId: ProjectId;
  projectName: string;
  current: "before" | "during";
  request: CreditRequestView | null;
  clientWords: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onDone: () => void;
}) {
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const [count, setCount] = useState(request ? String(request.hours) : "");
  const [pool, setPool] = useState<"before" | "during">(current);
  const [amount, setAmount] = useState<string | null>(null);
  const [receivedOn, setReceivedOn] = useState(TODAY);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const value = Number(count);
  // Prefilled at the sample price until the admin types what was actually paid.
  const paid = amount === null ? (Number.isFinite(value) ? value * HOUR_PRICE : 0) : Number(amount);
  const asked = request ? `${request.by} asked on ${dayWords(request.at)}.` : "";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    if (!count || !Number.isFinite(value) || value <= 0 || Math.round(value * 2) !== value * 2)
      return setError("Write the hours to add, in half hours, such as 5 or 2.5.");
    if (!(paid > 0)) return setError("Write how much was received, before GST.");
    if (!reference.trim()) return setError("Add the payment reference, such as the UTR number.");
    const why = reason.trim() || asked;
    if (!why) return setError("Write the reason. It is kept in the log.");
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
    <section aria-label="Add bought hours" className="grid content-start gap-3">
      <h2 className="register-title">Add bought hours</h2>
      {request && (
        <p className="text-17">
          For {request.by}, who asked for {hours(request.hours)} on {dayWords(request.at)}.
        </p>
      )}
      <form onSubmit={submit} className="grid gap-4">
        {/* Bottom-aligned, so both inputs sit level although only one label carries a hint. */}
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div>
            <label htmlFor={`${ids}-hours`} className="block text-15 font-semibold">
              Hours to add
            </label>
            <input
              ref={inputRef}
              id={`${ids}-hours`}
              type="number"
              inputMode="decimal"
              min={0.5}
              step={0.5}
              className={`${field} mt-1.5`}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`${ids}-amount`} className="block text-15 font-semibold">
              Received, before GST
            </label>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-15 text-ink-soft">
              <span>{inr(HOUR_PRICE)} an hour</span>
              <SampleTag />
            </p>
            <input
              id={`${ids}-amount`}
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              className={`${field} mt-1.5`}
              value={amount ?? (paid > 0 ? String(paid) : "")}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <ChipGroup label="Pool">
          {(["before", "during"] as const).map((k) => (
            <Chip key={k} pressed={pool === k} onClick={() => setPool(k)}>
              {POOL_NAME[k]}
            </Chip>
          ))}
        </ChipGroup>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Field label="Reference" hint="UTR or cheque number" htmlFor={`${ids}-ref`}>
            <input
              id={`${ids}-ref`}
              type="text"
              className={field}
              value={reference}
              autoComplete="off"
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Reason" hint="Kept with the hours in the log" htmlFor={`${ids}-reason`}>
          <input
            id={`${ids}-reason`}
            type="text"
            className={field}
            value={reason}
            placeholder={asked || undefined}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        {error && (
          <p className="text-15 font-semibold text-brick" role="alert">
            {error}
          </p>
        )}
        <div>
          <button
            type="submit"
            className="btn btn-primary min-h-12 w-full sm:w-auto"
            aria-disabled={pause.pending ? true : undefined}
            aria-describedby={`${ids}-copy`}
          >
            {value > 0 ? `Add ${hours(value)}` : "Add the hours"}
          </button>
          <p id={`${ids}-copy`} className="mt-2 text-15 text-ink-soft">
            {clientWords} and the accountant are emailed a copy.
          </p>
        </div>
      </form>
    </section>
  );
}

/** Admin only: set a pool's hours to a new figure, with a reason. */
function ChangeHours({
  projectId,
  before,
  during,
  lastEdit,
}: {
  projectId: ProjectId;
  before: Pool;
  during: Pool;
  lastEdit?: StampView;
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
    if (!pool) return setError("Choose the pool to change.");
    if (!to || !Number.isFinite(value) || value < 0 || Math.round(value * 2) !== value * 2)
      return setError("Write the new number of hours, in half hours, such as 10 or 10.5.");
    if (value === from) return setError(`The pool already has ${hours(from)}.`);
    if (!reason.trim()) return setError("Write the reason. It is kept in the log.");
    setError("");
    const why = reason.trim();
    pause.start({
      what: `${POOL_NAME[pool]} hours from ${from} to ${value}`,
      commit: () => {
        demo.record({ kind: "credits.edited", projectId, pool, from, to: value, reason: why, by: "shalini" });
        setTo("");
        setReason("");
        setPool(null);
      },
    });
  };

  return (
    <section aria-label="Change hours" className="grid max-w-[40rem] gap-3">
      <h2 className="register-title">Change hours</h2>
      {lastEdit && <Stamp stamp={lastEdit} />}
      <form onSubmit={submit} className="grid gap-4">
        <ChipGroup label="Pool">
          {(["before", "during"] as const).map((k) => (
            <Chip key={k} pressed={pool === k} onClick={() => setPool(k)}>
              {POOL_NAME[k]}
            </Chip>
          ))}
        </ChipGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${ids}-to`} className="block text-15 font-semibold">
              New hours given
            </label>
            <input
              id={`${ids}-to`}
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              className={`${field} mt-1.5`}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`${ids}-why`} className="block text-15 font-semibold">
              Reason
            </label>
            <input
              id={`${ids}-why`}
              className={`${field} mt-1.5`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        {pool && (
          <p className="text-17">{`${POOL_NAME[pool]} now has ${hours(from)}${to ? `; this sets it to ${hours(Number(to) || 0)}` : ""}.`}</p>
        )}
        {error && (
          <p className="text-15 font-semibold text-brick" role="alert">
            {error}
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-quiet min-h-12" aria-disabled={pause.pending ? true : undefined}>
            Change the hours
          </button>
        </div>
      </form>
    </section>
  );
}
