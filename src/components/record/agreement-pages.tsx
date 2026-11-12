"use client";

import { useState } from "react";
import { SampleTag } from "@/components/register/sample-tag";
import { client, TODAY } from "@/lib/demo-data";
import { formatDate } from "@/lib/format";
import { Watermark } from "./watermark";

// The signed agreement, view only: three pages in a pager, with her name and today's date
// written across each. The wording is sample text until Poetry gives its own.

export type House = "iyer" | "iyer-cottage";

type Page = { title: string; clauses: string[] };

const CHANGES_PAGE: Page = {
  title: "Changes and approvals",
  clauses: [
    "Any work outside this agreement is priced by the Project Head, with its effect on the handover date, before it is done.",
    "A change the owners approve becomes a dated addendum to this agreement and changes the price by the amount approved.",
    "Drawings, specifications, finished stages, payments and changes to the payment schedule are approved in the Poetry Designs portal.",
    "Each approval is recorded with the name, the date and the time. No record can be edited or deleted, by the owners or by Poetry Designs.",
    "The owners have 12 hours of advisory time with the architects and engineers before construction and 8 hours during it. More hours can be bought.",
  ],
};

const PAGES: Record<House, Page[]> = {
  iyer: [
    {
      title: "Parties and property",
      clauses: [
        "This agreement is made on 12 January 2026 between Poetry Designs, Bengaluru, the builder, and Meera Iyer and Arjun Iyer, the owners.",
        "The property is Plot 47, Lakeside Layout, Kanakapura Road, Bengaluru 560062.",
        "Poetry Designs will design and build a city villa of 3,200 sq ft built-up area on it, as shown in the drawings the owners approve.",
        "Kavya Reddy, client relations, is the owners' point of contact. A Project Head is named for the building work.",
      ],
    },
    {
      title: "Price and payments",
      clauses: [
        "The price is ₹83,20,000 before GST: 3,200 sq ft at ₹2,600 per sq ft. GST is charged at 18% on each payment.",
        "A sign-up advance of 5% is paid on signing. The rest is paid in ten milestones, as in the payment schedule the owners approve.",
        "A milestone falls due once its work is finished and the owners have accepted it as finished.",
        "For each milestone Poetry Designs writes a demand letter the owners' bank can pay against.",
      ],
    },
    CHANGES_PAGE,
  ],
  "iyer-cottage": [
    {
      title: "Parties and property",
      clauses: [
        "This agreement is made on 2 October 2026 between Poetry Designs, Bengaluru, the builder, and Meera Iyer and Arjun Iyer, the owners.",
        "The property is Survey 112, Nandi Hills Road, Chikkaballapur 562101.",
        "Poetry Designs will design and build a farmhouse of 1,800 sq ft built-up area on it, as shown in the drawings the owners approve.",
        "Kavya Reddy, client relations, is the owners' point of contact. Lakshmi Narayan is the Project Head.",
      ],
    },
    {
      title: "Price and payments",
      clauses: [
        "The price is ₹43,20,000 before GST: 1,800 sq ft at ₹2,400 per sq ft. GST is charged at 18% on each payment.",
        "A sign-up advance of 5% is paid on signing, so design work can begin.",
        "Once the design is settled, Poetry Designs issues a final estimate. When the owners approve it, it becomes an addendum and replaces this price.",
        "The rest is paid in ten milestones, each due once its work is finished and accepted, against a demand letter for the owners' bank.",
      ],
    },
    CHANGES_PAGE,
  ],
};

export function AgreementPages({ house }: { house: House }) {
  const pages = PAGES[house];
  const [index, setIndex] = useState(0);
  const page = pages[Math.min(index, pages.length - 1)];
  const watermark = `${client.name}, ${formatDate(TODAY)}, view only`;

  return (
    <div>
      <p className="text-15">
        <SampleTag>Sample agreement text</SampleTag>
      </p>
      <section
        aria-label={`Page ${index + 1} of ${pages.length}, ${page.title}`}
        className="relative mt-3 overflow-hidden bg-paper px-5 py-6 sm:px-8 sm:py-8"
        onCopy={(event) => event.preventDefault()}
      >
        <Watermark text={watermark} />
        <h3 className="relative text-17 font-semibold">{page.title}</h3>
        <ol className="relative mt-3 grid max-w-[58ch] list-decimal gap-3 pl-5 text-17 marker:text-ink-soft">
          {page.clauses.map((clause) => (
            <li key={clause} className="pl-1">
              {clause}
            </li>
          ))}
        </ol>
      </section>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="lettering text-ink-soft" aria-live="polite">
          Page {index + 1} of {pages.length}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-quiet min-h-11 px-4"
            aria-disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            Previous page
          </button>
          <button
            type="button"
            className="btn btn-quiet min-h-11 px-4"
            aria-disabled={index === pages.length - 1}
            onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
          >
            Next page
          </button>
        </div>
      </div>
      <p className="mt-3 max-w-[56ch] text-15 text-ink-soft">
        This opens here only and cannot be downloaded. Your name and today&apos;s date are marked across it.
      </p>
    </div>
  );
}
