/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { client, TODAY } from "@/lib/demo-data";
import { formatDate } from "@/lib/format";
import { Watermark } from "./watermark";

// The signed agreement, view only: a four-figure summary first, then the clauses behind
// tabs with her name and today's date written across them. Nothing can be copied out.

export type House = "iyer" | "iyer-cottage";

type Page = { title: string; tab: string; clauses: string[] };
type Fact = { label: string; value: string };

const CHANGES_PAGE: Page = {
  title: "Changes and approvals",
  tab: "Changes",
  clauses: [
    "Any work outside this agreement is recommended and priced by the architect, with its effect on the handover date, before it is done.",
    "A change the owners approve becomes a dated addendum to this agreement and changes the price by the amount approved.",
    "Drawings, specifications, finished stages, payments and changes to the payment schedule are approved in the Poetry Designs portal.",
    "Each approval is recorded with the name, the date and the time. No record can be edited or deleted, by the owners or by Poetry Designs.",
    "The owners have 12 hours of advisory time with the architects and engineers before construction and 8 hours during it. More hours can be bought.",
  ],
};

const SUMMARY: Record<House, Fact[]> = {
  iyer: [
    { label: "Parties", value: "Meera & Arjun Iyer" },
    { label: "Plot", value: "Plot 47, Lakeside Layout" },
    { label: "Area", value: "3,200 sq ft" },
    { label: "Signed", value: "25 May 2026" },
  ],
  "iyer-cottage": [
    { label: "Parties", value: "Meera & Arjun Iyer" },
    { label: "Plot", value: "Survey 112, Nandi Hills" },
    { label: "Area", value: "1,800 sq ft" },
    { label: "Signed", value: "2 Oct 2026" },
  ],
};

const PAGES: Record<House, Page[]> = {
  iyer: [
    {
      title: "Parties and property",
      tab: "Parties",
      clauses: [
        "This agreement is made on 25 May 2026 between Poetry Designs, Bengaluru, the builder, and Meera Iyer and Arjun Iyer, the owners.",
        "The property is Plot 47, Lakeside Layout, Kanakapura Road, Bengaluru 560062.",
        "Poetry Designs will design and build a city villa of 3,200 sq ft built-up area on it, as shown in the drawings the owners approve.",
        "Kavya Reddy, client relations, is the owners' point of contact. A Project Head is named for the building work.",
      ],
    },
    {
      title: "Price and payments",
      tab: "Price",
      clauses: [
        "The price is ₹83,20,000 before GST: 3,200 sq ft at ₹2,600 per sq ft. GST is charged at 18% on each payment.",
        "A sign-up advance of 5% is paid on signing. The rest is paid in ten instalments of 15, 15, 10, 10, 10, 8, 8, 8, 8 and 3%, as in the payment schedule the owners approve.",
        "Each instalment falls due in its week of the project schedule. A construction milestone starts only once its instalment is received.",
        "For each instalment Poetry Designs writes a demand letter the owners' bank can pay against.",
      ],
    },
    CHANGES_PAGE,
  ],
  "iyer-cottage": [
    {
      title: "Parties and property",
      tab: "Parties",
      clauses: [
        "This agreement is made on 2 October 2026 between Poetry Designs, Bengaluru, the builder, and Meera Iyer and Arjun Iyer, the owners.",
        "The property is Survey 112, Nandi Hills Road, Chikkaballapur 562101.",
        "Poetry Designs will design and build a farmhouse of 1,800 sq ft built-up area on it, as shown in the drawings the owners approve.",
        "Kavya Reddy, client relations, is the owners' point of contact. Lakshmi Narayan is the Project Head.",
      ],
    },
    {
      title: "Price and payments",
      tab: "Price",
      clauses: [
        "The price is ₹43,20,000 before GST: 1,800 sq ft at ₹2,400 per sq ft. GST is charged at 18% on each payment.",
        "A sign-up advance of 5% is paid on signing, so design work can begin.",
        "Once the design is settled, Poetry Designs issues a final estimate. When the owners approve it, it becomes an addendum and replaces this price.",
        "The rest is paid in ten stages, each due once its work is finished and accepted, against a demand letter for the owners' bank.",
      ],
    },
    CHANGES_PAGE,
  ],
};

export function AgreementPages({ house }: { house: House }) {
  const pages = PAGES[house];
  const facts = SUMMARY[house];
  // Tab 0 is the summary; tabs 1 to n are the clause pages.
  const tabCount = pages.length + 1;
  const id = useId();
  const [index, setIndex] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const at = Math.min(index, tabCount - 1);
  const page = at > 0 ? pages[at - 1] : null;
  const watermark = `${client.name}, ${formatDate(TODAY)}, view only`;
  const labels = ["Summary", ...pages.map((p) => p.tab)];
  const names = ["Summary", ...pages.map((p) => p.title)];

  const go = (next: number) => {
    const wrapped = (next + tabCount) % tabCount;
    setIndex(wrapped);
    tabs.current[wrapped]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") go(at + 1);
    else if (event.key === "ArrowLeft") go(at - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(tabCount - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div className="grid gap-3">
      <div role="tablist" aria-label="Agreement" className="grid grid-cols-2 gap-1.5 min-[360px]:grid-cols-4 sm:flex sm:flex-wrap" onKeyDown={onKeyDown}>
        {labels.map((label, i) => (
          <button
            key={label}
            ref={(node) => {
              tabs.current[i] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={i === at}
            aria-label={names[i]}
            aria-controls={`${id}-panel`}
            tabIndex={i === at ? 0 : -1}
            className={`btn btn-glass min-h-11 px-1! text-15! min-[360px]:text-13! sm:px-4! sm:text-15! ${i === at ? "bg-rosewood text-lime hover:bg-rosewood" : ""}`}
            onClick={() => setIndex(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {page ? (
        <section
          id={`${id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${at}`}
          className="glass-inner relative select-none overflow-hidden bg-paper/70 px-5 py-5 sm:px-7 sm:py-6"
          onCopy={(event) => event.preventDefault()}
        >
          <Watermark text={watermark} />
          <ol className="relative grid max-w-[62ch] list-decimal gap-2.5 pl-5 text-15 marker:text-ink-soft">
            {page.clauses.map((clause) => (
              <li key={clause} className="pl-1">
                {clause}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <dl id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-0`} className="grid grid-cols-2 gap-2">
          {facts.map((fact) => (
            <div key={fact.label} className="glass-inner min-w-0 px-3 py-2.5">
              <dt className="lettering text-ink-soft">{fact.label}</dt>
              <dd className="text-15 font-semibold leading-snug">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
