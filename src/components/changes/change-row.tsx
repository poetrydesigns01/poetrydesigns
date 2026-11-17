/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { flushSync } from "react-dom";
import { CheckIcon, ChatIcon, EyeIcon } from "@/components/craft/glass-icons";
import { usePause } from "@/components/register/recording-pause";
import { StatusChip } from "@/components/register/status-chip";
import { withGst } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import { formatDate, formatShortDate, formatTime, inr, inrDelta } from "@/lib/format";
import type { ProjectedChange } from "@/lib/projection";
import type { Tone } from "@/lib/portal";

// One proposed change as a table row: item, cost, extra days, status, and the answers.
// Approve opens a one-line confirmation with the total and the days; Ask opens a comment.
// Either waits in the pause bar before it is recorded. A decided row shows when.
// The answers live in useChangeAnswer so the specification page offers the same two.

export type RowMode = "approve" | "ask" | null;

/** The grid every row and the head share, from 1024 px. */
export const CHANGE_GRID =
  "lg:grid-cols-[minmax(0,1fr)_8rem_6.5rem_7.5rem_18.5rem] lg:items-center lg:gap-x-4";

/** "7 Nov, 4:10 pm"; a plain date stays a date. */
export function changeStamp(at: string): string {
  const time = formatTime(at);
  return time ? `${formatShortDate(at)}, ${time}` : formatDate(at);
}

export function changeStatus(change: ProjectedChange): { tone: Tone; words: string } {
  if (change.status === "approved") return { tone: "done", words: "Approved" };
  if (change.status === "pending") return { tone: "waiting", words: "To decide" };
  return { tone: "progress", words: "Asked" };
}

/**
 * Ask and Approve for one change: `buttons` (the two answers, plus a preview toggle when
 * `preview` is on) and `more` (the confirmation or the comment box, always rendered so the
 * buttons can point at it). `focusRef` is where focus lands once the decision is recorded.
 */
export function useChangeAnswer({
  change,
  mode,
  onMode,
  focusRef,
  preview = true,
  dark = false,
  comment,
  moreClassName = "",
}: {
  change: ProjectedChange;
  mode: RowMode;
  onMode: (mode: RowMode) => void;
  focusRef: RefObject<HTMLElement | null>;
  preview?: boolean;
  dark?: boolean;
  comment?: string;
  moreClassName?: string;
}): { buttons: ReactNode; more: ReactNode } {
  const demo = useDemo();
  const pause = usePause();
  const id = useId();
  const approveRef = useRef<HTMLButtonElement>(null);
  const askRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState(false);

  const pending = change.status === "pending";
  const total = withGst(change.cost).total;
  const name = change.short.replace(/^the /, "");
  const approveWhat = `Your approval of ${change.short}`;
  const askWhat = `Your comment on ${change.short}`;
  const busy = pause.pending !== null && (pause.pending.what === approveWhat || pause.pending.what === askWhat);

  const open = (next: RowMode) => {
    if (busy) return;
    flushSync(() => {
      onMode(next);
      setError(false);
    });
    if (next === "approve") confirmRef.current?.focus();
    if (next === "ask") fieldRef.current?.focus();
  };

  const close = () => {
    const back = mode === "ask" ? askRef.current : approveRef.current;
    if (busy) pause.cancel();
    flushSync(() => onMode(null));
    back?.focus();
  };

  const approve = () => {
    if (busy) return;
    pause.start({
      what: approveWhat,
      origin: confirmRef.current,
      commit: () => {
        const here = focusRef.current?.contains(document.activeElement) ?? false;
        flushSync(() => {
          demo.decideChange(change.id, "approved");
          onMode(null);
        });
        if (here) focusRef.current?.focus({ preventScroll: true });
      },
    });
  };

  const send = () => {
    if (busy) return;
    const words = text.trim();
    if (words.length < 3) {
      setError(true);
      fieldRef.current?.focus();
      return;
    }
    pause.start({
      what: askWhat,
      origin: sendRef.current,
      commit: () => {
        const here = focusRef.current?.contains(document.activeElement) ?? false;
        flushSync(() => {
          demo.decideChange(change.id, "changes-asked", words);
          setText("");
          onMode(null);
        });
        if (here) focusRef.current?.focus({ preventScroll: true });
      },
    });
  };

  const buttons = pending ? (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end lg:flex-nowrap">
      {preview && (
        <button
          type="button"
          className={`btn btn-glass size-11 min-h-11 p-0 ${change.trying ? "bg-rosewood text-lime hover:bg-rosewood" : ""}`}
          aria-pressed={change.trying}
          aria-label={`Preview ${change.short} in the contract value`}
          title="Preview in the contract value"
          onClick={() => demo.setTrying(change.id, !change.trying)}
        >
          <EyeIcon />
        </button>
      )}
      <button
        ref={askRef}
        type="button"
        className="btn btn-glass min-h-11 flex-1 gap-1.5 px-4 text-15 sm:flex-none"
        aria-expanded={mode === "ask"}
        aria-controls={`${id}-more`}
        onClick={() => (mode === "ask" ? close() : open("ask"))}
      >
        <ChatIcon size={17} />
        Ask
      </button>
      <button
        ref={approveRef}
        type="button"
        className="btn btn-glass min-h-11 flex-1 gap-1.5 px-4 text-15 sm:flex-none"
        aria-expanded={mode === "approve"}
        aria-controls={`${id}-more`}
        onClick={() => (mode === "approve" ? close() : open("approve"))}
      >
        <CheckIcon size={17} className={dark ? "" : "text-kota"} />
        Approve
      </button>
    </div>
  ) : null;

  const more = (
    <div id={`${id}-more`} className={`empty:hidden ${moreClassName}`}>
      {pending && mode === "approve" && (
        <div
          className="glass-inner enter-row flex flex-wrap items-center justify-between gap-3 p-3"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="figure text-22">{inr(total)}</span>
            <span className="text-13 text-ink-soft">with GST</span>
            {change.delayDays > 0 && <span className="late-text text-15">+{change.delayDays} days</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-glass min-h-11 px-4 text-15" onClick={close}>
              Cancel
            </button>
            <button
              ref={confirmRef}
              type="button"
              className="btn btn-primary min-h-11 gap-1.5 px-5 text-15"
              aria-disabled={busy || undefined}
              onClick={approve}
            >
              <CheckIcon size={17} />
              Approve {name}
            </button>
          </div>
        </div>
      )}

      {pending && mode === "ask" && (
        <div className="glass-inner enter-row grid gap-2 p-3">
          <label htmlFor={`${id}-ask`} className="lettering text-ink-soft">
            What should change?
          </label>
          <textarea
            ref={fieldRef}
            id={`${id}-ask`}
            rows={2}
            maxLength={600}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setError(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                close();
              }
            }}
            aria-invalid={error || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="glass-field block min-h-20 w-full px-3 py-2 text-17 leading-snug"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p id={`${id}-error`} className="late-text text-13" aria-live="polite">
              {error ? "Add a comment" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-glass min-h-11 px-4 text-15" onClick={close}>
                Cancel
              </button>
              <button
                ref={sendRef}
                type="button"
                className="btn btn-primary min-h-11 px-5 text-15"
                aria-disabled={busy || undefined}
                onClick={send}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {change.status !== "pending" && change.status !== "approved" && comment && (
        <p className="glass-inner px-3 py-2 text-15">&ldquo;{comment}&rdquo;</p>
      )}
    </div>
  );

  return { buttons, more };
}

export function ChangeRow({
  change,
  mode,
  onMode,
  decidedAt,
  comment,
}: {
  change: ProjectedChange;
  mode: RowMode;
  onMode: (mode: RowMode) => void;
  /** "YYYY-MM-DDTHH:mm" or a plain date, once decided. */
  decidedAt?: string;
  comment?: string;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const status = changeStatus(change);
  // A change approved before construction began is already in the weekly plan, so it adds no days.
  const inPlan = useFirm().timeline("iyer")?.inPlan.some((c) => c.id === change.id) ?? false;
  const { buttons, more } = useChangeAnswer({
    change,
    mode,
    onMode,
    focusRef: rowRef,
    comment,
    moreClassName: "order-6 col-span-2 lg:col-span-5",
  });

  return (
    <li
      ref={rowRef}
      tabIndex={-1}
      className={`glass-row outline-offset-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-3 py-3 ${CHANGE_GRID}`}
    >
      <div className="order-1 min-w-0 lg:order-none">
        <Link
          href={`/client/changes/${change.id}/specification`}
          className="-my-2.5 flex min-h-11 items-center py-2.5 text-17 font-semibold leading-snug hover:underline lg:my-0 lg:block lg:min-h-0 lg:py-0"
          aria-label={`${change.title}, open specification ${change.revisedSpec.sheet}`}
        >
          {change.title}
        </Link>
        <p className="text-13 text-ink-soft">
          {change.raisedBy} · {formatShortDate(change.raisedOn)}
        </p>
      </div>

      <div className="figure order-3 self-center text-17 lg:order-none">
        <span className="sr-only">Cost </span>
        {inrDelta(change.cost)}
      </div>

      <div className="order-4 self-center justify-self-end text-15 lg:order-none lg:justify-self-start">
        <span className="sr-only">Extra time </span>
        {inPlan ? (
          <span className="text-ink-soft">In the plan</span>
        ) : change.delayDays > 0 ? (
          <span className="late-text">+{change.delayDays} days</span>
        ) : (
          <span>0 days</span>
        )}
      </div>

      <div className="order-2 justify-self-end lg:order-none lg:justify-self-start">
        <StatusChip tone={status.tone}>{status.words}</StatusChip>
      </div>

      <div className="order-5 col-span-2 lg:order-none lg:col-span-1 lg:justify-self-end">
        {buttons ?? <p className="text-13 text-ink-soft lg:text-right">{decidedAt ? changeStamp(decidedAt) : ""}</p>}
      </div>

      {more}
    </li>
  );
}
