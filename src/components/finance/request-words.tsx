/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { StatusChip } from "@/components/register/status-chip";
import { ageWords, type RequestView } from "@/lib/firm";
import { datePart, daysBetween } from "@/lib/format";
import type { Tone } from "@/lib/portal";

// A request's status as a chip, in the words the site sees: "In procurement" until a PO
// is linked, then "PO sent", then "Delivered". "New" is procurement's own word for a
// request nobody has opened yet.

const WORDS: Record<RequestView["status"], { words: string; tone: Tone }> = {
  New: { words: "New", tone: "waiting" },
  Seen: { words: "In procurement", tone: "progress" },
  "PO in part": { words: "PO in part", tone: "progress" },
  "PO uploaded": { words: "PO sent", tone: "done" },
  Delivered: { words: "Delivered", tone: "done" },
};

export function requestWords(r: RequestView): { words: string; tone: Tone } {
  return WORDS[r.status];
}

/** Late for the site: the date it is needed has come and it is not yet ordered in full. */
export function lateForSite(r: RequestView): boolean {
  return r.late && r.status !== "Delivered" && r.status !== "PO uploaded";
}

/**
 * The status chip. Where a waiting chip stands beside it, pass `late: false`: the waiting
 * chip then says "late", and the row keeps one chip per fact instead of two stacked.
 */
export function requestChip(r: RequestView, { late = true }: { late?: boolean } = {}) {
  const { words, tone } = WORDS[r.status];
  if (!late) return <StatusChip tone={tone}>{words}</StatusChip>;
  return (
    <span className="flex flex-wrap justify-end gap-1.5 md:justify-start">
      <StatusChip tone={tone}>{words}</StatusChip>
      {lateForSite(r) && <StatusChip tone="late">Late</StatusChip>}
    </span>
  );
}

/** How long a request has waited, as a chip: kota under 2 days, brass from 2, brick from 4
 *  or once it is late for the site, when it says so. */
export function WaitingChip({ r }: { r: RequestView }) {
  const late = lateForSite(r);
  const tone = late || r.days >= 4 ? "chip-late" : r.days >= 2 ? "chip-waiting" : "chip-done";
  return (
    <span className={`glass-chip whitespace-nowrap tabular-nums ${tone}`}>
      {ageWords(r.days)}
      {late ? " · late" : ""}
    </span>
  );
}

/** The four steps a request passes, and how far this one has come (0 to 3). */
export const REQUEST_STEPS = ["Raised", "Seen", "PO sent", "Delivered"];

export function reachedOf(r: RequestView): number {
  if (r.status === "Delivered") return 3;
  if (r.status === "PO uploaded") return 2;
  if (r.status === "Seen" || r.status === "PO in part") return 1;
  return 0;
}

/** Days from the request reaching procurement to its first PO, or null without one. */
export function responseDays(r: RequestView): number | null {
  const first = [...r.pos].sort((a, b) => a.at.localeCompare(b.at))[0];
  if (!first) return null;
  return Math.max(0, daysBetween(datePart(r.sentAt || r.at), datePart(first.at)));
}
