/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { rowBtn, rowPrimary } from "@/components/architect/glass-ui";
import { field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { TODAY } from "@/lib/demo-data";
import { DESK_HREF } from "@/lib/desk";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { Firm } from "@/lib/firm";
import { BLANK_DRAFT_IDS, type PersonId } from "@/lib/firm-data";
import { FACING_WORDS, PROSPECT_LEVELS, toCall, type ProspectView } from "@/lib/prospects";
import type { ProspectLevel } from "@/lib/bd-data";
import { budgetWords, draftName, idleWords } from "./bd-words";
import { Segmented } from "./bd-ui";

// A prospect under discussion: the card on the pipeline and the actions that move it (set
// the level, sign-up paid, drop with a reason). Each action waits in the pause bar first.

/** The BD person the screens are seen as. */
export const ME: PersonId = "rohan";

/** The onboarding draft a sign-up would fill, or the draft that is in the way. */
export function draftSlot(firm: Firm): { free: true } | { free: false; name: string; href: string } {
  const blanks = BLANK_DRAFT_IDS.map((id) => firm.drafts.find((x) => x.id === id)).filter((d) => !!d);
  if (blanks.some((d) => !d.opened && d.stepsDone === 0 && !d.startedAt && !d.fromProspect)) return { free: true };
  // All in use: the oldest one being set up is in the way.
  const d = blanks.filter((x) => !x.opened).sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0] ?? blanks[0];
  return { free: false, name: d ? draftName(d) : "New project", href: DESK_HREF.onboard(d?.id ?? "new") };
}

/** How long it has sat at its level, as a pill: brick once a follow-up is due; brass "To call" for a new enquiry. */
export function IdleChip({ p }: { p: ProspectView }) {
  const label = `${p.idleDays === 1 ? "1 day" : `${p.idleDays} days`} at ${p.levelLabel}`;
  if (toCall(p))
    return (
      <span className="glass-chip chip-waiting shrink-0" title={label} aria-label={`To call, ${label}`}>
        To call
      </span>
    );
  if (p.followUpDue)
    return (
      <span className="glass-chip chip-late figure shrink-0" title={label} aria-label={`Follow up, ${label}`}>
        Quiet {p.idleDays} d
      </span>
    );
  return (
    <span className="glass-chip figure shrink-0" title={label} aria-label={label}>
      {idleWords(p.idleDays)}
    </span>
  );
}

type Mode = "idle" | "signup" | "drop";

export function ProspectActions({ p, className = "" }: { p: ProspectView; className?: string }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const router = useRouter();
  const ids = useId();
  const [mode, setMode] = useState<Mode>("idle");
  const [amount, setAmount] = useState("");
  const [on, setOn] = useState(TODAY);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const waiting = pause.pending !== null;
  const slot = draftSlot(firm);

  const setLevel = (level: ProspectLevel, origin: HTMLElement) => {
    if (waiting || level === p.level) return;
    const { setProspectLevel } = demo;
    pause.start({
      what: `${p.owner} to ${PROSPECT_LEVELS[level].label}`,
      origin,
      commit: () => setProspectLevel(p.id, level, ME),
    });
  };

  const signUp = (origin: HTMLElement) => {
    if (waiting) return;
    const rupees = Number(amount.replace(/[^\d.]/g, ""));
    if (!(rupees > 0)) return setError("Add the amount");
    if (!reference.trim()) return setError("Add the UTR or cheque no.");
    setError("");
    const { convertProspect } = demo;
    pause.start({
      what: `Sign-up paid, ${p.owner}`,
      origin,
      commit: () => {
        const result = convertProspect(p.id, { amount: Math.round(rupees), on, reference: reference.trim() }, ME);
        if (result.ok) router.push(DESK_HREF.onboard(result.draftId));
      },
    });
  };

  const drop = (origin: HTMLElement) => {
    if (waiting) return;
    if (!reason.trim()) return setError("Add a reason");
    setError("");
    const { dropProspect } = demo;
    pause.start({
      what: `${p.owner}, dropped`,
      origin,
      commit: () => {
        dropProspect(p.id, reason, ME);
        setMode("idle");
      },
    });
  };

  return (
    <div className={`grid gap-3 ${className}`}>
      <Segmented
        label="Level"
        options={PROSPECT_LEVELS.map((l) => ({ id: l.level, label: `L${l.level}`, title: `${l.label}, ${l.name}` }))}
        value={p.level}
        onChange={setLevel}
      />

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={rowPrimary} onClick={() => setMode("signup")}>
            Sign-up paid
          </button>
          <button type="button" className={rowBtn} onClick={() => setMode("drop")}>
            Drop
          </button>
        </div>
      )}

      {mode === "signup" &&
        (slot.free ? (
          <form
            className="grid gap-3"
            aria-label={`Sign-up paid, ${p.owner}`}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              signUp(event.currentTarget);
            }}
          >
            <div className="grid gap-3 min-[420px]:grid-cols-2">
              <label className="grid content-start gap-1.5">
                <span className="text-15 font-semibold">₹ received</span>
                <input
                  className={field}
                  inputMode="numeric"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (error) setError("");
                  }}
                />
              </label>
              <label className="grid content-start gap-1.5">
                <span className="text-15 font-semibold">On</span>
                <input type="date" className={field} value={on} max={TODAY} onChange={(e) => setOn(e.target.value || TODAY)} />
              </label>
            </div>
            <label className="grid content-start gap-1.5" htmlFor={`${ids}-ref`}>
              <span className="text-15 font-semibold">UTR or cheque</span>
              <input
                id={`${ids}-ref`}
                className={field}
                autoComplete="off"
                value={reference}
                onChange={(e) => {
                  setReference(e.target.value);
                  if (error) setError("");
                }}
              />
            </label>
            {error && (
              <p className="text-15 font-semibold text-brick" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={rowPrimary} aria-disabled={waiting || undefined}>
                Start onboarding
              </button>
              <button type="button" className={rowBtn} onClick={() => (setMode("idle"), setError(""))}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="glass-inner grid gap-2 p-3">
            <p className="text-15 text-ink">Finish {slot.name} first</p>
            <div className="flex flex-wrap gap-2">
              <Link href={slot.href} className={rowBtn}>
                Open {slot.name}
              </Link>
              <button type="button" className={rowBtn} onClick={() => setMode("idle")}>
                Cancel
              </button>
            </div>
          </div>
        ))}

      {mode === "drop" && (
        <form
          className="grid gap-3"
          aria-label={`Drop ${p.owner}`}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            drop(event.currentTarget);
          }}
        >
          <label className="grid content-start gap-1.5">
            <span className="text-15 font-semibold">Reason</span>
            <input
              className={field}
              autoComplete="off"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
            />
          </label>
          {error && (
            <p className="text-15 font-semibold text-brick" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={rowBtn} aria-disabled={waiting || undefined}>
              Drop lead
            </button>
            <button type="button" className={rowBtn} onClick={() => (setMode("idle"), setError(""))}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** One prospect on the pipeline: who, where, what they want, and how long at this level. */
export function ProspectCard({
  p,
  open,
  onToggle,
  showAdvisor,
}: {
  p: ProspectView;
  open: boolean;
  onToggle: () => void;
  showAdvisor: boolean;
}) {
  const firm = useFirm();
  const mine = p.advisor === ME;
  const advisor = firm.person(p.advisor)?.first ?? p.advisor;
  return (
    <li
      className={`glass-row grid grid-cols-[minmax(0,1fr)] gap-2 px-3 py-2.5 ${
        p.followUpDue ? "shadow-[inset_3px_0_0_var(--color-brick)]" : toCall(p) ? "shadow-[inset_3px_0_0_var(--color-brass)]" : ""
      }`}
    >
      <Link href={DESK_HREF.prospect(p.id)} className="grid min-w-0 gap-0.5 hover:underline">
        <span className="text-15 font-semibold text-ink">{p.owner}</span>
        <span className="truncate text-13 text-ink-soft">{p.locality || p.layoutName}</span>
      </Link>
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-13 text-ink">
        <span className="figure">{p.bedrooms} BHK</span>
        <span className="figure">{budgetWords(p.budget)}</span>
        <span className="figure" title={`${p.plotDimensions}, ${FACING_WORDS[p.facing]} facing`}>
          {p.plotDimensions.replace(/\s*ft$/, "")} · {p.facing}
        </span>
      </p>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <IdleChip p={p} />
          {(showAdvisor || !mine) && <span className="truncate text-13 text-ink-soft">{advisor}</span>}
        </span>
        {mine ? (
          <button type="button" className="btn btn-glass min-h-11 shrink-0 px-3 text-15" aria-expanded={open} onClick={onToggle}>
            {open ? "Close" : "Move"}
          </button>
        ) : null}
      </div>
      {open && mine && <ProspectActions p={p} className="border-t border-ink/10 pt-3" />}
    </li>
  );
}
