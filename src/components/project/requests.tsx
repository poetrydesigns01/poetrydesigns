/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useState, type FormEvent } from "react";
import { Empty, Panel } from "@/components/admin/glass-kit";
import { field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { StatusChip } from "@/components/register/status-chip";
import { WaitChip } from "@/components/shared/wait-chip";
import { tierOf, waitedDaysOf } from "@/lib/desk";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { ClientRequestView } from "@/lib/fees";
import { formatShortDate, datePart, hours, inr } from "@/lib/format";
import { useProjectViewer } from "./viewer";

// Client requests for more advisory hours or a design change, routed to the Project Head.
// Each row: what was asked, by whom, how long it has waited and where it stands. The head
// (or the admin) approves with the fee worked out on the spot, declines with a reason, or
// escalates a commercial question to the client's BD person. A fee the client declined comes
// back to the head, to send to BD or close.

type Mode = "approve" | "decline" | "escalate";

const TYPE_WORDS = { hours: "Advisory hours", "design-change": "Design change" } as const;

/** What a request asks for, in a few words. */
export function requestTitle(r: ClientRequestView): string {
  if (r.type !== "hours") return r.title;
  const n = r.hours ?? 0;
  return `${n} more ${n === 1 ? "hour" : "hours"}`;
}

export function ClientRequests({
  requests,
  title = "Client requests",
  showProject = false,
  empty = "No requests",
  id,
}: {
  requests: ClientRequestView[];
  title?: string;
  /** On the desk, where rows come from several projects. */
  showProject?: boolean;
  empty?: string;
  id?: string;
}) {
  const waiting = requests.filter((r) => r.waitingOn === "head").length;
  // Those waiting on the head first, the longest wait at the top; then the rest as they came.
  const rows = [
    ...requests.filter((r) => r.waitingOn === "head").sort((a, b) => (a.waitingSince ?? "").localeCompare(b.waitingSince ?? "")),
    ...requests.filter((r) => r.waitingOn !== "head"),
  ];
  return (
    <Panel
      id={id}
      title={title}
      aside={waiting > 0 ? <StatusChip tone="waiting">{`${waiting} to decide`}</StatusChip> : undefined}
    >
      {requests.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <ul className="grid gap-1">
          {rows.map((r) => (
            <RequestRow key={r.id} r={r} showProject={showProject} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RequestRow({ r, showProject }: { r: ClientRequestView; showProject: boolean }) {
  const firm = useFirm();
  const pause = usePause();
  const viewer = useProjectViewer();
  const [mode, setMode] = useState<Mode | null>(null);
  const project = firm.project(r.projectId);
  const mayAct = viewer.id === r.head || viewer.admin;
  const canDecide = mayAct && r.waitingOn === "head";
  const canApprove = canDecide && r.status === "with-head";
  const closing = r.status === "fee-declined";
  const canEscalate = mayAct && r.open && !r.escalation?.open && r.waitingOn !== "bd";
  const waited = r.open && r.waitingSince ? waitedDaysOf(r.waitingSince) : null;
  const sub = [
    showProject ? (project?.code || project?.name) : null,
    r.askedBy,
    TYPE_WORDS[r.type],
    formatShortDate(datePart(r.raisedAt)),
  ]
    .filter(Boolean)
    .join(" · ");

  const toggle = (next: Mode) => {
    if (pause.pending !== null) pause.cancel();
    setMode((m) => (m === next ? null : next));
  };

  return (
    <li className="glass-row px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="grid min-w-0 flex-[1_1_14rem] gap-0.5">
          <p className="truncate text-15 font-semibold text-ink">{requestTitle(r)}</p>
          <p className="truncate text-13 text-ink-soft">{sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {r.fee && (
            <span className={`figure text-15 ${r.fee.state === "waived" ? "text-ink-soft line-through" : "text-ink"}`}>{inr(r.fee.total)}</span>
          )}
          {waited !== null && r.waitingOn === "head" && <WaitChip waitedDays={waited} tier={tierOf(waited)} />}
          {r.feeWaived && r.status === "with-head" && <StatusChip tone="done">Fee waived</StatusChip>}
          <StatusChip tone={r.tone}>{r.statusWords}</StatusChip>
        </div>
      </div>

      {(canDecide || canEscalate) && (
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`Answer ${requestTitle(r)}`}>
          {canApprove && (
            <button
              type="button"
              className="btn btn-glass min-h-11 px-4 text-15"
              aria-expanded={mode === "approve"}
              onClick={() => toggle("approve")}
            >
              Approve
            </button>
          )}
          {canDecide && (
            <button type="button" className="btn btn-glass min-h-11 px-4 text-15" aria-expanded={mode === "decline"} onClick={() => toggle("decline")}>
              {closing ? "Close" : "Decline"}
            </button>
          )}
          {canEscalate && (
            <button type="button" className="btn btn-glass min-h-11 px-4 text-15" aria-expanded={mode === "escalate"} onClick={() => toggle("escalate")}>
              To BD
            </button>
          )}
        </div>
      )}

      {mode === "approve" && canApprove && <ApproveForm r={r} by={viewer.id} onDone={() => setMode(null)} />}
      {mode === "decline" && canDecide && <ReasonForm r={r} kind="decline" by={viewer.id} onDone={() => setMode(null)} />}
      {mode === "escalate" && canEscalate && <ReasonForm r={r} kind="escalate" by={viewer.id} onDone={() => setMode(null)} />}
    </li>
  );
}

/** The hours to charge, the fee worked out as they are typed, and one button to approve it. */
function ApproveForm({ r, by, onDone }: { r: ClientRequestView; by: ClientRequestView["head"]; onDone: () => void }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const [count, setCount] = useState(String(r.hours ?? firm.feeRule.minChangeHours));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const value = Number(count);
  const valid = Number.isFinite(value) && value > 0 && Math.round(value * 2) === value * 2;
  const quote = firm.quoteFee(r.type, valid ? value : 0);
  const raised = valid && quote.hours > value;
  // BD waived the fee before the head decided: the approval charges nothing.
  const free = !!r.feeWaived;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    if (!valid) return setError("Hours in halves, such as 2 or 2.5.");
    setError("");
    const why = note;
    pause.start({
      what: free ? `${requestTitle(r)} approved, no charge` : `${requestTitle(r)} approved, ${inr(quote.total)} to the client`,
      origin: (event.nativeEvent as SubmitEvent).submitter,
      commit: () => {
        demo.approveClientRequest(r.id, value, by, why);
        onDone();
      },
    });
  };

  return (
    <form onSubmit={submit} className="glass-inner mt-2 grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
      <div className="grid gap-3">
        <Field label="Hours" htmlFor={`${ids}-h`} error={error || undefined}>
          <input
            id={`${ids}-h`}
            type="number"
            inputMode="decimal"
            min={0.5}
            step={0.5}
            className={field}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </Field>
        <Field label="Note" htmlFor={`${ids}-n`}>
          <input id={`${ids}-n`} className={field} value={note} autoComplete="off" onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-2" aria-live="polite">
        <p className="lettering text-ink-soft">Fee to client</p>
        {free ? (
          <p className="flex flex-wrap items-center gap-2">
            <span className="figure text-22">{inr(0)}</span>
            <StatusChip tone="done">Fee waived</StatusChip>
          </p>
        ) : (
          <dl className="grid gap-1 text-15">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-soft">
                <span className="figure">{hours(quote.hours)}</span> × <span className="figure">{inr(quote.rate)}</span>
              </dt>
              <dd className="figure">{inr(quote.amount)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-soft">GST {Math.round(firm.feeRule.gstRate * 100)}%</dt>
              <dd className="figure">{inr(quote.gst)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-ink/10 pt-1">
              <dt className="font-semibold">Total</dt>
              <dd className="figure text-22">{inr(quote.total)}</dd>
            </div>
          </dl>
        )}
        {raised && !free && <span className="glass-chip chip-waiting justify-self-start">{`Min ${hours(firm.feeRule.minChangeHours)} a change`}</span>}
        <button type="submit" className="btn btn-primary mt-1 min-h-12 w-full" aria-disabled={pause.pending !== null || undefined}>
          {free ? "Approve · No charge" : `Approve · ${inr(quote.total)}`}
        </button>
      </div>
    </form>
  );
}

/** Decline with a reason, or send a commercial question to the client's BD person. */
function ReasonForm({
  r,
  kind,
  by,
  onDone,
}: {
  r: ClientRequestView;
  kind: "decline" | "escalate";
  by: ClientRequestView["head"];
  onDone: () => void;
}) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const advisor = firm.person(firm.advisorOf(r.projectId));
  const closing = kind === "decline" && r.status === "fee-declined";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    const why = reason.trim();
    if (!why) return setError("Add a short reason.");
    setError("");
    pause.start({
      what:
        kind === "decline"
          ? `${requestTitle(r)} ${closing ? "closed" : "declined"}`
          : `${requestTitle(r)} sent to ${advisor?.name ?? "BD"}`,
      origin: (event.nativeEvent as SubmitEvent).submitter,
      commit: () => {
        if (kind === "decline") demo.declineClientRequest(r.id, why, by);
        else demo.escalateClientRequest(r.id, why, by);
        onDone();
      },
    });
  };

  return (
    <form onSubmit={submit} className="glass-inner mt-2 grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <Field
        label={kind === "decline" ? "Reason" : `To ${advisor?.name ?? "BD"}`}
        htmlFor={`${ids}-r`}
        error={error || undefined}
      >
        <input
          id={`${ids}-r`}
          className={field}
          value={reason}
          autoComplete="off"
          placeholder={kind === "escalate" ? "Commercial question" : undefined}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <button type="submit" className="btn btn-primary min-h-12" aria-disabled={pause.pending !== null || undefined}>
        {kind === "decline" ? (closing ? "Close" : "Decline") : "Escalate"}
      </button>
    </form>
  );
}
