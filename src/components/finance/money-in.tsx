/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useRef, useState, type ReactElement, type ReactNode } from "react";
import { inrShort } from "@/components/admin/glass-kit";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { useScope } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { CountPill, StatStrip } from "@/components/site/site-kit";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm, useViewer } from "@/lib/demo-store";
import type { PersonId } from "@/lib/firm-data";
import { addDays, formatShortDate, formatStampShort, inr } from "@/lib/format";
import type { PaymentStageView } from "@/lib/portal";
import { focusReturn } from "./focus-return";
import { isOverdue, weekLanes, weekShort } from "./instalment-weeks";
import { ProjectLink, usePanel, type Panel } from "./rows";
import { InstalmentTrack, WeekBoard } from "./week-board";
import { hasFinance, inScope, rupeesFrom } from "./shared";

// Money in, the Accounts & Finance side of each project's tracker. Instalments of every
// project by the week they fall due (overdue, this week, the weeks ahead), then the queues:
// payments a client has marked made, to confirm against the bank; letters to raise for
// instalments whose week has come; letters out; and what came in this month. Last, each
// project's instalment track on the workbook's weeks.

type Source = "bank" | "client";

// Name and amount on the first line, the amount in a fixed column near the name; the
// status and the row's one action on the second.
const ROW = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-3 py-3";

export function MoneyIn() {
  const firm = useFirm();
  const me = useViewer("finance");
  const scope = useScope("finance");
  const demo = useDemo();
  const panel = usePanel();
  const finance = hasFinance(me);
  const accountant = firm.people.find((p) => p.role === "finance" && hasFinance(p));

  const stages = inScope(firm.paymentStages, scope);
  const { overdue, lanes, later } = weekLanes(stages);
  const thisWeek = lanes[0];
  const ahead = lanes.slice(1);
  const aheadTotal = ahead.reduce((t, l) => t + l.total, 0);
  const aheadCount = ahead.reduce((t, l) => t + l.items.length, 0);

  const toConfirm = stages
    .filter((s) => s.state === "client-paid")
    .sort((a, b) => (a.clientPaidAt ?? "").localeCompare(b.clientPaidAt ?? ""));
  // Its week has come: the letter goes out. Ones the client asked for first.
  const toRaise = stages
    .filter((s) => s.state === "work-done")
    .sort(
      (a, b) =>
        Number(!a.letterRequestedAt) - Number(!b.letterRequestedAt) || a.expectedDueDate.localeCompare(b.expectedDueDate),
    );
  const awaiting = stages.filter((s) => s.state === "due").sort((a, b) => b.overdueDays - a.overdueDays);
  const month = TODAY.slice(0, 7);
  const received = stages
    .filter((s) => s.receivedAt?.startsWith(month))
    .sort((a, b) => (b.receivedAt ?? "").localeCompare(a.receivedAt ?? ""));
  const additions = inScope(firm.additions, scope)
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);
  const trackProjects = firm.projects
    .filter((p) => (scope === "all" ? p.phase !== "draft" : p.id === scope))
    .map((p) => p.id);

  const headline =
    toConfirm.length > 0
      ? `${toConfirm.length} to confirm`
      : toRaise.length > 0
        ? `${toRaise.length} ${toRaise.length === 1 ? "letter" : "letters"} to raise`
        : thisWeek.items.length > 0
          ? `${inr(thisWeek.total)} this week`
          : "All received";
  const state = overdue.items.length > 0 ? `${overdue.items.length} overdue` : undefined;

  const nameOf = (s: PaymentStageView) => firm.project(s.projectId)?.name ?? s.projectId;

  return (
    <>
      <StaffBoard place="Money in" headline={headline} state={state} />

      <div className="mt-6 grid gap-3">
        <StatStrip
          label="Totals"
          items={[
            {
              icon: "alert",
              label: `Overdue · ${overdue.items.length} due`,
              value: inrShort(overdue.total),
              alert: overdue.items.length > 0,
            },
            { icon: "calendar", label: `This week · ${thisWeek.items.length} due`, value: inrShort(thisWeek.total) },
            { icon: "clock", label: `${ahead.length} weeks · ${aheadCount} due`, value: inrShort(aheadTotal) },
            {
              icon: "check",
              label: `${toConfirm.length} to confirm`,
              value: inrShort(toConfirm.reduce((t, s) => t + s.outstanding, 0)),
              alert: toConfirm.length > 0,
            },
          ]}
        />
        {!finance && accountant && (accountant.id === "divya" || accountant.id === "prakash") && (
          <div className="glass flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <StatusChip tone="locked">View only</StatusChip>
            {/* Only the accountant confirms money in: switch the demo viewer to them. */}
            <button
              type="button"
              className="btn btn-glass min-h-11 text-15"
              onClick={() => demo.setViewer("finance", accountant.id as "divya" | "prakash")}
            >
              See as {accountant.first}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6">
        <WeekBoard overdue={overdue} lanes={lanes} later={later} />

        <Queues>
        <Block id="confirm" title="Client says paid" count={toConfirm.length} empty="Nothing to confirm">
          {toConfirm.map((s) => (
            <StageRow
              key={`${s.projectId}:${s.n}`}
              stage={s}
              name={nameOf(s)}
              meta={
                <>
                  <StatusChip tone="waiting">Payment made</StatusChip>
                  <span className="text-13 text-ink-soft">
                    {s.clientRef ? `Ref ${s.clientRef}` : "No ref"}
                    {s.clientPaidAt ? ` · ${formatStampShort(s.clientPaidAt)}` : ""}
                  </span>
                </>
              }
              action={finance ? <ConfirmToggle stage={s} name={nameOf(s)} panel={panel} label="Confirm receipt" /> : undefined}
              panel={
                finance && panel.isOpen(rowId(s)) ? <ConfirmReceipt stage={s} name={nameOf(s)} person={me.id} onDone={panel.close} /> : null
              }
            />
          ))}
        </Block>

        <Block id="raise" title="Letters to raise" count={toRaise.length} empty="None due">
          {toRaise.map((s) => (
            <StageRow
              key={`${s.projectId}:${s.n}`}
              stage={s}
              name={nameOf(s)}
              meta={
                <>
                  <StatusChip tone={isOverdue(s) ? "late" : "waiting"}>{s.status}</StatusChip>
                  <span className="text-13 text-ink-soft">
                    {s.letterRequestedAt ? formatStampShort(s.letterRequestedAt) : `Week of ${formatShortDate(s.expectedDueDate)}`}
                  </span>
                </>
              }
              action={finance ? <RaiseLetter stage={s} name={nameOf(s)} person={me.id} /> : undefined}
            />
          ))}
        </Block>

        <Block id="awaited" title="Letters out" count={awaiting.length} empty="No letters open">
          {awaiting.map((s) => (
            <StageRow
              key={`${s.projectId}:${s.n}`}
              stage={s}
              name={nameOf(s)}
              meta={
                <>
                  <StatusChip tone={s.overdueDays > 0 ? "late" : "done"}>{s.overdueDays > 0 ? s.status : "Letter raised"}</StatusChip>
                  <span className="text-13 text-ink-soft">
                    {s.letterNo?.split("/").pop()}
                    {s.dueDate ? ` · due ${formatShortDate(s.dueDate)}` : ""}
                    {s.received > 0 ? ` · ${inr(s.received)} in` : ""}
                  </span>
                </>
              }
              action={finance ? <ConfirmToggle stage={s} name={nameOf(s)} panel={panel} label="Record receipt" /> : undefined}
              panel={
                finance && panel.isOpen(rowId(s)) ? <ConfirmReceipt stage={s} name={nameOf(s)} person={me.id} onDone={panel.close} /> : null
              }
            />
          ))}
        </Block>

        <Block id="received" title="Received this month" count={received.length} empty="Nothing in yet">
          {received.map((s) => (
            <StageRow
              key={`${s.projectId}:${s.n}`}
              stage={s}
              name={nameOf(s)}
              amount={s.received}
              meta={
                <>
                  <StatusChip tone="done">Received</StatusChip>
                  {s.receivedAt && <span className="text-13 text-ink-soft">{formatShortDate(s.receivedAt)}</span>}
                </>
              }
            />
          ))}
        </Block>

        {additions.length > 0 && (
          <Block id="hours" title="Hours bought" count={additions.length}>
            {additions.map((a) => (
              <li key={a.id} className={`glass-row ${ROW}`}>
                <span className="grid min-w-0">
                  <ProjectLink id={a.projectId} name={firm.project(a.projectId)?.name ?? a.projectId} className="flex items-center justify-self-start text-15 font-semibold max-md:min-h-11" />
                  <span className="text-13 text-ink-soft">{a.hours} hours</span>
                </span>
                <span className="figure min-w-24 text-right text-15">{inr(a.amount)}</span>
                <span className="col-span-2 flex flex-wrap items-center gap-2">
                  <StatusChip tone="done">Received</StatusChip>
                  <span className="text-13 text-ink-soft">
                    {formatShortDate(a.receivedOn)} · before GST
                  </span>
                </span>
              </li>
            ))}
          </Block>
        )}

        </Queues>

        <InstalmentTrack projects={trackProjects} />
      </div>
    </>
  );
}

function rowId(s: PaymentStageView): string {
  return `pay:${s.projectId}:${s.n}`;
}

/** The queues under the week board. Ones with rows stand two to a row from 1280 px; empty
 *  ones say so in a single quiet line under them, instead of a panel each. */
function Queues({ children }: { children: ReactNode }) {
  const blocks = (Array.isArray(children) ? children : [children]).filter(
    (c): c is ReactElement<BlockProps> => Boolean(c) && typeof c === "object" && "props" in c,
  );
  const full = blocks.filter((b) => b.props.count > 0);
  const empty = blocks.filter((b) => b.props.count === 0);
  return (
    <>
      {full.length > 0 && <div className="grid items-start gap-6 xl:grid-cols-2">{full}</div>}
      {empty.length > 0 && (
        <ul aria-label="Nothing waiting" className="glass flex flex-wrap gap-x-6 gap-y-1 px-4 py-3">
          {empty.map((b) => (
            <li key={b.props.id} className="flex items-baseline gap-2 text-15">
              <span className="font-semibold text-ink">{b.props.title}</span>
              <span className="text-ink-soft">{b.props.empty}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

type BlockProps = {
  id: string;
  title: string;
  count: number;
  empty?: string;
  children: ReactNode;
};

function Block({ id, title, count, children }: BlockProps) {
  return (
    <section className="glass min-w-0 p-2 sm:p-3" aria-labelledby={`${id}-heading`}>
      <div className="flex min-h-11 items-center gap-2 px-3 pb-1">
        <h2 id={`${id}-heading`} tabIndex={-1} className="text-17 font-semibold text-ink outline-none">
          {title}
        </h2>
        <CountPill n={count} />
      </div>
      <ul>{children}</ul>
    </section>
  );
}

function StageRow({
  stage,
  name,
  amount,
  meta,
  action,
  panel,
}: {
  stage: PaymentStageView;
  name: string;
  /** Defaults to what is still to come. */
  amount?: number;
  meta: ReactNode;
  action?: ReactNode;
  panel?: ReactNode;
}) {
  return (
    <li data-row-id={rowId(stage)} className={`glass-row ${ROW}`}>
      <span className="grid min-w-0">
        <ProjectLink id={stage.projectId} name={name} className="flex items-center justify-self-start text-15 font-semibold max-md:min-h-11" />
        <span className="truncate text-13 text-ink-soft">
          {stage.instalmentLabel} · {weekShort(stage)}
        </span>
      </span>
      <span className="figure min-w-24 text-right text-15 text-ink">{inr(amount ?? stage.outstanding)}</span>
      <span className={`flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 ${action ? "max-sm:col-span-2" : "col-span-2"}`}>{meta}</span>
      {action && <span className="reg-action flex max-sm:col-span-2 sm:justify-end">{action}</span>}
      {panel && <div className="col-span-2">{panel}</div>}
    </li>
  );
}

function ConfirmToggle({ stage, name, panel, label }: { stage: PaymentStageView; name: string; panel: Panel; label: string }) {
  const open = panel.isOpen(rowId(stage));
  return (
    <button
      type="button"
      className="btn btn-glass min-h-11 w-full whitespace-nowrap text-15 sm:w-auto"
      aria-expanded={open}
      aria-label={`${open ? "Close" : label}, ${name} ${stage.instalmentLabel}`}
      onClick={(event) => panel.toggle(rowId(stage), event.currentTarget)}
    >
      {open ? "Close" : label}
    </button>
  );
}

function RaiseLetter({ stage, name, person }: { stage: PaymentStageView; name: string; person: PersonId }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  return (
    <button
      type="button"
      className="btn btn-glass min-h-11 w-full whitespace-nowrap text-15 sm:w-auto"
      aria-disabled={pause.pending !== null}
      aria-label={`Raise letter, ${name} ${stage.instalmentLabel}`}
      onClick={(event) => {
        if (pause.pending !== null) return;
        const { record } = demo;
        const letterNo = firm.nextLetterNo;
        // The row moves on to "awaited": focus follows it there.
        const restore = focusReturn(event.currentTarget, rowId(stage));
        pause.start({
          what: `Demand letter for ${name}, ${stage.instalmentLabel}`,
          origin: event.currentTarget,
          commit: () => {
            record({ kind: "payment.raised", projectId: stage.projectId, n: stage.n, letterNo, by: person });
            restore();
          },
        });
      }}
    >
      Raise letter
    </button>
  );
}

/** Confirms money in for one stage: the amount, when, from whom and the bank reference. */
function ConfirmReceipt({
  stage,
  name,
  person,
  onDone,
}: {
  stage: PaymentStageView;
  name: string;
  person: PersonId;
  onDone: () => void;
}) {
  const demo = useDemo();
  const pause = usePause();
  const submitRef = useRef<HTMLButtonElement>(null);
  const [amount, setAmount] = useState(String(stage.outstanding));
  const [on, setOn] = useState(TODAY);
  const [source, setSource] = useState<Source>(stage.state === "client-paid" ? "client" : "bank");
  const [reference, setReference] = useState(stage.clientRef ?? "");
  const [errors, setErrors] = useState<{ amount?: string; reference?: string; on?: string }>({});
  const value = rupeesFrom(amount);

  const submit = (origin: HTMLElement) => {
    if (pause.pending !== null) return;
    const next: typeof errors = {};
    if (!Number.isFinite(value) || value <= 0) next.amount = "Enter the amount.";
    else if (value > stage.outstanding) next.amount = `Max ${inr(stage.outstanding)}.`;
    if (!reference.trim()) next.reference = "Enter the UTR.";
    if (!on || on > TODAY) next.on = "Not after today.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const { record } = demo;
    pause.start({
      what: `${inr(value)} for ${name}, ${stage.instalmentLabel}`,
      origin,
      commit: () => {
        const n = getDemoSnapshot().events.length + 1;
        record({
          kind: "receipt.recorded",
          receipt: {
            id: `r-live-${n}`,
            projectId: stage.projectId,
            n: stage.n,
            amount: value,
            source,
            reference: reference.trim(),
            on,
            by: person,
          },
          by: person,
        });
        onDone();
      },
    });
  };

  return (
    <form
      className="pay-panel mt-1 grid gap-4 rounded-xl border border-ink/10 bg-white/50 p-3 sm:p-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(submitRef.current ?? event.currentTarget);
      }}
    >
      {/* items-start and a plain wrapper keep each field at its own height, so an error line
          under one field grows the row below its input instead of dropping the other inputs. */}
      <div className="grid items-start gap-4 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
        <div>
          <Field label="Amount with GST" error={errors.amount}>
            <input
              className={field}
              inputMode="numeric"
              autoComplete="off"
              value={amount}
              aria-invalid={errors.amount ? true : undefined}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
        </div>
        <div>
          <Field label="Received on" error={errors.on}>
            <input
              className={field}
              type="date"
              value={on}
              min={addDays(TODAY, -60)}
              max={TODAY}
              onChange={(event) => setOn(event.target.value)}
            />
          </Field>
        </div>
        <div>
          <Field label="UTR" error={errors.reference}>
            <input
              className={field}
              autoComplete="off"
              value={reference}
              aria-invalid={errors.reference ? true : undefined}
              onChange={(event) => setReference(event.target.value)}
            />
          </Field>
        </div>
      </div>
      <ChipGroup label="From" columns={2} className="sm:max-w-md">
        <Chip pressed={source === "client"} onClick={() => setSource("client")}>
          Client
        </Chip>
        <Chip pressed={source === "bank"} onClick={() => setSource("bank")}>
          Bank
        </Chip>
      </ChipGroup>
      <div>
        <button ref={submitRef} type="submit" className="btn btn-primary min-h-12 w-full sm:w-auto" aria-disabled={pause.pending !== null}>
          Confirm receipt
        </button>
      </div>
    </form>
  );
}
