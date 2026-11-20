/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { StatusChip } from "@/components/register/status-chip";
import { WaitChip } from "@/components/shared/wait-chip";
import { TODAY } from "@/lib/demo-data";
import { tierOf, waitedDaysOf } from "@/lib/desk";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { ClientRequestView } from "@/lib/fees";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { formatShortDate, inr } from "@/lib/format";
import { ProjectLink } from "./rows";

// Architect fees the client has approved: finance raises the invoice, then records the money
// (hours bought join the project's pool). The Project Head set the fee; finance only bills.

const ROW = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-3 py-3";

/** The fees finance has in hand: approved by the client and not yet paid. */
export function feesToHandle(requests: ClientRequestView[], scope: ProjectId | "all"): ClientRequestView[] {
  return requests
    .filter((r) => (r.status === "to-bill" || r.status === "billed") && !r.escalation?.open)
    .filter((r) => scope === "all" || r.projectId === scope)
    .sort((a, b) => (a.waitingSince ?? a.raisedAt).localeCompare(b.waitingSince ?? b.raisedAt));
}

function Receive({ request, person, onDone }: { request: ClientRequestView; person: PersonId; onDone: () => void }) {
  const demo = useDemo();
  const pause = usePause();
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="glass-inner enter-row grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (pause.pending !== null) return;
        if (!reference.trim()) return setError("Enter the UTR");
        const utr = reference;
        pause.start({
          what: `${inr(request.fee?.total ?? 0)} for ${request.title.toLowerCase()}`,
          origin: ref.current,
          commit: () => {
            flushSync(() => demo.receiveFee(request.id, utr, TODAY, person));
            onDone();
          },
        });
      }}
    >
      <label className="grid gap-1.5" htmlFor={`${id}-utr`}>
        <span className="text-15 font-semibold">UTR</span>
        <input
          id={`${id}-utr`}
          value={reference}
          maxLength={40}
          onChange={(e) => {
            setReference(e.target.value);
            setError("");
          }}
          aria-invalid={error ? true : undefined}
          className={field}
        />
      </label>
      <button ref={ref} type="submit" className="btn btn-primary min-h-12">
        Record receipt
      </button>
      {error && (
        <p role="alert" className="late-text text-15 sm:col-span-2">
          {error}
        </p>
      )}
    </form>
  );
}

export function FeeRows({ rows, finance, person }: { rows: ClientRequestView[]; finance: boolean; person: PersonId }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      {rows.map((r) => {
        const fee = r.fee;
        if (!fee) return null;
        const since = r.waitingSince ?? fee.approvedAt ?? r.raisedAt;
        const waited = waitedDaysOf(since);
        const name = firm.project(r.projectId)?.name ?? r.projectId;
        return (
          <li key={r.id} className={`glass-row ${ROW}`}>
            <span className="grid min-w-0">
              <ProjectLink id={r.projectId} name={name} className="flex items-center justify-self-start text-15 font-semibold max-md:min-h-11" />
              <span className="truncate text-13 text-ink-soft">
                {r.title} · {fee.hours} h
              </span>
            </span>
            <span className="figure min-w-24 text-right text-15 text-ink">{inr(fee.total)}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 max-sm:col-span-2">
              {r.status === "to-bill" ? (
                <StatusChip tone="waiting">To bill</StatusChip>
              ) : (
                <StatusChip tone="progress">{fee.invoiceNo ?? "Billed"}</StatusChip>
              )}
              <span className="text-13 text-ink-soft">
                {r.status === "to-bill" && fee.approvedAt ? `Approved ${formatShortDate(fee.approvedAt)}` : ""}
                {r.status === "billed" && fee.billedAt ? `Billed ${formatShortDate(fee.billedAt)}` : ""}
              </span>
              <WaitChip waitedDays={waited} tier={tierOf(waited)} />
            </span>
            {finance && (
              <span className="reg-action flex max-sm:col-span-2 sm:justify-end">
                {r.status === "to-bill" ? (
                  <button
                    type="button"
                    className="btn btn-glass min-h-11 w-full whitespace-nowrap text-15 sm:w-auto"
                    aria-disabled={pause.pending !== null || undefined}
                    aria-label={`Raise invoice, ${name}, ${r.title}`}
                    onClick={(event) => {
                      if (pause.pending !== null) return;
                      pause.start({
                        what: `Invoice for ${name}, ${r.title.toLowerCase()}`,
                        origin: event.currentTarget,
                        commit: () => {
                          demo.billFee(r.id, person);
                        },
                      });
                    }}
                  >
                    Raise invoice
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-glass min-h-11 w-full whitespace-nowrap text-15 sm:w-auto"
                    aria-expanded={open === r.id}
                    onClick={() => setOpen(open === r.id ? null : r.id)}
                  >
                    {open === r.id ? "Close" : "Record receipt"}
                  </button>
                )}
              </span>
            )}
            {finance && open === r.id && r.status === "billed" && (
              <div className="col-span-2">
                <Receive request={r} person={person} onDone={() => setOpen(null)} />
              </div>
            )}
          </li>
        );
      })}
    </>
  );
}
