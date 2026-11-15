/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { Tone } from "@/lib/portal";
import { ageWords } from "@/lib/firm";
import { inr } from "@/lib/format";

// The small glass parts the procurement, finance, admin and project record screens share:
// stat cards, a titled panel, a segmented switch, a table that turns into cards on a phone,
// a thin meter, a step track and a few line icons. Words stay short; numbers lead.

// ---- Money ----

const MINUS = String.fromCharCode(0x2212);

/** Rupees in a stat card's room: "₹4.12 Cr", "₹38.5 L", "₹92,000", "−₹6.6 L". */
export function inrShort(amount: number): string {
  const sign = amount < 0 ? MINUS : "";
  const a = Math.abs(Math.round(amount));
  if (a >= 1e7) return `${sign}₹${trim((a / 1e7).toFixed(2))} Cr`;
  if (a >= 1e5) return `${sign}₹${trim((a / 1e5).toFixed(1))} L`;
  return `${sign}${inr(a)}`;
}

function trim(figure: string): string {
  return figure.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

// ---- Icons ----

export type IconName =
  | "box"
  | "truck"
  | "clock"
  | "alert"
  | "rupee"
  | "users"
  | "file"
  | "check"
  | "lock"
  | "plus"
  | "arrow"
  | "hammer"
  | "chart"
  | "pin"
  | "phone";

const PATHS: Record<IconName, string> = {
  box: "M3 7.5 10 4l7 3.5v7L10 18l-7-3.5zM3 7.5l7 3.5 7-3.5M10 11v7",
  truck: "M2 5h10v8H2zM12 8h3.5L18 10.5V13h-6M5 15.5a1.5 1.5 0 1 0 0-.01M14.5 15.5a1.5 1.5 0 1 0 0-.01",
  clock: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM10 6v4l2.5 2",
  alert: "M10 3 18 17H2zM10 8v4M10 14.5v.01",
  rupee: "M6 4h8M6 7.5h8M6 4h2.5a3.5 3.5 0 0 1 0 7H6l6 6",
  users: "M7.5 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5M13.5 3.5a3 3 0 0 1 0 5.5M15 12c2 .6 3 2.4 3 5",
  file: "M5 2.5h6.5L15 6v11.5H5zM11.5 2.5V6H15M7.5 10h5M7.5 13h5",
  check: "M4 10.5 8 14l8-8",
  lock: "M5 9h10v8H5zM7 9V6.5a3 3 0 0 1 6 0V9",
  plus: "M10 4v12M4 10h12",
  arrow: "M4 10h12M11 5l5 5-5 5",
  hammer: "M11 4.5 15.5 9M9 6.5l4.5 4.5M3 17l7.5-7.5M11 4.5l2-1.5 4 4-1.5 2",
  chart: "M3 17h14M5.5 14V9M10 14V5M14.5 14v-6",
  pin: "M10 18s-5.5-5-5.5-9a5.5 5.5 0 0 1 11 0c0 4-5.5 9-5.5 9zM10 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  phone: "M5 3h3l1.5 4-2 1.2a9 9 0 0 0 4.3 4.3L13 10.5l4 1.5v3a2 2 0 0 1-2 2A12 12 0 0 1 3 5a2 2 0 0 1 2-2z",
};

export function Icon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

// ---- Stat cards ----

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: IconName;
  /** "late" writes the figure in bold brick: a loss, a shortfall, something overdue. */
  tone?: "late";
  href?: string;
}) {
  const body = (
    <>
      <p className="lettering flex items-center gap-1.5 text-ink-soft">
        {icon && <Icon name={icon} className="size-3.5" />}
        {label}
      </p>
      <p className={`figure text-22 leading-tight lg:text-32 ${tone === "late" ? "font-semibold text-brick" : "text-ink"}`}>
        {value}
      </p>
      {sub && <p className="text-13 text-ink-soft">{sub}</p>}
    </>
  );
  const box = "glass grid min-w-0 content-start gap-1 p-4";
  return href ? (
    <Link href={href} className={`${box} transition-transform duration-150 hover:-translate-y-0.5`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

const STAT_COLS = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5",
} as const;

/** A row of stat cards. */
export function StatRow({ cols = 4, label, children }: { cols?: 2 | 3 | 4 | 5; label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className={`grid gap-3 ${STAT_COLS[cols]}`}>
      {children}
    </section>
  );
}

// ---- Panels ----

export function Panel({
  title,
  aside,
  strong = false,
  id,
  className = "",
  children,
}: {
  title: string;
  /** A count chip, a filter or one button at the right of the title. */
  aside?: ReactNode;
  strong?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-label={title} className={`${strong ? "glass-strong" : "glass"} min-w-0 p-3 sm:p-5 ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1 pb-3">
        <h2 className="text-17 font-semibold">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** A quiet line inside a panel when it has nothing to list. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-1 py-4 text-15 text-ink-soft">{children}</p>;
}

/** A small count pill beside a panel's title. */
export function Count({ n, tone }: { n: number; tone?: Tone }) {
  const fill =
    tone === "late"
      ? "bg-brick text-lime"
      : tone === "waiting"
        ? "bg-brass-light/60 text-brass-deep"
        : tone === "done"
          ? "bg-kota/15 text-kota"
          : "bg-ink/10 text-ink";
  return (
    <span className={`figure inline-grid h-6 min-w-6 place-items-center rounded-full px-2 text-13 font-semibold ${fill}`}>{n}</span>
  );
}

// ---- A segmented switch ----

export function Segments<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; count?: number }[];
  onChange: (id: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="glass flex max-w-full flex-wrap gap-1 rounded-3xl p-1">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-15 transition-colors duration-150 ${
              on ? "bg-rosewood font-semibold text-lime" : "text-ink hover:bg-white/60"
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={`figure text-13 ${on ? "text-lime/80" : "text-ink-soft"}`}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---- A table that is a list of cards on a phone ----

export type Column<T> = {
  label: string;
  cell: (row: T) => ReactNode;
  align?: "right";
  /** Left off the phone card: say it in the lead or the chip instead. */
  phone?: false;
  /** Width class for the column, such as "w-28". */
  width?: string;
  /** On a phone card, drawn across the card with no label: a row's one action. */
  bare?: true;
};

const WIDE = {
  md: { table: "hidden md:block", list: "md:hidden" },
  lg: { table: "hidden lg:block", list: "lg:hidden" },
  xl: { table: "hidden xl:block", list: "xl:hidden" },
} as const;

export function GlassTable<T>({
  caption,
  rows,
  columns,
  rowKey,
  lead,
  chip,
  empty,
  wide = "md",
  rowClass,
}: {
  caption: string;
  rows: T[];
  /** The first column is the lead: on a phone it heads each card. */
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** The phone card's head, when it should differ from the first column. */
  lead?: (row: T) => ReactNode;
  /** The phone card's status, at the top right. */
  chip?: (row: T) => ReactNode;
  empty?: string;
  /** From this width the rows stand in a table. */
  wide?: keyof typeof WIDE;
  /** Extra classes on a row, such as a struck-out look. */
  rowClass?: (row: T) => string;
}) {
  if (rows.length === 0) return empty ? <Empty>{empty}</Empty> : null;
  const [first, ...rest] = columns;
  const shown = rest.filter((c) => c.phone !== false);
  return (
    <>
      <div className={WIDE[wide].table}>
        <table className="w-full border-separate border-spacing-0 text-15">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.label}
                  scope="col"
                  className={`lettering px-3 pb-2 font-semibold text-ink-soft ${c.align === "right" ? "text-right" : "text-left"} ${c.width ?? ""}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={rowKey(row)}
                className={`group [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl ${rowClass?.(row) ?? ""}`}
              >
                {columns.map((c, j) => (
                  <td
                    key={c.label}
                    className={`px-3 py-3 align-middle transition-colors duration-150 group-hover:bg-white/50 group-focus-within:bg-white/50 ${
                      i > 0 ? "border-t border-ink/10" : ""
                    } ${c.align === "right" ? "text-right" : ""} ${j === 0 ? "font-semibold" : ""}`}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={`grid gap-1 ${WIDE[wide].list}`} aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className={`glass-row grid gap-2 px-3 py-3 ${rowClass?.(row) ?? ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-15 font-semibold">{lead ? lead(row) : first.cell(row)}</div>
              {chip && <div className="shrink-0">{chip(row)}</div>}
            </div>
            {shown.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {shown.map((c) => (
                  <Fragment key={c.label}>
                    {c.bare ? (
                      <div className="col-span-2 min-w-0 pt-1">
                        <dt className="sr-only">{c.label}</dt>
                        <dd className="min-w-0">{c.cell(row)}</dd>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <dt className="lettering text-ink-soft">{c.label}</dt>
                        <dd className="min-w-0 break-words text-15">{c.cell(row)}</dd>
                      </div>
                    )}
                  </Fragment>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

// ---- Small marks ----

/** A thin bar: how far along, how much ordered, how much received. */
export function Meter({ value, tone = "progress", label }: { value: number; tone?: Tone; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  const fill =
    tone === "done" ? "bg-kota" : tone === "late" ? "bg-brick" : tone === "waiting" ? "bg-brass" : tone === "locked" ? "bg-ink/25" : "bg-laterite";
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className="block h-1.5 w-full overflow-hidden rounded-full bg-ink/10"
    >
      <span className={`block h-full origin-left rounded-full ${fill}`} style={{ transform: `scaleX(${v})` }} />
    </span>
  );
}

/** Where a request has got to: four dots on a line, the reached ones filled. */
export function StepTrack({ steps, reached, late }: { steps: string[]; reached: number; late?: boolean }) {
  return (
    <ol className="flex items-start" aria-label="Progress">
      {steps.map((step, i) => {
        const done = i <= reached;
        return (
          <li key={step} className="relative grid min-w-0 flex-1 justify-items-center gap-1.5 text-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-[5px] right-1/2 h-0.5 w-full ${i <= reached ? "bg-laterite" : "bg-ink/15"}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative size-3 rounded-full border-2 ${
                done ? (late && i === reached ? "border-brick bg-brick" : "border-laterite bg-laterite") : "border-ink/25 bg-white/70"
              }`}
            />
            <span className={`lettering ${done ? "text-ink" : "text-ink-soft"}`}>
              {step}
              <span className="sr-only">{done ? ", done" : ", to come"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** How long something has waited, as a chip: brass from 2 days, brick from 4. */
export function WaitChip({ days, lateFrom = 4 }: { days: number; lateFrom?: number }) {
  const tone = days >= lateFrom ? "chip-late" : days >= 2 ? "chip-waiting" : "";
  return <span className={`glass-chip ${tone}`}>{ageWords(days)}</span>;
}

/** Initials in a small round badge. */
export function Initials({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="lettering inline-grid size-8 shrink-0 place-items-center rounded-full bg-rosewood text-lime"
    >
      {letters}
    </span>
  );
}
