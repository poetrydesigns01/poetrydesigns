"use client";

import { useRef, useState } from "react";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo } from "@/lib/demo-store";
import type { LetterView } from "@/lib/firm";
import type { PersonId } from "@/lib/firm-data";
import { addDays, formatShortDate, inr } from "@/lib/format";
import { rupeesFrom, toCome, withGstWords } from "./shared";

// Recording money in against one demand letter. A bank usually pays its share first and
// the client the rest, so a letter can take two or more receipts: each one is recorded on
// its own, with where it came from and its UTR. The letter reads "Part paid" until the
// receipts reach the total with GST, then "Paid".

type Source = "bank" | "client";

export function RecordPayment({
  letter,
  person,
  onDone,
}: {
  letter: LetterView;
  person: PersonId;
  onDone: () => void;
}) {
  const demo = useDemo();
  const pause = usePause();
  const submitRef = useRef<HTMLButtonElement>(null);
  const remaining = toCome(letter);
  const [amount, setAmount] = useState(String(remaining));
  const [on, setOn] = useState(TODAY);
  const [source, setSource] = useState<Source | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; source?: string; reference?: string; on?: string }>({});

  const value = rupeesFrom(amount);
  const after = Number.isFinite(value) ? letter.received + value : letter.received;
  const readBack =
    Number.isFinite(value) && value > 0
      ? after >= letter.total
        ? `${inr(value)} from the ${source ?? "bank or client"}. The letter is then paid in full.`
        : `${inr(value)} from the ${source ?? "bank or client"}. ${inr(letter.total - after)} with GST still to come after it.`
      : "";

  const submit = (origin: HTMLElement) => {
    if (pause.pending !== null) return;
    const next: typeof errors = {};
    if (!Number.isFinite(value) || value <= 0) next.amount = "Write the amount received, in rupees.";
    else if (value > remaining) next.amount = `That is more than the ${inr(remaining)} still to come on this letter.`;
    if (!source) next.source = "Say where the money came from.";
    if (!reference.trim()) next.reference = "Write the UTR or cheque number from the bank statement.";
    if (!on || on > TODAY) next.on = "The date cannot be after today.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !source) return;

    const { record } = demo;
    const ref = note.trim() ? `${reference.trim()}. ${note.trim()}` : reference.trim();
    pause.start({
      what: `${inr(value)} from the ${source} for ${letter.projectName}, letter ${letter.short}`,
      origin,
      commit: () => {
        const n = getDemoSnapshot().events.length + 1;
        record({
          kind: "receipt.recorded",
          receipt: {
            id: `r-live-${n}`,
            projectId: letter.projectId,
            n: letter.n,
            amount: value,
            source,
            reference: ref,
            on,
            by: person,
          },
          by: person,
        });
        onDone();
      },
    });
  };

  return (
    <form
      className="grid gap-4 border-t border-sand pt-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(submitRef.current ?? event.currentTarget);
      }}
    >
      <p className="text-15 text-ink-soft">
        {letter.received > 0
          ? `${inr(letter.received)} received so far. ${withGstWords(remaining)} still to come.`
          : `Nothing received yet on this letter.`}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount received, with GST" error={errors.amount}>
          <input
            className={field}
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            aria-invalid={errors.amount ? true : undefined}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
        <Field label="Date received" error={errors.on}>
          <input
            className={field}
            type="date"
            value={on}
            min={addDays(TODAY, -60)}
            max={TODAY}
            onChange={(event) => setOn(event.target.value)}
          />
        </Field>
      </div>
      <div>
        <ChipGroup label="Where it came from" columns={2}>
          <Chip pressed={source === "bank"} onClick={() => setSource("bank")}>
            From the bank
          </Chip>
          <Chip pressed={source === "client"} onClick={() => setSource("client")}>
            From the client
          </Chip>
        </ChipGroup>
        {errors.source && (
          <p className="mt-1.5 text-15 font-semibold text-brick" role="alert">
            {errors.source}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reference (UTR)" hint="From the bank statement." error={errors.reference}>
          <input
            className={field}
            autoComplete="off"
            value={reference}
            aria-invalid={errors.reference ? true : undefined}
            onChange={(event) => setReference(event.target.value)}
          />
        </Field>
        <Field label="Note" hint="Optional.">
          <input className={field} autoComplete="off" value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>
      {readBack && (
        <p className="text-15">
          {readBack} {on !== TODAY && `Received on ${formatShortDate(on)}.`}
        </p>
      )}
      <div>
        <button ref={submitRef} type="submit" className="btn btn-primary w-full sm:w-auto" aria-disabled={pause.pending !== null}>
          Record payment
        </button>
      </div>
    </form>
  );
}
