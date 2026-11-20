/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { dated, Empty, IconCheck, Panel, rowBtn, rowPrimary } from "@/components/architect/glass-ui";
import { field } from "@/components/register/chips";
import { useScope } from "@/components/register/project-switch";
import { useOnHidden, usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { WaitChip } from "@/components/shared/wait-chip";
import { DESK_HREF, tierOf, waitedDaysOf } from "@/lib/desk";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { ClientRequestView } from "@/lib/fees";
import type { PersonId } from "@/lib/firm-data";
import { hours, inr } from "@/lib/format";
import { Segmented } from "./bd-ui";
import { ME } from "./prospect-bits";

// Escalations: only the client requests a Project Head passed to BD because they are
// commercial (waive the fee or not). Routine hour and design requests stay with the head.

function SettleForm({ r, onDone }: { r: ClientRequestView; onDone: () => void }) {
  const demo = useDemo();
  const pause = usePause();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [note, setNote] = useState("");
  const [waive, setWaive] = useState<"charge" | "waive">("charge");
  const [error, setError] = useState("");
  const waiting = pause.pending !== null;

  return (
    <form
      className="glass-inner mt-2 grid gap-3 p-3"
      aria-label={`Settle ${r.title}`}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (waiting) return;
        if (!note.trim()) return setError("Add what was agreed");
        setError("");
        const { settleEscalation } = demo;
        pause.start({
          what: `${r.title}, settled`,
          origin: buttonRef.current,
          commit: () => {
            settleEscalation(r.id, note, waive === "waive", ME);
            onDone();
          },
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
        <Segmented
          label="Fee"
          showLabel
          options={[
            { id: "charge", label: r.fee ? `Charge ${inr(r.fee.total)}` : "Charge" },
            { id: "waive", label: "Waive" },
          ]}
          value={waive}
          onChange={(id) => setWaive(id)}
        />
        <label className="grid content-start gap-1.5">
          <span className="text-15 font-semibold">Agreed</span>
          <input
            className={field}
            autoComplete="off"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              if (error) setError("");
            }}
          />
        </label>
      </div>
      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
      <div>
        <button ref={buttonRef} type="submit" className={rowPrimary} aria-disabled={waiting || undefined}>
          <IconCheck /> Settle
        </button>
      </div>
    </form>
  );
}

export function Escalations() {
  const firm = useFirm();
  const scope = useScope("bd");
  const [openId, setOpenId] = useState<string | null>(null);
  useOnHidden(() => setOpenId(null));

  const mine = firm.escalationsFor(ME).filter((r) => scope === "all" || r.projectId === scope);
  const open = mine
    .filter((r) => r.escalation?.open)
    .sort((a, b) => (a.escalation?.at ?? "").localeCompare(b.escalation?.at ?? ""));
  const settled = mine
    .filter((r) => r.escalation && !r.escalation.open)
    .sort((a, b) => (b.escalation?.settledAt ?? "").localeCompare(a.escalation?.settledAt ?? ""));
  const name = (id: PersonId) => firm.person(id)?.first ?? id;

  return (
    <>
      <StaffBoard place="Escalations" headline={open.length === 0 ? "No escalations" : `${open.length} to settle`} />
      <div className="mt-6 grid gap-4 lg:mt-8">
        <Panel title="To settle" aside={open.length > 0 ? <StatusChip tone="late">{open.length}</StatusChip> : undefined}>
          {open.length === 0 ? (
            <Empty>
              <span className="inline-flex items-center gap-2">
                <IconCheck /> Nothing escalated
              </span>
            </Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-1">
              {open.map((r) => {
                const esc = r.escalation!;
                const days = waitedDaysOf(esc.at);
                const tier = tierOf(days);
                const project = firm.project(r.projectId);
                const isOpen = openId === r.id;
                return (
                  <li
                    key={r.id}
                    id={r.id}
                    className={`glass-row scroll-mt-28 px-3 py-2.5 ${tier === "urgent" ? "shadow-[inset_3px_0_0_var(--color-brick)]" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="grid min-w-0 flex-[1_1_14rem] gap-0.5">
                        <p className="truncate text-15 font-semibold text-ink">{r.title}</p>
                        <p className="truncate text-13 text-ink-soft">
                          <Link href={DESK_HREF.project(r.projectId)} className="link">
                            {project?.name ?? r.projectId}
                          </Link>{" "}
                          · {r.askedBy}
                          {r.type === "hours" && r.hours ? ` · ${hours(r.hours)}` : ""}
                        </p>
                        <p className="text-13 text-ink">
                          {name(esc.by)}: {esc.reason}
                        </p>
                      </div>
                      {r.fee && <span className="figure text-15 text-ink">{inr(r.fee.total)}</span>}
                      <WaitChip waitedDays={days} tier={tier} />
                      <button type="button" className={rowBtn} aria-expanded={isOpen} onClick={() => setOpenId(isOpen ? null : r.id)}>
                        {isOpen ? "Close" : "Settle"}
                      </button>
                    </div>
                    {isOpen && <SettleForm r={r} onDone={() => setOpenId(null)} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Settled">
          {settled.length === 0 ? (
            <Empty>None yet</Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-1">
              {settled.map((r) => (
                <li key={r.id} className="glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5">
                  <div className="grid min-w-0 gap-0.5">
                    <p className="truncate text-15 text-ink">{r.title}</p>
                    <p className="truncate text-13 text-ink-soft">
                      {firm.project(r.projectId)?.name ?? r.projectId} · {r.escalation?.note}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="text-13 text-ink-soft">{r.escalation?.settledAt ? dated(r.escalation.settledAt) : ""}</span>
                    <StatusChip tone={r.escalation?.waived ? "locked" : "done"}>{r.escalation?.waived ? "Waived" : "Charged"}</StatusChip>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
