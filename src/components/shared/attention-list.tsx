/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { sortAttention, type AttentionItem, type WaitTier } from "@/lib/desk";
import { WaitChip } from "./wait-chip";

// What is waiting on someone, as glass rows: urgent first (a brick bar down the left edge and
// the "Urgent" chip), then the oldest. Each row links to where it is answered; a board may
// put one action at the end of a row (hand in, review, resend), answered in place.

const MARKER: Record<WaitTier, string> = {
  urgent: "bg-brick",
  waiting: "bg-brass",
  normal: "bg-transparent",
};

/**
 * A row's action, or null for none. It sits after the link in a two-column grid, so a panel it
 * opens (with `col-span-2`) drops under the whole row.
 */
export type AttentionAction = (item: AttentionItem) => ReactNode;

export function AttentionList({
  items,
  label = "Waiting on you",
  empty = "Nothing waiting",
  limit,
  showProject = true,
  action,
  className = "",
}: {
  items: AttentionItem[];
  /** The list's name for screen readers. */
  label?: string;
  empty?: string;
  /** Show at most this many rows. */
  limit?: number;
  showProject?: boolean;
  action?: AttentionAction;
  className?: string;
}) {
  const rows = sortAttention(items).slice(0, limit ?? items.length);
  if (rows.length === 0) {
    return (
      <section className={`glass p-4 ${className}`} aria-label={label}>
        <p className="text-15 text-ink-soft">{empty}</p>
      </section>
    );
  }
  return (
    <section className={`glass p-2 sm:p-3 ${className}`} aria-label={label}>
      <ul className="grid gap-0.5">
        {rows.map((item) => {
          const sub = [showProject ? (item.projectCode ?? item.projectName) : undefined, item.detail].filter(Boolean).join(" · ");
          const extra = action?.(item) ?? null;
          const body = (
            <>
              <span aria-hidden className={`w-1 self-stretch rounded-full ${MARKER[item.tier]}`} />
              <span className="grid min-w-0 gap-0.5">
                <span className={`truncate text-15 ${item.tier === "urgent" ? "font-semibold text-ink" : "text-ink"}`}>
                  {item.what}
                </span>
                {sub && <span className="truncate text-13 text-ink-soft">{sub}</span>}
              </span>
              <span className="flex items-center gap-2">
                {item.figure && <span className="figure hidden text-15 text-ink sm:inline">{item.figure}</span>}
                <WaitChip waitedDays={item.waitedDays} tier={item.tier} />
              </span>
            </>
          );
          const link = "grid grid-cols-[4px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 pl-1.5 outline-none focus-visible:ring-2 focus-visible:ring-laterite";
          if (extra === null || extra === false)
            return (
              <li key={item.id}>
                <Link href={item.href} className={`glass-row ${link} pr-3`}>
                  {body}
                </Link>
              </li>
            );
          return (
            <li key={item.id} className="glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 pr-2">
              <Link href={item.href} className={`${link} rounded-xl pr-1`}>
                {body}
              </Link>
              {extra}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
