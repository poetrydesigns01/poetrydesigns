/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { usePause } from "@/components/register/recording-pause";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { ClientRequestView } from "@/lib/fees";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { formatShortDate, inr } from "@/lib/format";
import type { Tone } from "@/lib/portal";
import { h } from "./hours-meter";

// The client's own requests for architect time: more advisory hours or a design change. Each
// goes to the Project Head; once the head approves, the cost is worked out at once (hours x
// the firm's rate, plus GST) and comes back here for her yes or no. Then finance invoices it.

export const CLIENT_PROJECT: ProjectId = "iyer";

/** "Vikram Desai, Project Head". */
export function useHeadWords(projectId: ProjectId = CLIENT_PROJECT): string {
  const firm = useFirm();
  const head = firm.project(projectId)?.team.head;
  const name = head ? (firm.person(head)?.name ?? head) : "the architect";
  return `${name}, Project Head`;
}

/** Where a request stands, in her words. */
export function clientStatus(r: ClientRequestView, name: (id: string) => string): { words: string; tone: Tone; line?: string } {
  if (r.escalation?.open) return { words: `With ${name(r.escalation.to)}`, tone: "waiting" };
  switch (r.status) {
    case "with-head":
      return { words: "Sent", tone: "waiting", line: `Sent to ${name(r.head)}, Project Head` };
    case "fee-with-client":
      return { words: "Cost to approve", tone: "waiting" };
    case "declined":
      return { words: "Declined", tone: "locked", line: r.declineReason };
    case "fee-declined":
      return { words: "Cost declined", tone: "locked", line: `With ${name(r.head)}` };
    case "to-bill":
      return { words: "Approved", tone: "progress", line: "Invoice to come" };
    case "billed":
      return { words: "Invoiced", tone: "progress", line: r.fee?.invoiceNo };
    case "paid":
      return { words: "Paid", tone: "done", line: r.type === "hours" && r.fee ? `+${h(r.fee.hours)} added` : undefined };
    case "waived":
      return { words: "No charge", tone: "done", line: r.type === "hours" && r.fee ? `+${h(r.fee.hours)} added` : undefined };
    default:
      return { words: r.statusWords, tone: r.tone };
  }
}

/** The cost the head's approval generated, with her two answers. */
function FeeDecision({ request }: { request: ClientRequestView }) {
  const demo = useDemo();
  const pause = usePause();
  const approveRef = useRef<HTMLButtonElement>(null);
  const fee = request.fee;
  if (!fee) return null;
  const busy = pause.pending !== null;
  const approveWhat = `Your approval of ${inr(fee.total)}`;
  const declineWhat = `Your answer on ${request.title.toLowerCase()}`;
  return (
    <div className="glass-inner grid gap-3 p-3">
      <dl className="grid grid-cols-3 gap-2">
        <div className="grid gap-0.5">
          <dt className="lettering text-ink-soft">{h(fee.hours)}</dt>
          <dd className="figure text-15">{inr(fee.amount)}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="lettering text-ink-soft">GST</dt>
          <dd className="figure text-15">{inr(fee.gst)}</dd>
        </div>
        <div className="grid gap-0.5">
          <dt className="lettering text-ink-soft">Total</dt>
          <dd className="figure text-22">{inr(fee.total)}</dd>
        </div>
      </dl>
      {request.headNote && <p className="text-13 text-ink-soft">{request.headNote}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          ref={approveRef}
          type="button"
          className="btn btn-primary"
          aria-disabled={busy || undefined}
          onClick={() => {
            if (busy) return;
            pause.start({ what: approveWhat, origin: approveRef.current, commit: () => void demo.approveFee(request.id, "meera") });
          }}
        >
          Approve {inr(fee.total)}
        </button>
        <button
          type="button"
          className="btn btn-glass"
          aria-disabled={busy || undefined}
          onClick={(event) => {
            if (busy) return;
            pause.start({ what: declineWhat, origin: event.currentTarget, commit: () => void demo.declineFee(request.id, undefined, "meera") });
          }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

export function RequestRows({ requests, label }: { requests: ClientRequestView[]; label: string }) {
  const firm = useFirm();
  const name = (id: string) => firm.person(id as PersonId)?.name ?? id;
  if (requests.length === 0) return null;
  return (
    <ul className="grid gap-1" aria-label={label}>
      {requests.map((r) => {
        const s = clientStatus(r, name);
        return (
          <li key={r.id} className="glass-row grid gap-2 px-3 py-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <span className="grid min-w-0 gap-0.5">
                <span className="text-15 font-semibold text-ink">{r.title}</span>
                <span className="text-13 text-ink-soft">
                  {r.type === "hours" ? "Advisory hours" : "Design change"} · {formatShortDate(r.raisedAt)}
                </span>
              </span>
              <StatusChip tone={s.tone}>{s.words}</StatusChip>
            </div>
            {s.line && <p className="text-13 text-ink-soft">{s.line}</p>}
            {r.status === "fee-with-client" && !r.escalation?.open && <FeeDecision request={r} />}
          </li>
        );
      })}
    </ul>
  );
}

/** "Ask for a design change": what, and a line more if she wants; it goes to the Project Head. */
export function DesignChangeAsk({ projectId = CLIENT_PROJECT }: { projectId?: ProjectId }) {
  const demo = useDemo();
  const pause = usePause();
  const head = useHeadWords(projectId);
  const id = useId();
  const openRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const what = "Your design change request";
  const sending = pause.pending?.what === what;

  const close = () => {
    if (sending) pause.cancel();
    flushSync(() => {
      setOpen(false);
      setError("");
    });
    openRef.current?.focus();
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3" aria-live="polite">
        <button
          ref={openRef}
          type="button"
          className="btn btn-glass"
          onClick={() => {
            flushSync(() => {
              setOpen(true);
              setSent(false);
            });
            fieldRef.current?.focus();
          }}
        >
          Ask for a design change
        </button>
        {sent && <span className="glass-chip chip-waiting">Sent to {head}</span>}
      </div>
    );
  }

  return (
    <div className="basis-full">
      <form
        role="group"
        aria-labelledby={`${id}-title`}
        className="glass-inner enter-row grid w-full max-w-xl gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (sending) return;
          if (title.trim().length < 4) {
            setError("Say what to change");
            fieldRef.current?.focus();
            return;
          }
          const t = title;
          const n = note;
          pause.start({
            what,
            origin: sendRef.current,
            commit: () => {
              flushSync(() => demo.raiseClientRequest(projectId, "design-change", { title: t, note: n }, "meera"));
              setTitle("");
              setNote("");
              setOpen(false);
              setSent(true);
            },
          });
        }}
      >
        <p id={`${id}-title`} className="text-15 font-semibold">
          Design change
        </p>
        <label className="grid gap-1.5" htmlFor={`${id}-what`}>
          <span className="text-13 text-ink-soft">What</span>
          <input
            ref={fieldRef}
            id={`${id}-what`}
            value={title}
            maxLength={80}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="glass-field min-h-12 w-full px-3 text-17 text-ink"
          />
        </label>
        <label className="grid gap-1.5" htmlFor={`${id}-note`}>
          <span className="text-13 text-ink-soft">Details</span>
          <textarea
            id={`${id}-note`}
            rows={2}
            value={note}
            maxLength={400}
            onChange={(e) => setNote(e.target.value)}
            className="glass-field w-full px-3 py-2 text-17 leading-snug text-ink"
          />
        </label>
        {error && (
          <p id={`${id}-error`} role="alert" className="late-text text-15">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button ref={sendRef} type="submit" className="btn btn-primary" aria-disabled={sending || undefined}>
            Send to Project Head
          </button>
          <button type="button" className="btn btn-glass" onClick={close}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
