"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useDemo } from "@/lib/demo-store";
import { CheckIcon, PencilIcon, QuoteIcon } from "./icons";
import { proofStamp, type ItemView } from "./items";

// Approve or Modify, the same in a table row and in the viewer. Approve asks once more;
// Modify opens a comment box, the only place she types. Each decision is recorded with the
// date and time and stays on screen as the proof.
//
// Focus follows the step: into the confirm or the comment box when it opens, back to the
// button that opened it on Cancel, and onto the proof once decided.

export type DecisionMode = "idle" | "approve" | "modify";

/** `onDecided` runs once she approves or sends a change here (the designs table keeps the group open). */
export function useDecision(item: ItemView, onDecided?: () => void) {
  const demo = useDemo();
  const [mode, setMode] = useState<DecisionMode>("idle");
  const [comment, setComment] = useState("");
  /** The button focus returns to after Cancel. */
  const [returnTo, setReturnTo] = useState<"approve" | "modify" | null>(null);
  /** Set when she decides here, so the proof takes focus as it appears. */
  const [decided, setDecided] = useState(false);

  return {
    mode,
    comment,
    setComment,
    returnTo,
    decided,
    open: (next: Exclude<DecisionMode, "idle">) => {
      setReturnTo(null);
      setMode(next);
    },
    cancel: () => {
      setReturnTo(mode === "modify" ? "modify" : "approve");
      setMode("idle");
    },
    approve: () => {
      demo.decideDesign(item.id, "approved");
      setDecided(true);
      onDecided?.();
      setMode("idle");
    },
    /** Sends the comment; false when there is nothing to send. */
    send: (): boolean => {
      const text = comment.trim();
      if (!text) return false;
      demo.decideDesign(item.id, "changes-requested", text);
      setComment("");
      setDecided(true);
      onDecided?.();
      setMode("idle");
      return true;
    },
  };
}

export type Decision = ReturnType<typeof useDecision>;

/** The step after Approve or Modify: one confirm, or the comment box. */
export function DecisionStep({ item, decision, dark = false }: { item: ItemView; decision: Decision; dark?: boolean }) {
  const labelId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const soft = dark ? "text-lime/75" : "text-ink-soft";
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      decision.cancel();
    }
  };

  if (decision.mode === "approve") {
    return (
      <div role="group" aria-labelledby={labelId} onKeyDown={onKeyDown} className="grid gap-3">
        <div>
          <p id={labelId} className="text-17 font-semibold">
            Approve v{item.version}?
          </p>
          <p className={`text-13 ${soft}`}>Logged with date and time</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button autoFocus type="button" className="btn btn-primary gap-2" onClick={decision.approve}>
            <CheckIcon className="size-5" />
            Approve
          </button>
          <button type="button" className="btn btn-glass" onClick={decision.cancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (decision.mode === "modify") {
    const empty = decision.comment.trim() === "";
    return (
      <form
        onKeyDown={onKeyDown}
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!decision.send()) textRef.current?.focus();
        }}
      >
        <label htmlFor={labelId} className="text-17 font-semibold">
          What to change?
        </label>
        <textarea
          ref={textRef}
          autoFocus
          id={labelId}
          rows={3}
          value={decision.comment}
          onChange={(event) => decision.setComment(event.target.value)}
          className={`glass-field w-full resize-y px-3 py-2.5 text-17 text-ink ${dark ? "bg-paper focus:bg-paper" : ""}`}
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" aria-disabled={empty || undefined}>
            Send
          </button>
          <button type="button" className="btn btn-glass" onClick={decision.cancel}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return null;
}

/** The decision kept as proof: what she decided, on which day, at what time. */
export function DecisionProof({
  item,
  focus = false,
  dark = false,
  words = true,
}: {
  item: ItemView;
  /** Take focus on arrival: she has just decided. */
  focus?: boolean;
  dark?: boolean;
  /** Say "Approved" or "Modify sent" before the time; a row whose chip already says it keeps it for screen readers. */
  words?: boolean;
}) {
  const proofRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) proofRef.current?.focus();
  }, [focus]);

  if (item.status !== "approved" && item.status !== "modify") return null;
  const approved = item.status === "approved";
  const soft = dark ? "text-lime/75" : "text-ink-soft";
  const what = approved ? "Approved" : "Modify sent";
  return (
    <div ref={proofRef} tabIndex={-1} className="grid min-w-0 gap-1 rounded-lg outline-offset-4">
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-15">
        <span
          aria-hidden="true"
          className={`grid size-6 shrink-0 place-items-center rounded-full ${
            approved ? (dark ? "bg-kota text-lime" : "bg-kota/15 text-kota") : dark ? "bg-lime/15 text-lime" : "bg-laterite/12 text-laterite"
          }`}
        >
          {approved ? <CheckIcon className="size-4" /> : <PencilIcon className="size-4" />}
        </span>
        <span className={words ? "font-semibold" : "sr-only"}>{what}</span>
        <span className={`figure ${words ? soft : "text-ink-soft"}`}>{proofStamp(item.decidedAt)}</span>
      </p>
      {!approved && item.comment && (
        <p className={`flex gap-1.5 text-15 ${soft}`}>
          <QuoteIcon className="mt-0.5 size-4" />
          <span className="min-w-0">{item.comment}</span>
        </p>
      )}
    </div>
  );
}
