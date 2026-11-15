"use client";

import Link from "next/link";
import { useId, useRef, useState, type RefObject } from "react";
import { StatusChip } from "@/components/register/status-chip";
import { formatShortDate, formatStampShort, inr } from "@/lib/format";
import type { PaymentStageView } from "@/lib/portal";
import { instalmentOf } from "@/lib/workflow-template";
import { planDate } from "./dates";
import { CheckIcon, ClockIcon, LetterIcon, LockIcon } from "./icons";

// The client's payments as Poetry's workflow has them: the sign-up, then instalments 1 to
// 10, each with the milestone it opens (plain words), its due date, the amount with GST, the
// demand letter slot and the payment slot. Received instalments fold into one line that
// opens on tap, so the list starts at what is still to come. An instalment stays locked
// until the one before it is received, and the milestone it opens cannot start until it is.
// From 1024 px every field is a column; below, the date sits under the name and the two
// slots in one row under that, letter first, so rows line up.

const ROW =
  "grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3 " +
  "md:grid-cols-[2.25rem_minmax(0,1fr)_7.5rem_8.5rem_10rem] lg:grid-cols-[2.25rem_minmax(0,1fr)_6rem_7.5rem_8.5rem_9.5rem]";

/**
 * The date the client reads for an instalment: the letter's due date once a letter is raised
 * (the same date the summary shows), else the planned date of its due week.
 */
export function dueWords(stage: PaymentStageView): string {
  return stage.dueDate ? `by ${planDate(stage.dueDate)}` : planDate(stage.expectedDueDate);
}

export function StageTable({
  stages,
  onMarkPaid,
  onRequestLetter,
}: {
  stages: PaymentStageView[];
  onMarkPaid: (stage: PaymentStageView, ref: string) => void;
  onRequestLetter: (stage: PaymentStageView) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [showPaid, setShowPaid] = useState(false);
  const paidId = useId();
  // The first stage due takes the screen's one primary button.
  const firstDue = stages.find((s) => s.canMarkPaid)?.n ?? null;
  // Only the first locked stage says what it waits for; the rest show the chip alone.
  const firstLocked = stages.find((s) => s.locked)?.n ?? null;
  const paid = stages.filter((s) => s.state === "paid");
  const toCome = stages.filter((s) => s.state !== "paid");
  const received = paid.reduce((sum, s) => sum + s.received, 0);
  const row = (stage: PaymentStageView) => (
    <StageRow
      key={stage.n}
      stage={stage}
      primary={stage.n === firstDue}
      firstLocked={stage.n === firstLocked}
      open={open === stage.n}
      onToggle={() => setOpen((current) => (current === stage.n ? null : stage.n))}
      onClose={() => setOpen(null)}
      onMarkPaid={onMarkPaid}
      onRequestLetter={onRequestLetter}
    />
  );

  return (
    <section className="glass-strong p-2 sm:p-3" aria-labelledby="stages-heading">
      <h2 id="stages-heading" className="sr-only">
        Instalments
      </h2>
      <div className={`${ROW} hidden py-2 md:grid`} aria-hidden="true">
        <span />
        <span className="lettering text-ink-soft">Instalment</span>
        <span className="lettering hidden text-ink-soft lg:block">Due</span>
        <span className="lettering text-right text-ink-soft">With GST</span>
        <span className="lettering text-ink-soft">Demand letter</span>
        <span className="lettering text-ink-soft">Payment</span>
      </div>
      {paid.length > 0 && (
        <div className="pb-1">
          <button
            type="button"
            aria-expanded={showPaid}
            aria-controls={paidId}
            onClick={() => setShowPaid((v) => !v)}
            className={`glass-row w-full cursor-pointer text-left ${ROW}`}
          >
            <span className="pay-disc text-15 font-semibold" data-tone="done" aria-hidden="true">
              <CheckIcon />
            </span>
            <span className="text-15 font-semibold text-ink">
              Paid{" "}
              <span className="figure font-normal text-ink-soft">
                {paid.length} of {stages.length}
              </span>
            </span>
            <span className="hidden lg:block" aria-hidden="true" />
            <span className="figure flex items-center justify-end gap-2 text-15 text-ink">
              {inr(received)}
              <span className="md:hidden">
                <Chevron open={showPaid} />
              </span>
            </span>
            <span className="hidden justify-end md:col-span-2 md:flex">
              <Chevron open={showPaid} />
            </span>
          </button>
          {showPaid && (
            <ol id={paidId} className="mt-1 rounded-xl bg-white/30">
              {paid.map(row)}
            </ol>
          )}
        </div>
      )}
      <ol>{toCome.map(row)}</ol>
    </section>
  );
}

function StageRow({
  stage,
  primary,
  firstLocked,
  open,
  onToggle,
  onClose,
  onMarkPaid,
  onRequestLetter,
}: {
  stage: PaymentStageView;
  primary: boolean;
  firstLocked: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMarkPaid: (stage: PaymentStageView, ref: string) => void;
  onRequestLetter: (stage: PaymentStageView) => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const refId = useId();
  const [reference, setReference] = useState("");
  const discTone = stage.state === "paid" ? "done" : stage.locked ? "locked" : "open";
  const percent = instalmentOf(stage.n)?.percent;

  /** After a write the button that held focus is gone: focus stays on the row. */
  const keepFocus = () => window.setTimeout(() => rowRef.current?.focus(), 0);

  return (
    <li
      ref={rowRef}
      tabIndex={-1}
      data-row-id={`pay:${stage.projectId}:${stage.n}`}
      className={`glass-row scroll-mt-24 outline-none focus-visible:ring-2 focus-visible:ring-laterite ${ROW}`}
    >
      <span className="pay-disc text-15 font-semibold" data-tone={discTone} aria-hidden="true">
        {stage.state === "paid" ? <CheckIcon /> : stage.locked ? <LockIcon className="text-ink-soft" /> : stage.n === 0 ? "S" : stage.n}
      </span>

      <span className="grid min-w-0">
        <span className={`text-15 font-semibold break-words ${stage.locked ? "text-ink-soft" : "text-ink"}`}>
          {stage.instalmentLabel}
          {percent !== undefined && <span className="figure font-normal text-ink-soft"> · {percent}%</span>}
        </span>
        <span className="truncate text-13 text-ink-soft">
          {stage.unlocks ? (
            <>
              <span className="sr-only">Opens </span>
              {stage.name}
            </>
          ) : (
            "Advance"
          )}
        </span>
        <span className="figure text-13 text-ink-soft lg:hidden">{dueWords(stage)}</span>
      </span>

      <span className="figure hidden text-15 text-ink lg:block">{dueWords(stage)}</span>

      <span className={`figure text-right text-15 ${stage.locked ? "text-ink-soft" : "text-ink"}`}>{inr(stage.total)}</span>

      {stage.locked ? (
        <span className="col-span-3 flex items-center gap-2 text-13 text-ink-soft min-[480px]:max-md:pl-12 md:col-span-2">
          <StatusChip tone="locked">Locked</StatusChip>
          <span className={firstLocked ? undefined : "sr-only"}>
            After {stage.blockedBy === 0 ? "sign-up" : `instalment ${stage.blockedBy}`}
          </span>
        </span>
      ) : (
        <span className="col-span-3 flex flex-wrap items-center gap-x-2 gap-y-2 min-[480px]:max-md:pl-12 md:contents">
          <span className="reg-action flex min-w-30 items-center md:min-w-0">
            <LetterSlot
              stage={stage}
              onRequest={() => {
                onRequestLetter(stage);
                keepFocus();
              }}
            />
          </span>
          <span className="reg-action flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <PaymentSlot stage={stage} primary={primary && !open} open={open} triggerRef={triggerRef} onToggle={onToggle} />
          </span>
        </span>
      )}

      {open && stage.canMarkPaid && (
        <form
          className="pay-panel col-span-3 grid gap-3 rounded-xl border border-ink/10 bg-white/50 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end md:col-span-5 md:ml-12 lg:col-span-6"
          onSubmit={(event) => {
            event.preventDefault();
            onMarkPaid(stage, reference);
            setReference("");
            onClose();
            keepFocus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onClose();
              triggerRef.current?.focus();
            }
          }}
        >
          <label htmlFor={refId} className="grid gap-1">
            <span className="text-13 font-semibold text-ink">
              Reference <span className="font-normal text-ink-soft">(optional)</span>
            </span>
            <input
              id={refId}
              className="glass-field min-h-11 w-full px-3 text-17 text-ink placeholder:text-ink-soft"
              placeholder="UTR or cheque no."
              autoComplete="off"
              autoFocus
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </label>
          <button type="submit" className="btn btn-primary min-h-11">
            Confirm {inr(stage.outstanding)} paid
          </button>
          <button
            type="button"
            className="btn btn-glass min-h-11"
            onClick={() => {
              onClose();
              triggerRef.current?.focus();
            }}
          >
            Cancel
          </button>
        </form>
      )}
    </li>
  );
}

function LetterSlot({ stage, onRequest }: { stage: PaymentStageView; onRequest: () => void }) {
  if (stage.letterNo && (stage.state === "due" || stage.state === "client-paid" || stage.state === "paid")) {
    return (
      <Link
        href={`/client/payments/letter/${stage.n}`}
        className="group inline-flex min-h-11 items-center rounded-full"
        aria-label={`Demand letter raised, ${stage.instalmentLabel}. View letter`}
      >
        <span className="glass-chip chip-done gap-1.5 transition-transform group-hover:-translate-y-px">
          Letter raised
          <LetterIcon />
        </span>
      </Link>
    );
  }
  if (stage.canRequestLetter) {
    return (
      <button type="button" className="btn btn-glass min-h-11 text-15" onClick={onRequest}>
        Request letter
      </button>
    );
  }
  if (stage.state === "work-done") {
    return (
      <span className="inline-grid justify-items-start gap-1">
        <StatusChip tone="waiting">{stage.status}</StatusChip>
        {stage.letterRequestedAt && <span className="px-1 text-13 text-ink-soft">{formatStampShort(stage.letterRequestedAt)}</span>}
      </span>
    );
  }
  if (stage.state === "in-progress") return <StatusChip tone="progress">{stage.status}</StatusChip>;
  if (stage.state === "open") return <StatusChip tone="locked">{stage.status}</StatusChip>;
  return (
    <span className="text-15 text-ink-soft max-md:invisible">
      <span aria-hidden="true">—</span>
      <span className="sr-only">No letter</span>
    </span>
  );
}

function PaymentSlot({
  stage,
  primary,
  open,
  triggerRef,
  onToggle,
}: {
  stage: PaymentStageView;
  primary: boolean;
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}) {
  if (stage.state === "paid") {
    return (
      <StatusChip tone="done">
        Received
        {stage.receivedAt && <span className="font-normal"> · {formatShortDate(stage.receivedAt)}</span>}
      </StatusChip>
    );
  }
  if (stage.state === "client-paid") {
    return (
      <span className="inline-grid justify-items-start gap-1">
        <StatusChip tone="waiting">Payment made</StatusChip>
        {stage.clientPaidAt && (
          <span className="inline-flex items-center gap-1 px-1 text-13 text-ink-soft">
            <ClockIcon />
            {formatStampShort(stage.clientPaidAt)}
          </span>
        )}
      </span>
    );
  }
  if (stage.canMarkPaid) {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          className={`btn min-h-11 whitespace-nowrap text-15 ${primary ? "btn-primary" : "btn-glass"}`}
          aria-expanded={open}
          onClick={onToggle}
        >
          Payment made
        </button>
        {stage.overdueDays > 0 && <span className="late-text text-13">{stage.status}</span>}
      </>
    );
  }
  return <span className="text-13 text-ink-soft">After letter</span>;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`size-4 shrink-0 text-ink-soft transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
