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
// the schedule of eleven payments. It prints alone. A quiet sheet, for the client, keeps
// only the ink rules under the three titles and parts its rows by space alone.

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

export function EstimateSheet({
  projectId,
  editable = false,
  quiet = false,
  onChange,
}: {
  projectId: ProjectId | "kulkarni";
  editable?: boolean;
  /** For a client page: no frame and no sand rules, only the ink rules under the titles. */
  quiet?: boolean;
  onChange?: (data: EstimateInput) => void;
}) {
  const firm = useFirm();
  const ids = useId();
  const given = estimateInputFor(projectId, firm);
  const [edits, setEdits] = useState<Partial<Pick<EstimateInput, "area" | "rate" | "plotPerimeter" | "addOns">>>({});
  if (!given) return <p className="text-17 text-ink-soft">There is no estimate for this project yet.</p>;

  const input: EstimateInput = { ...given, ...edits };
  // Rows parted by sand rules on staff sheets, by space alone on a quiet one.
  const rows = quiet ? "mt-1" : "mt-1 divide-y divide-sand";
  const result = estimate(input);
  const template = templateOf(input.category);

  const change = (patch: typeof edits) => {
    const next = { ...edits, ...patch };
    setEdits(next);
    onChange?.({ ...given, ...next });
  };

  const number = (key: "area" | "rate" | "plotPerimeter", label: string, unit: string) => (
    <div>
      <label htmlFor={`${ids}-${key}`} className="block text-15 font-semibold">
        {label}
      </label>
      <span className="mt-1.5 flex items-center gap-2">
        <input
          id={`${ids}-${key}`}
          type="number"
          inputMode="numeric"
          min={0}
          className={`${field} max-w-40`}
          value={input[key]}
          onChange={(event) => change({ [key]: Math.max(0, Number(event.target.value) || 0) })}
        />
        <span className="text-15 text-ink-soft">{unit}</span>
      </span>
    </div>
  );

  return (
    <div className="grid justify-items-start gap-6">
      {editable && (
        <fieldset className="no-print grid w-full max-w-[210mm] gap-4 sm:grid-cols-3">
          <legend className="mb-2 text-17 font-semibold">Change the figures</legend>
          {number("area", "Built-up area", "sq ft")}
          {number("rate", "Rate before GST", "₹ per sq ft")}
          {number("plotPerimeter", "Plot perimeter", "ft")}
        </fieldset>
      )}
      <PaperSheet title={`Estimate for ${input.name}`} quiet={quiet}>
        <header className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-3 ${quiet ? "" : "border-b border-ink"}`}>
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
          <h3 className="border-b border-ink pb-1 text-17 font-semibold">Part A, the house</h3>
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
            <h3 className="border-b border-ink pb-1 text-17 font-semibold">Part B, the work around the house</h3>
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

        <div className={`mt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 ${quiet ? "" : "border-y border-ink"}`}>
          <p className="text-17 font-semibold">Grand total, with GST</p>
          <p className="figure text-22">{inr(result.grandTotal)}</p>
        </div>
        <p className="mt-2 text-15 text-ink-soft">Valid until {formatDate(result.validUntil)}, 15 days from the day it was issued.</p>

        <section className="mt-10" aria-label="Payment schedule">
          <h3 className="border-b border-ink pb-1 text-17 font-semibold">
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
                  <tr key={row.n} className={`align-top ${quiet ? "" : "border-t border-sand"}`}>
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
      <button type="button" className="btn btn-quiet no-print" onClick={() => window.print()}>
        Print or save as PDF
      </button>
    </div>
  );
}
