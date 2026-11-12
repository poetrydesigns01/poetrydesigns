"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { useDemo } from "@/lib/demo-store";
import type { DeletedTarget } from "@/lib/firm-data";

// Only the admin deletes, and never in one step. "Delete" asks the question and a reason;
// the second "Delete" waits five seconds like every other record; then the line is struck,
// with who and why, and the log keeps it. Nothing is removed from the record itself.

export function TwoStepDelete({
  question,
  what,
  target,
  label = "Delete",
}: {
  /** "Delete AAC blocks 4 inch?" */
  question: string;
  /** What record.deleted says: "'4 inch' from Solid blocks in the catalogue". */
  what: string;
  /** The line struck, for the firm to apply: a catalogue line, a vendor or a bill. */
  target: DeletedTarget;
  label?: string;
}) {
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const startRef = useRef<HTMLButtonElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const mine = pause.pending?.what === `Delete ${what}`;

  const close = () => {
    if (mine) pause.cancel();
    setAsking(false);
    setError("");
    window.setTimeout(() => startRef.current?.focus(), 0);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    const why = reason.trim();
    if (!why) {
      setError("Write why it is being deleted. It is kept in the log.");
      return;
    }
    pause.start({
      what: `Delete ${what}`,
      commit: () => {
        demo.record({ kind: "record.deleted", what, reason: why, target, by: "shalini" });
        setAsking(false);
        setReason("");
      },
    });
  };

  if (!asking) {
    return (
      <button
        ref={startRef}
        type="button"
        className="btn btn-quiet min-h-11"
        onClick={() => {
          setAsking(true);
          // The question replaces the button, so focus moves to its reason.
          window.setTimeout(() => reasonRef.current?.focus(), 0);
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="grid w-full gap-3 border-l-2 border-sand py-2 pl-4">
      <p className="text-17 font-semibold">{question}</p>
      <label htmlFor={`${ids}-why`} className="text-15 font-semibold">
        Reason
      </label>
      <input
        ref={reasonRef}
        id={`${ids}-why`}
        className={field}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          if (error) setError("");
        }}
      />
      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="btn btn-quiet min-h-11 text-brick"
          aria-disabled={pause.pending ? true : undefined}
        >
          Delete
        </button>
        <button type="button" className="btn btn-quiet min-h-11" onClick={close}>
          Keep it
        </button>
      </div>
    </form>
  );
}

/** A struck line's note: "Deleted by Shalini Murthy on 11 Nov, 4:10 pm. Entered twice." */
export function StruckNote({ by, at, reason }: { by: string; at: string; reason: string }) {
  return (
    <p className="lettering text-ink-soft">
      Deleted by {by}, {at}. {reason.replace(/\.?$/, ".")}
    </p>
  );
}
