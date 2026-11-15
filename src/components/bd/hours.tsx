"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { dated, day, Empty, IconPlus, Panel, rowBtn } from "@/components/architect/glass-ui";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { useScope } from "@/components/register/project-switch";
import { useOnHidden, usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { stampNow } from "@/lib/clock";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm } from "@/lib/demo-store";
import type { CreditRequestView, CreditView, Firm } from "@/lib/firm";
import { HOUR_PRICE, type CreditAddition } from "@/lib/firm-data";
import { datePart, formatShortDate, hours, inr } from "@/lib/format";

// Hours asked: a client who used up the advisory hours asks for more and pays offline;
// once the money is in, Rohan adds them here. Every addition stays listed below.

const POOL_WORDS = { before: "Before construction", during: "During construction" } as const;

function projectName(firm: Firm, id: string): string {
  return firm.projects.find((p) => p.id === id)?.name ?? id;
}

function AddHoursForm({ request, credit, onDone }: { request: CreditRequestView; credit: CreditView; onDone: () => void }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const ids = useId();
  const [count, setCount] = useState(request.hours);
  const [pool, setPool] = useState<"before" | "during">(credit.current);
  const [amount, setAmount] = useState<number | null>(null);
  const [receivedOn, setReceivedOn] = useState(TODAY);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const paid = amount ?? count * HOUR_PRICE;
  const waiting = pause.pending !== null;
  const name = projectName(firm, request.projectId);

  const submit = (origin: HTMLElement) => {
    if (waiting) return;
    if (!(count > 0)) return setError("Add the hours");
    if (!(paid > 0)) return setError("Add the amount");
    if (!reference.trim()) return setError("Add the reference");
    setError("");
    const { record } = demo;
    pause.start({
      what: `${hours(count)} for ${name}`,
      origin,
      commit: () => {
        const addition: CreditAddition = {
          id: `add-${request.projectId}-${getDemoSnapshot().events.length + 1}`,
          projectId: request.projectId,
          hours: count,
          pool,
          by: "rohan",
          at: stampNow(),
          amount: paid,
          receivedOn,
          reference: reference.trim(),
          reason: `${request.by} asked on ${formatShortDate(datePart(request.at))}.`,
        };
        record({ kind: "credits.added", addition, by: "rohan" });
        onDone();
      },
    });
  };

  return (
    <form
      className="glass-inner mt-2 grid gap-4 p-3"
      aria-label={`Add hours for ${name}`}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(buttonRef.current ?? event.currentTarget);
      }}
    >
      <ChipGroup label="Pool">
        {(["before", "during"] as const).map((key) => (
          <Chip key={key} pressed={pool === key} onClick={() => setPool(key)}>
            {POOL_WORDS[key]}
          </Chip>
        ))}
      </ChipGroup>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-1.5">
          <label htmlFor={`${ids}-hours`} className="text-15 font-semibold">
            Hours
          </label>
          <input
            id={`${ids}-hours`}
            type="number"
            inputMode="decimal"
            min={0.5}
            step={0.5}
            className={field}
            value={count}
            onChange={(event) => setCount(Math.max(0, Number(event.target.value) || 0))}
          />
        </div>
        <div className="grid content-start gap-1.5">
          <label htmlFor={`${ids}-amount`} className="text-15 font-semibold">
            ₹ before GST
          </label>
          <input
            id={`${ids}-amount`}
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            className={field}
            value={paid}
            onChange={(event) => setAmount(Math.max(0, Number(event.target.value) || 0))}
          />
        </div>
        <div className="grid content-start gap-1.5">
          <label htmlFor={`${ids}-on`} className="text-15 font-semibold">
            Received on
          </label>
          <input
            id={`${ids}-on`}
            type="date"
            className={field}
            value={receivedOn}
            max={TODAY}
            onChange={(event) => setReceivedOn(event.target.value || TODAY)}
          />
        </div>
        <div className="grid content-start gap-1.5">
          <label htmlFor={`${ids}-ref`} className="text-15 font-semibold">
            UTR or cheque
          </label>
          <input
            id={`${ids}-ref`}
            type="text"
            className={field}
            value={reference}
            autoComplete="off"
            onChange={(event) => {
              setReference(event.target.value);
              if (error) setError("");
            }}
          />
        </div>
      </div>
      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
      <div>
        <button ref={buttonRef} type="submit" className="btn btn-primary min-h-11 gap-1.5 px-5 text-15" aria-disabled={waiting}>
          <IconPlus /> Add {hours(count)}
        </button>
      </div>
    </form>
  );
}

export function HoursAsked() {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const scope = useScope("bd");
  // Undefined follows the Today link; null is closed on purpose. Let go when the screen hides.
  const [panel, setPanel] = useState<string | null | undefined>(undefined);
  useOnHidden(() => setPanel(undefined));

  const inScope = (projectId: string) => scope === "all" || projectId === scope;
  const open = firm.creditRequests.filter((r) => r.open && inScope(r.projectId)).sort((a, b) => b.days - a.days);
  const focus = demo.focusRow && demo.focusRow.href.split(/[?#]/)[0] === "/staff/bd/hours" ? demo.focusRow.id : null;
  const openId = panel === undefined ? focus : panel;

  const additions = firm.additions
    .map((a, order) => ({ a, order }))
    .filter(({ a }) => inScope(a.projectId))
    .sort((x, y) => y.a.at.localeCompare(x.a.at) || y.order - x.order)
    .map(({ a }) => a);

  const close = () => {
    if (pause.pending !== null) pause.cancel();
    setPanel(null);
  };

  return (
    <>
      <StaffBoard place="Hours asked" headline={open.length === 0 ? "No hours asked" : `${open.length} asked for hours`} />
      <div className="mt-6 grid gap-4 lg:mt-8">
        <Panel title="Asked" aside={open.length > 0 ? <StatusChip tone="waiting">{open.length}</StatusChip> : undefined}>
          {open.length === 0 ? (
            <Empty>All answered</Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-1">
              {open.map((r) => {
                const c = firm.credits.find((x) => x.projectId === r.projectId);
                const left = c ? c.left : 0;
                const isOpen = openId === r.id;
                return (
                  <li key={r.id} id={r.id} className="glass-row scroll-mt-28 px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <div className="min-w-0 flex-[1_1_12rem]">
                        <p className="truncate text-15 font-semibold text-ink">{r.by}</p>
                        <p className="-my-3 truncate py-3 text-13 text-ink-soft">
                          <Link href={`/staff/projects/${r.projectId}`} className="link -my-3 inline-flex min-h-11 items-center">
                            {projectName(firm, r.projectId)}
                          </Link>{" "}
                          · {day(r.at)}
                        </p>
                      </div>
                      <StatusChip tone="waiting">{hours(r.hours)} asked</StatusChip>
                      <StatusChip tone={left <= 0 ? "late" : "done"}>{left < 0 ? `${hours(-left)} over` : `${hours(left)} left`}</StatusChip>
                      {c && (
                        <button type="button" className={rowBtn} aria-expanded={isOpen} onClick={() => (isOpen ? close() : setPanel(r.id))}>
                          {isOpen ? (
                            "Close"
                          ) : (
                            <>
                              <IconPlus /> Add hours
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {isOpen && c && <AddHoursForm request={r} credit={c} onDone={() => setPanel(null)} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Added">
          {additions.length === 0 ? (
            <Empty>None yet</Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-1">
              {additions.map((a) => (
                <li key={a.id} className="glass-row flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                  <div className="min-w-0 flex-[1_1_12rem]">
                    <p className="truncate text-15 text-ink">{projectName(firm, a.projectId)}</p>
                    <p className="truncate text-13 text-ink-soft">
                      {dated(a.at)} · {a.reference}
                    </p>
                  </div>
                  <span className="figure text-15 text-ink">+{hours(a.hours)}</span>
                  <span className="figure text-15 text-ink">{inr(a.amount)}</span>
                  <StatusChip tone="done">{a.pool === "before" ? "Before" : "During"}</StatusChip>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
