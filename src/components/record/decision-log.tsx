/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useState, type ComponentType } from "react";
import { ClockIcon, PenIcon, RupeeIcon, SheetIcon, SwapIcon, WallIcon } from "@/components/craft/glass-icons";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import type { LogEntry } from "@/lib/firm-data";
import { datePart, formatDate, formatTime } from "@/lib/format";
import type { Tone } from "@/lib/portal";

// Every decision on her house, newest first, as short rows: what it was about, the verb as a
// chip, any amount, and the date and time. The full sentence stays for screen readers. It can
// be read and filtered and nothing else: no control edits or removes a line.

type Filter = "all" | "designs" | "payments" | "changes";
type Kind = "design" | "payment" | "stage" | "change" | "agreement" | "hours" | "other";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "designs", label: "Designs" },
  { id: "payments", label: "Payments" },
  { id: "changes", label: "Changes" },
];

const FILTER_OF: Record<Kind, Filter | null> = {
  design: "designs",
  payment: "payments",
  stage: "payments",
  agreement: "payments",
  change: "changes",
  hours: null,
  other: null,
};

const ICON: Record<Kind, ComponentType<{ size?: number; className?: string }>> = {
  design: SheetIcon,
  payment: RupeeIcon,
  stage: WallIcon,
  change: SwapIcon,
  agreement: PenIcon,
  hours: ClockIcon,
  other: SheetIcon,
};

type Row = {
  kind: Kind;
  item: string;
  verb?: string;
  tone: Tone;
  amount?: string;
  days?: number;
};

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const named = (text: string) => cap(text.replace(/^the /i, ""));

/**
 * Payment lines say "Stage N" (the oldest "milestone N"); on Poetry's workflow the money is
 * paid in instalments, so they read "Instalment N", as on the Payments page.
 */
const stageWords = (text: string) =>
  /^Confirmed /.test(text)
    ? text.replace(/\b(?:Stage|milestone) (\d+)/, "milestone $1").trim()
    : text.replace(/\b(?:Stage|milestone) (\d+)/g, "Instalment $1").trim();

/** Reads a log sentence into a short row. */
function rowOf(entry: LogEntry): Row {
  const action = stageWords(entry.action);
  let m: RegExpMatchArray | null;

  if ((m = action.match(/^Signed agreement uploaded.*?(₹[\d,]+)/)))
    return { kind: "agreement", item: "Agreement", verb: "Signed", tone: "done", amount: m[1] };
  if (/^Approved the payment schedule/i.test(action))
    return { kind: "payment", item: "Payment schedule", verb: "Approved", tone: "done" };
  if ((m = action.match(/^(Approved|Asked for changes to) the (.+), version (\d+)\.?$/)))
    return {
      kind: "design",
      item: `${named(m[2])} v${m[3]}`,
      verb: m[1] === "Approved" ? "Approved" : "Modify",
      tone: m[1] === "Approved" ? "done" : "waiting",
    };
  if ((m = action.match(/^(?:Approved payment for|Marked) Instalment (\d+)(?: paid)?, (₹[\d,]+)/)))
    return { kind: "payment", item: `Instalment ${m[1]} payment`, verb: "Paid", tone: "done", amount: m[2] };
  if ((m = action.match(/^Asked for the demand letter for Instalment (\d+)/)))
    return { kind: "payment", item: `Instalment ${m[1]} letter`, verb: "Requested", tone: "progress" };
  if ((m = action.match(/^Confirmed milestone (\d+), the (.+), as finished/)))
    return { kind: "stage", item: named(m[2]), verb: "Accepted", tone: "done" };
  if ((m = action.match(/^Accepted the (.+) as finished/)))
    return { kind: "stage", item: named(m[1]), verb: "Accepted", tone: "done" };
  if ((m = action.match(/^(Approved paying|Asked for changes to the split of) Instalment (\d+)/)))
    return {
      kind: "payment",
      item: `Instalment ${m[2]} split`,
      verb: m[1] === "Approved paying" ? "Approved" : "Modify",
      tone: m[1] === "Approved paying" ? "done" : "waiting",
    };
  if ((m = action.match(/^Approved (.+?), (?:(Addendum \d+), )?([+−-]₹[\d,]+) and (\d+) days?/)))
    return {
      kind: "change",
      item: m[2] ? `${named(m[1])} · ${m[2]}` : named(m[1]),
      verb: "Approved",
      tone: "done",
      amount: m[3],
      days: Number(m[4]),
    };
  if ((m = action.match(/^Asked for changes to the price of (.+?)\.?$/)))
    return { kind: "change", item: named(m[1]), verb: "Modify", tone: "waiting" };
  if ((m = action.match(/^Declined (.+?)\.?$/))) return { kind: "change", item: named(m[1]), verb: "Declined", tone: "locked" };
  if ((m = action.match(/^Asked for (.+) more of advisory time/)))
    return { kind: "hours", item: "Advisory hours", verb: "Requested", tone: "progress", amount: `+${m[1]}` };
  return { kind: "other", item: action.replace(/\.$/, ""), tone: "locked" };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function DecisionLog({ entries }: { entries: LogEntry[] }) {
  const firm = useFirm();
  const [filter, setFilter] = useState<Filter>("all");
  // Her posts in the thread are words, not decisions: they live in Updates.
  const decisions = entries.filter((entry) => !entry.action.startsWith("Posted in")).map((entry) => ({ entry, row: rowOf(entry) }));
  const shown = filter === "all" ? decisions : decisions.filter(({ row }) => FILTER_OF[row.kind] === filter);

  return (
    <div className="grid gap-2">
      <div role="group" aria-label="Show" className="grid grid-cols-2 gap-1.5 px-1 min-[360px]:grid-cols-4 sm:flex sm:flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            className={`btn btn-glass min-h-11 px-1! text-15! min-[360px]:text-13! sm:px-4! sm:text-15! ${filter === f.id ? "bg-rosewood text-lime hover:bg-rosewood" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="px-3 py-6 text-15 text-ink-soft">Nothing yet</p>
      ) : (
        <ol className="grid gap-0.5" aria-label="Decisions, newest first">
          {shown.map(({ entry, row }) => {
            const Icon = ICON[row.kind];
            const own = entry.kind === "client";
            const by = firm.person(entry.by)?.name ?? entry.by;
            const date = formatDate(datePart(entry.at));
            const time = formatTime(entry.at);
            return (
              <li
                key={entry.id}
                className="glass-row grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2.5 md:grid-cols-[2.25rem_minmax(0,1fr)_7rem_8.5rem_7.5rem]"
              >
                <span className="sr-only">
                  {stageWords(entry.action)} {entry.detail ? `“${entry.detail}” ` : ""}By {by}, {time ? `${date}, ${time}` : date}.
                </span>

                <span
                  aria-hidden="true"
                  className="glass-inner row-span-2 grid size-9 place-items-center self-start text-rosewood md:row-span-1 md:self-center"
                >
                  <Icon size={17} />
                </span>

                <div aria-hidden="true" className="min-w-0" title={stageWords(entry.action)}>
                  <p className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-15 font-semibold">{row.item}</span>
                    {!own && (
                      <span
                        title={by}
                        className="grid size-6 shrink-0 place-items-center rounded-full bg-rosewood text-13 font-semibold text-lime"
                      >
                        {initials(by)}
                      </span>
                    )}
                  </p>
                  {entry.detail && <p className="line-clamp-2 text-13 text-ink-soft">&ldquo;{entry.detail}&rdquo;</p>}
                </div>

                <p aria-hidden="true" className="text-right text-13 leading-tight tabular-nums md:order-last">
                  <span className="block">{date}</span>
                  {time && <span className="block text-ink-soft">{time}</span>}
                </p>

                <div aria-hidden="true" className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 md:col-span-1 md:contents">
                  <span className="md:justify-self-start">
                    {row.verb && <StatusChip tone={row.tone}>{row.verb}</StatusChip>}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-x-2 tabular-nums md:grid md:justify-items-end md:justify-self-end md:text-right">
                    {row.amount && <span className="figure text-15">{row.amount}</span>}
                    {row.days ? <span className="late-text text-13">+{row.days} days</span> : null}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
