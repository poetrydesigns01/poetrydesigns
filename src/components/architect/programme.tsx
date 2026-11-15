"use client";

import { useId, useState } from "react";
import { field } from "@/components/register/chips";
import { DropZone } from "@/components/register/drop-zone";
import { viewerIdOf } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { useStaffRole } from "@/components/register/staff-shell";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { ProjectView } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { addDays, dayCount, inr, inrDelta } from "@/lib/format";
import type { PaymentStageView } from "@/lib/portal";
import { changeTone } from "./design-bits";
import { weeksLabel } from "./plan-bits";
import { dated, day, Empty, IconFile, IconPlus, IconSend, Panel, rowBtn, rowPrimary, Stat, Stats } from "./glass-ui";

// The programme of one project, in the project record: the ten payment stages with their
// amounts, dates and status, and the changes the architect recommends. The payment rows are
// read-only for the architect: every receipt in the workbook is Accounts & Finance's, who
// raise the letters on their own screen (admin may still raise one here). The client then
// pays, and the next milestone opens once finance confirms the money.

// Stage, amount, date, status, and the row action (or the letter number) at the right edge.
const COLS = "md:grid md:grid-cols-[minmax(0,1fr)_7.5rem_6.5rem_11rem_9.5rem]";

/** The date that matters for a stage now. */
function stageDate(s: PaymentStageView): { label: string; at: string } {
  if (s.state === "paid" && s.receivedAt) return { label: "Received", at: s.receivedAt };
  if (s.dueDate) return { label: "Due", at: s.dueDate };
  return { label: "Planned", at: s.plannedDate };
}

// ---- Recommend a change ----

function RecommendForm({ p, by, onDone }: { p: ProjectView; by: PersonId; onDone: () => void }) {
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const [item, setItem] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [heldUntil, setHeldUntil] = useState(addDays(TODAY, 14));
  const [error, setError] = useState("");
  // The whole amount lands on the first instalment not yet raised: one already due, the one
  // falling inside the milestone being built, or the next to come.
  const lands = p.milestones.find((m) => m.n > 0 && (m.state === "done" || m.state === "under-way" || m.state === "to-come"));

  const submit = (origin: HTMLElement) => {
    if (pause.pending !== null) return;
    const amount = Math.round(Number(price));
    const delay = Number(days || 0);
    if (item.trim().length < 3) return setError("Name the change");
    if (!Number.isFinite(amount) || amount === 0) return setError("Add the price change");
    if (!Number.isInteger(delay) || delay < 0) return setError("Days in whole numbers");
    if (files.length === 0) return setError("Choose the specification");
    if (!(heldUntil > TODAY)) return setError("Pick a later date");
    setError("");
    const event = {
      kind: "revision.raised" as const,
      projectId: p.id,
      item: item.trim(),
      amount,
      days: delay,
      specSheet: files[0].replace(/\.(pdf|png|jpg)$/i, ""),
      lands: lands ? [{ n: lands.n, amount }] : [],
      heldUntil,
      by,
    };
    const { record } = demo;
    pause.start({
      what: `Change recommended, ${event.item}`,
      origin,
      commit: () => {
        record(event);
        onDone();
      },
    });
  };

  return (
    <div className="glass-inner mb-3 grid gap-3 p-3 sm:grid-cols-2">
      <div className="grid content-start gap-1.5 sm:col-span-2">
        <label htmlFor={`${ids}-item`} className="text-15 font-semibold">
          Change
        </label>
        <input id={`${ids}-item`} className={field} value={item} placeholder="Teak main door" onChange={(e) => setItem(e.target.value)} />
      </div>
      <div className="grid content-start gap-1.5">
        <label htmlFor={`${ids}-price`} className="text-15 font-semibold">
          ₹ before GST
        </label>
        <input id={`${ids}-price`} className={field} type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="grid content-start gap-1.5">
        <label htmlFor={`${ids}-days`} className="text-15 font-semibold">
          Extra days
        </label>
        <input id={`${ids}-days`} className={field} type="number" inputMode="numeric" min={0} value={days} onChange={(e) => setDays(e.target.value)} />
      </div>
      <DropZone
        label="Specification"
        samples={["S-420 Revised specification.pdf"]}
        accept="pdf"
        chosen={files}
        onChoose={setFiles}
      />
      <div className="grid content-start gap-1.5">
        <label htmlFor={`${ids}-held`} className="text-15 font-semibold">
          Price held until
        </label>
        <input
          id={`${ids}-held`}
          className={field}
          type="date"
          min={addDays(TODAY, 1)}
          value={heldUntil}
          onChange={(e) => setHeldUntil(e.target.value)}
        />
      </div>
      {error && (
        <p className="text-15 font-semibold text-brick sm:col-span-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="button"
          className="btn btn-primary min-h-11 gap-1.5 px-4 text-15"
          aria-disabled={pause.pending !== null}
          onClick={(e) => submit(e.currentTarget)}
        >
          <IconSend /> Send to client
        </button>
        <button
          type="button"
          className="btn btn-glass min-h-11 px-4 text-15"
          onClick={() => {
            if (pause.pending !== null) pause.cancel();
            onDone();
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---- The page ----

export function ProjectProgramme({ id }: { id: ProjectId }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const role = useStaffRole();
  const [recommending, setRecommending] = useState(false);
  const p = firm.project(id);
  if (!p) return null;

  const stages = firm.payments(id);
  const timeline = firm.timeline(id);
  const viewer = viewerIdOf(role, demo.viewers);
  const canRaise = role === "admin";
  const canRecommend = role !== "admin" && viewer === p.team.head;

  if (stages.length === 0) {
    return (
      <section className="glass mt-6 p-4">
        <Empty>No payment stages yet</Empty>
      </section>
    );
  }

  const total = stages.reduce((n, s) => n + s.total, 0);
  const received = stages.reduce((n, s) => n + s.received, 0);
  const paid = stages.filter((s) => s.state === "paid").length;
  const dueNow = stages.filter((s) => s.state === "due" || s.state === "client-paid").reduce((n, s) => n + s.outstanding, 0);
  const firstRaise = stages.find((s) => s.canRaiseLetter)?.n;

  const raise = (s: PaymentStageView, origin: HTMLElement) => {
    if (pause.pending !== null) return;
    const letterNo = firm.nextLetterNo;
    const { record } = demo;
    pause.start({
      what: `Demand letter ${letterNo}, ${s.label}, ${inr(s.total)}`,
      origin,
      commit: () => record({ kind: "payment.raised", projectId: id, n: s.n, letterNo, by: viewer }),
    });
  };

  const changes = firm.revisions.filter((r) => r.projectId === id).sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));

  return (
    <div className="mt-6 grid gap-4">
      <Stats label="Payments">
        <Stat label="Received" value={inr(received)} note={<span className="text-13 text-ink-soft">of {inr(total)}</span>} />
        <Stat label="Due now" value={inr(dueNow)} />
        <Stat label="Stages paid" value={`${paid}/${stages.length}`} />
        <Stat
          label="Handover"
          value={timeline ? dated(timeline.handoverExpected) : "—"}
          note={timeline && timeline.extraDays > 0 ? <span className="late-text text-13">+{dayCount(timeline.extraDays)}</span> : undefined}
        />
      </Stats>

      <Panel title="Payment stages" id="payments">
        <div aria-hidden="true" className={`lettering hidden gap-x-3 px-3 pb-1 text-ink-soft ${COLS}`}>
          <span>Stage</span>
          <span className="text-right">Amount</span>
          <span>Date</span>
          <span>Status</span>
          <span className="text-right">Letter</span>
        </div>
        <ol className="grid grid-cols-1 gap-1">
          {stages.map((s) => {
            const date = stageDate(s);
            const late = s.overdueDays > 0;
            const raisable = canRaise && s.canRaiseLetter;
            const requested = !raisable && !s.letterNo && !!s.letterRequestedAt && s.state === "work-done";
            return (
              <li key={s.n} id={`m${s.n}`} className="glass-row scroll-mt-28 px-3 py-2.5">
                <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${COLS} md:items-center`}>
                  <div className="min-w-0 basis-full md:basis-auto">
                    <p className="truncate text-15 font-semibold text-ink">
                      <span className="figure mr-2 text-ink-soft">{s.n === 0 ? "S" : s.n}</span>
                      {s.name}
                      <span className="figure ml-2 text-13 font-normal text-ink-soft">{weeksLabel(s.dueClock, s.dueWeek, s.dueWeek)}</span>
                    </p>
                  </div>
                  <span className="figure text-15 text-ink md:text-right">{inr(s.total)}</span>
                  <span className={`text-13 ${late ? "late-text" : "text-ink"}`}>
                    <span className="text-ink-soft md:hidden">{date.label} </span>
                    {dated(date.at)}
                  </span>
                  <span>
                    <StatusChip tone={s.tone}>{s.status}</StatusChip>
                  </span>
                  <span className={`ml-auto min-w-0 justify-end md:ml-0 md:flex ${raisable || requested ? "flex" : "hidden"}`}>
                    {raisable ? (
                      <button
                        type="button"
                        className={s.n === firstRaise ? rowPrimary : rowBtn}
                        aria-disabled={pause.pending !== null}
                        onClick={(e) => raise(s, e.currentTarget)}
                      >
                        <IconSend /> Raise letter
                      </button>
                    ) : s.letterNo ? (
                      <span className="hidden min-w-0 items-center gap-1.5 text-13 text-ink md:inline-flex">
                        <IconFile className="text-ink-soft" label="Demand letter" />
                        <span className="truncate">{s.letterNo}</span>
                      </span>
                    ) : (
                      requested && <StatusChip tone="late">Requested</StatusChip>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>

      <Panel
        title="Changes"
        id="changes"
        aside={
          <>
            {timeline && timeline.extraDays > 0 && <span className="late-text text-15">+{dayCount(timeline.extraDays)}</span>}
            {canRecommend && !recommending && (
              <button type="button" className={rowBtn} onClick={() => setRecommending(true)}>
                <IconPlus /> Recommend
              </button>
            )}
          </>
        }
      >
        <span id="revision" className="sr-only" />
        {recommending && <RecommendForm p={p} by={viewer} onDone={() => setRecommending(false)} />}
        {changes.length === 0 ? (
          <Empty>No changes</Empty>
        ) : (
          <ul className="grid grid-cols-1 gap-1">
            {changes.map((r) => (
              <li key={r.id} className="glass-row flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                <div className="min-w-0 flex-[1_1_12rem]">
                  <p className="truncate text-15 text-ink">{r.item}</p>
                  <p className="text-13 text-ink-soft">
                    {r.id} · {day(r.raisedAt)}
                  </p>
                </div>
                <span className="figure text-15 text-ink">{inrDelta(r.amount)}</span>
                {r.days > 0 && <span className="late-text text-15">+{dayCount(r.days)}</span>}
                <StatusChip tone={changeTone(r.status)}>{r.statusWords}</StatusChip>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
