/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { Watermark } from "@/components/changes/watermark";
import { FloorPlan } from "@/components/floor-plan";
import { House } from "@/components/house/house";
import { TODAY } from "@/lib/demo-data";
import { formatDate, inr } from "@/lib/format";
import { VIEWER_NAME, type ItemView } from "./items";

// The sheet itself, shown and never handed over: no download, no right-click, no drag, no
// print, and her name and today's date across it.

/** The kitchen specification package: what is specified for each item. */
const SPEC: SpecPart[] = [
  {
    title: "Kitchen",
    rows: [
      ["Counter", "20 mm black galaxy granite, 600 mm deep"],
      ["Cabinets", "Marine plywood, matt laminate, soft-close"],
      ["Wall tiles", "300 × 600 mm glazed ceramic"],
    ],
  },
  {
    title: "Sink and hob",
    rows: [
      ["Sink", "Steel double bowl, 1,150 × 500 mm"],
      ["Hob", "Four-burner glass, auto ignition"],
    ],
  },
  {
    title: "Chimney",
    rows: [
      ["Chimney", "900 mm filterless, 1,200 m³/h"],
      ["Duct", "150 mm to the outside wall"],
    ],
  },
];

type SpecPart = { title: string; rows: [string, string][] };

/** The selections made during construction, by workflow task, milestone by milestone. */
const SELECTIONS: Record<string, SpecPart[]> = {
  "m2-grill": [
    {
      title: "Window grill",
      rows: [
        ["Bars", "MS flat, 25 × 6 mm, vertical"],
        ["Spacing", "100 mm centres"],
      ],
    },
    {
      title: "Skylight grill",
      rows: [
        ["Bars", "MS square, 12 mm, plain grid"],
        ["Finish", "Primer and matt black enamel"],
      ],
    },
  ],
  "m4-door-frames": [
    {
      title: "Door frames",
      rows: [
        ["Main door", "Teak, 150 × 75 mm"],
        ["Rooms", "Sal wood, 125 × 65 mm"],
        ["Bathrooms", "WPC, waterproof"],
        ["Finish", "Melamine, natural"],
      ],
    },
  ],
  "m6-handrails": [
    {
      title: "Handrails",
      rows: [
        ["Staircase", "SS 304, 50 mm round, toughened glass"],
        ["Balconies", "MS square bars, 1,000 mm high"],
      ],
    },
  ],
  "m7-tiles-shutters": [
    {
      title: "Tiles",
      rows: [
        ["Living and dining", "Vitrified, 800 × 1,600 mm, matt"],
        ["Bathrooms", "Anti-skid ceramic, 300 × 300 mm"],
      ],
    },
    {
      title: "Door shutters",
      rows: [
        ["Main door", "Teak, panelled, 40 mm"],
        ["Rooms", "Flush, teak veneer, 35 mm"],
      ],
    },
  ],
  "m8-tile-schedule": [
    {
      title: "Tile schedule",
      rows: [
        ["Floors", "Vitrified throughout, skirting 100 mm"],
        ["Bathroom walls", "Glazed ceramic to 2,100 mm"],
        ["Kitchen dado", "600 mm above the counter"],
      ],
    },
  ],
  "m9-switches": [
    {
      title: "Switches",
      rows: [
        ["Range", "Modular, white, matt"],
        ["Plates", "Glass, 8 and 12 module"],
      ],
    },
  ],
  "m9-gates": [
    {
      title: "Main gate",
      rows: [
        ["Type", "Sliding, MS box section"],
        ["Size", "4,200 × 1,800 mm"],
      ],
    },
    {
      title: "Wicket gate",
      rows: [
        ["Type", "Hinged, matches the main gate"],
        ["Size", "1,000 × 1,800 mm"],
      ],
    },
  ],
};

/** The final cost estimate, head by head. */
const BOQ: [string, number][] = [
  ["Civil and structure", 4860000],
  ["Masonry and plaster", 1420000],
  ["Flooring and tiling", 1180000],
  ["Electrical", 640000],
  ["Plumbing and sanitary", 560000],
  ["Doors, windows and joinery", 980000],
  ["Painting and finishes", 520000],
];

function Table({ rows, money = false }: { rows: [string, string][]; money?: boolean }) {
  return (
    <dl className="mt-2">
      {rows.map(([what, value], index) => (
        <div
          key={what}
          className={`grid gap-x-4 py-2 text-15 ${
            money ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          } ${index > 0 ? "border-t border-ink/10" : ""}`}
        >
          <dt className="min-w-0">{what}</dt>
          <dd className={money ? "figure text-right" : "min-w-0 text-right break-words"}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DesignSheet({ item, version }: { item: ItemView; version: number }) {
  const mark = `${VIEWER_NAME} · ${formatDate(TODAY)} · View only`;
  const total = BOQ.reduce((sum, [, amount]) => sum + amount, 0);

  return (
    <div
      className="relative select-none overflow-hidden rounded-[var(--radius-inner)] border border-ink/10 bg-paper print:hidden"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      {item.kind === "plan" && (
        <FloorPlan designId={item.id} title={item.title} sheet={item.sheet} version={version} />
      )}

      {item.kind === "elevation" && (
        <div role="img" aria-label={`${item.title}, version ${version}`} className="px-4 py-6 sm:px-10 sm:py-8">
          <div className={item.mirrored ? "-scale-x-100" : undefined}>
            <House tone="light" flat scene={{ stop: 10, markers: "none", money: false }} />
          </div>
        </div>
      )}

      {item.kind === "boq" && (
        <div className="px-4 py-5 sm:px-8 sm:py-7">
          <p className="lettering text-ink-soft">{item.sheet}</p>
          <Table money rows={BOQ.map(([what, amount]) => [what, inr(amount)])} />
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-t-2 border-ink/25 pt-2 text-17 font-semibold">
            <span>Total</span>
            <span className="figure">{inr(total)}</span>
          </div>
        </div>
      )}

      {item.kind === "spec" && (
        <div className="grid gap-5 px-4 py-5 sm:px-8 sm:py-7">
          {(SELECTIONS[item.id] ?? SPEC).map((part) => (
            <section key={part.title}>
              <h3 className="lettering text-ink-soft">{part.title}</h3>
              <Table rows={part.rows} />
            </section>
          ))}
        </div>
      )}

      <Watermark text={mark} />
    </div>
  );
}
