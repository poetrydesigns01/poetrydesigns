/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useRef, useState } from "react";
import { field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { useDemo, useFirm } from "@/lib/demo-store";
import { chargedHours, quoteFee } from "@/lib/fees";
import { formatStampShort, inr } from "@/lib/format";
import { Panel } from "./glass-kit";

// Setup, Fees: the architect fee a client pays for more advisory hours or a design change.
// The rate an hour (before GST), the least hours a design change is charged, and what two
// sample requests would cost at the figures typed. A Project Head's approval works the fee
// out from the rule as it stands then; a later change never alters a fee already sent.

const SAMPLE_HOURS = 4;

function hoursWords(n: number): string {
  return n === 1 ? "1 hour" : `${n} hours`;
}

export function FeeRuleTab() {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const id = useId();
  const saveRef = useRef<HTMLButtonElement>(null);
  const rule = firm.feeRule;
  const [rate, setRate] = useState(String(rule.ratePerHour));
  const [least, setLeast] = useState(String(rule.minChangeHours));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const rateN = Number(rate);
  const leastN = Number(least);
  const valid = Number.isFinite(rateN) && rateN > 0 && Number.isFinite(leastN) && leastN >= 0 && leastN <= 40;
  const changed = valid && (Math.round(rateN) !== rule.ratePerHour || leastN !== rule.minChangeHours);
  const draft = { ratePerHour: valid ? Math.round(rateN) : rule.ratePerHour, gstRate: rule.gstRate, minChangeHours: valid ? leastN : rule.minChangeHours };
  const hoursFee = quoteFee(chargedHours("hours", SAMPLE_HOURS, draft), draft);
  const changeFee = quoteFee(chargedHours("design-change", 1, draft), draft);
  const what = "The new architect fee";
  const saving = pause.pending?.what === what;
  const by = rule.setBy ? firm.person(rule.setBy)?.name : undefined;

  const save = () => {
    if (!valid) {
      setError("Enter a rate above ₹0 and hours from 0 to 40");
      return;
    }
    if (!changed || saving) return;
    const r = Math.round(rateN);
    const h = leastN;
    const note = reason;
    pause.start({
      what,
      origin: saveRef.current,
      commit: () => {
        demo.setFeeRule(r, h, note, "shalini");
        setReason("");
      },
    });
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-labelledby={`${id}-now`} className="glass-dark grid content-start gap-3 p-5 sm:p-6">
        <h2 id={`${id}-now`} className="lettering text-lime/75">
          Architect fee
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="figure text-32">{inr(rule.ratePerHour)}</span>
          <span className="text-15 text-lime/75">an hour + {Math.round(rule.gstRate * 100)}% GST</span>
        </p>
        <dl className="grid grid-cols-2 gap-2">
          <div className="glass-inner px-3 py-2.5">
            <dt className="lettering text-lime/75">An hour, with GST</dt>
            <dd className="figure text-22">{inr(quoteFee(1, rule).total)}</dd>
          </div>
          <div className="glass-inner px-3 py-2.5">
            <dt className="lettering text-lime/75">Design change, least</dt>
            <dd className="figure text-22">{hoursWords(rule.minChangeHours)}</dd>
          </div>
        </dl>
        {rule.setAt && (
          <p className="text-13 text-lime/75">
            {by ?? "Set"} · {formatStampShort(rule.setAt)}
          </p>
        )}
      </section>

      <Panel title="Change" strong>
        <form
          noValidate
          className="grid gap-4 px-1"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rate an hour, ₹" htmlFor={`${id}-rate`}>
              <input
                id={`${id}-rate`}
                inputMode="numeric"
                type="number"
                min={1}
                step={1}
                value={rate}
                onChange={(e) => {
                  setRate(e.target.value);
                  setError("");
                }}
                className={`${field} figure`}
              />
            </Field>
            <Field label="Design change, least hours" htmlFor={`${id}-least`}>
              <input
                id={`${id}-least`}
                inputMode="decimal"
                type="number"
                min={0}
                max={40}
                step={0.5}
                value={least}
                onChange={(e) => {
                  setLeast(e.target.value);
                  setError("");
                }}
                className={`${field} figure`}
              />
            </Field>
          </div>
          <Field label="Reason" htmlFor={`${id}-reason`}>
            <input
              id={`${id}-reason`}
              value={reason}
              maxLength={120}
              placeholder="Optional"
              onChange={(e) => setReason(e.target.value)}
              className={field}
            />
          </Field>

          <ul className="grid gap-2 sm:grid-cols-2" aria-label="At these figures">
            <li className="glass-inner grid gap-0.5 px-3 py-2.5">
              <span className="lettering text-ink-soft">{hoursWords(SAMPLE_HOURS)} more</span>
              <span className="figure text-22">{inr(hoursFee.total)}</span>
              <span className="text-13 text-ink-soft">GST {inr(hoursFee.gst)}</span>
            </li>
            <li className="glass-inner grid gap-0.5 px-3 py-2.5">
              <span className="lettering text-ink-soft">Small design change</span>
              <span className="figure text-22">{inr(changeFee.total)}</span>
              <span className="text-13 text-ink-soft">{hoursWords(changeFee.hours)} charged</span>
            </li>
          </ul>

          {error && (
            <p role="alert" className="late-text text-15">
              {error}
            </p>
          )}
          <div>
            <button ref={saveRef} type="submit" className="btn btn-primary" aria-disabled={!changed || saving || undefined}>
              Save fee
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
