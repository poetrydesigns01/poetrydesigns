/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useState } from "react";
import { field } from "@/components/register/chips";
import { PaperSheet } from "@/components/register/paper-sheet";
import { SampleTag } from "@/components/register/sample-tag";
import { useFirm } from "@/lib/demo-store";
import { estimate, estimateInputFor, type EstimateInput } from "@/lib/estimate";
import { templateOf, type ProjectId } from "@/lib/firm-data";
import { formatDate, inr } from "@/lib/format";

// An estimate as Poetry issues it, on an A4 sheet. Part A is the house: built-up area at
// the category's rate, plus add-ons, with GST. Part B is the work around it, each item
// with its formula written out. Then the grand total, how long the estimate holds, and
// the schedule of eleven payments. It prints alone. On screen it is strong glass with faint
// hairlines; the dark rules under the titles come back only on paper. A quiet sheet, for the
// client, parts its rows by space alone.

// The arithmetic lives in src/lib/estimate.ts (also re-exported from firm.ts), so a server
// page can call it; it is re-exported here for the screens that already import it from here.
export { estimate, estimateInputFor } from "@/lib/estimate";
export type { EstimateInput, EstimateResult, EstimateRow } from "@/lib/estimate";

function Money({ value, strong = false }: { value: number; strong?: boolean }) {
  return <span className={`figure whitespace-nowrap text-17 ${strong ? "font-semibold" : ""}`}>{inr(value)}</span>;
}

/** One line of a figure table: words at the left, the figure at the right. */
function Line({
  words,
  detail,
  value,
  strong,
  quiet,
}: {
  words: string;
  detail?: string;
  value: number;
  strong?: boolean;
  /** On a client page the words are body size, so the sheet keeps to fewer sizes. */
  quiet?: boolean;
}) {
  return (
    <li className="flex items-baseline justify-between gap-4 py-2.5">
      <span className={`min-w-0 ${quiet ? "text-17" : "text-15"} ${strong ? "font-semibold" : ""}`}>
        {words}
        {detail && <span className="block text-ink-soft">{detail}</span>}
      </span>
      <Money value={value} strong={strong} />
    </li>
  );
}

type FigureKey = "area" | "rate" | "plotPerimeter";

const FIGURES: { key: FigureKey; label: string; unit: string }[] = [
  { key: "area", label: "Built-up area", unit: "sq ft" },
  { key: "rate", label: "Rate before GST", unit: "₹/sq ft" },
  { key: "plotPerimeter", label: "Plot perimeter", unit: "ft" },
];

/** The three figures a draft estimate can be tried with. Sits on a glass panel. */
export function EstimateFigures({
  input,
  onChange,
  className = "",
}: {
  input: EstimateInput;
  onChange: (next: EstimateInput) => void;
  className?: string;
}) {
  const ids = useId();
  return (
    <div className={`grid gap-3 ${className}`}>
      {FIGURES.map(({ key, label, unit }) => (
        <div key={key} className="grid gap-1.5">
          <label htmlFor={`${ids}-${key}`} className="text-15 font-semibold text-ink">
            {label}
          </label>
          <span className="flex items-center gap-2">
            <input
              id={`${ids}-${key}`}
              type="number"
              inputMode="numeric"
              min={0}
              className={`${field} min-w-0 flex-1`}
              value={input[key]}
              onChange={(event) => onChange({ ...input, [key]: Math.max(0, Number(event.target.value) || 0) })}
            />
            <span className="w-14 shrink-0 text-15 text-ink-soft">{unit}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function EstimateSheet({
  projectId,
  editable = false,
  quiet = false,
  onChange,
  input: shown,
  printButton = true,
}: {
  projectId: ProjectId | "kulkarni";
  /** Show the figures above the sheet. A page that keeps them in its own panel passes `input` instead. */
  editable?: boolean;
  /** For a client page: no frame and no rules between rows. */
  quiet?: boolean;
  onChange?: (data: EstimateInput) => void;
  /** Figures tried elsewhere on the page. When given, the sheet shows them and keeps no edits of its own. */
  input?: EstimateInput;
  /** The print button under the sheet. Off where the page already has a Download button. */
  printButton?: boolean;
}) {
  const firm = useFirm();
  const given = estimateInputFor(projectId, firm);
  const [edits, setEdits] = useState<EstimateInput | null>(null);
  if (!given) return <p className="text-17 text-ink">There is no estimate for this project yet.</p>;

  const input: EstimateInput = shown ?? edits ?? given;
  // Rows parted by faint hairlines on staff sheets, by space alone on a quiet one.
  const rows = quiet ? "mt-1" : "mt-1 divide-y divide-ink/10";
  // The dark rules under the titles are for paper only.
  const rule = quiet ? "" : "border-ink/10 print:border-ink";
  const result = estimate(input);
  const template = templateOf(input.category);

  return (
    <div className="grid justify-items-start gap-6">
      {editable && !shown && (
        <fieldset className="glass no-print w-full max-w-[210mm] p-4 sm:p-5">
          <legend className="sr-only">Figures</legend>
          <EstimateFigures
            input={input}
            className="sm:grid-cols-3"
            onChange={(next) => {
              setEdits(next);
              onChange?.(next);
            }}
          />
        </fieldset>
      )}
      <PaperSheet title={`Estimate for ${input.name}`} quiet={quiet}>
        <header className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-3 ${quiet ? "" : `border-b ${rule}`}`}>
          <p className="display text-22">
            Poetry Designs <SampleTag>Sample letterhead</SampleTag>
          </p>
          <p className="lettering text-ink-soft">Issued {formatDate(input.issuedOn)}</p>
        </header>

        <h2 className="mt-6 text-22 font-semibold">Estimate for {input.name}</h2>
        {input.clients.length > 0 && (
          <p className={`mt-1 text-ink-soft ${quiet ? "text-17" : "text-15"}`}>For {input.clients.join(" and ")}.</p>
        )}

        <section className="mt-8" aria-label="Part A, the house">
          <h3 className={`pb-1 text-17 font-semibold ${quiet ? "" : `border-b ${rule}`}`}>Part A, the house</h3>
          <ul className={rows}>
            <Line
              quiet={quiet}
              words={`${template.name}, built-up area`}
              detail={`${input.area.toLocaleString("en-IN")} sq ft × ${inr(input.rate)} per sq ft`}
              value={result.partA.base}
            />
            {input.addOns.map((addOn) => (
              <Line quiet={quiet} key={addOn.name} words={addOn.name} detail="Add-on" value={addOn.amount} />
            ))}
            <Line quiet={quiet} words="Part A before GST" value={result.partA.amount} />
            <Line quiet={quiet} words="GST at 18%" value={result.partA.gst} />
            <Line quiet={quiet} words="Part A with GST" value={result.partA.total} strong />
          </ul>
        </section>

        {result.partB.items.length > 0 && (
          <section className="mt-10" aria-label="Part B, the work around the house">
            <h3 className={`pb-1 text-17 font-semibold ${quiet ? "" : `border-b ${rule}`}`}>Part B, the work around the house</h3>
            <p className="mt-2 text-15 text-ink-soft">Billed as that work happens. <SampleTag>To be confirmed by Poetry</SampleTag></p>
            <ul className={rows}>
              {result.partB.items.map((item) => (
                <Line quiet={quiet} key={item.name} words={item.name} detail={item.formula} value={item.amount} />
              ))}
              <Line quiet={quiet} words="Part B before GST" value={result.partB.amount} />
              <Line quiet={quiet} words="GST at 18%" value={result.partB.gst} />
              <Line quiet={quiet} words="Part B with GST" value={result.partB.total} strong />
            </ul>
          </section>
        )}

        <div className={`mt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 ${quiet ? "" : `border-y ${rule}`}`}>
          <p className="text-17 font-semibold">Grand total, with GST</p>
          <p className="figure text-22">{inr(result.grandTotal)}</p>
        </div>
        <p className="mt-2 text-15 text-ink-soft">Valid until {formatDate(result.validUntil)}, 15 days from the day it was issued.</p>

        <section className="mt-10" aria-label="Payment schedule">
          <h3 className={`pb-1 text-17 font-semibold ${quiet ? "" : `border-b ${rule}`}`}>
            Payment schedule <SampleTag>Sample milestones</SampleTag>
          </h3>
          {/* On a phone each payment is a stacked row; from 640 px it is a table. */}
          <ul className={`${rows} sm:hidden`}>
            {result.schedule.map((row) => (
              <li key={row.n} className="grid gap-0.5 py-2.5 text-15">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{row.n === 0 ? "Sign-up" : `${row.n}. ${row.name}`}</span>
                  <span className="figure whitespace-nowrap text-17">{inr(row.total)}</span>
                </span>
                <span className="text-ink-soft">
                  {row.percent}%, {inr(row.amount)} before GST and {inr(row.gst)} GST.
                </span>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block print:block">
            <table className="mt-3 w-full border-collapse text-15">
              <caption className="sr-only">Sign-up and ten milestones on Part A</caption>
              <thead>
                <tr className="text-left">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Payment
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">
                    Share
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">
                    Before GST
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">
                    GST
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    With GST
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((row) => (
                  <tr key={row.n} className={`align-top ${quiet ? "" : "border-t border-ink/10"}`}>
                    <th scope="row" className="py-2 pr-3 text-left font-normal">
                      {row.n === 0 ? "Sign-up" : `${row.n}. ${row.name}`}
                    </th>
                    <td className="py-2 pr-3 text-right">{row.percent}%</td>
                    <td className="figure py-2 pr-3 text-right">{inr(row.amount)}</td>
                    <td className="figure py-2 pr-3 text-right">{inr(row.gst)}</td>
                    <td className="figure py-2 text-right">{inr(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {input.scheduleNote && <p className="mt-3 max-w-[56ch] text-15">{input.scheduleNote}</p>}
        </section>
      </PaperSheet>
      {printButton && (
        <button type="button" className="btn btn-glass no-print" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      )}
    </div>
  );
}
