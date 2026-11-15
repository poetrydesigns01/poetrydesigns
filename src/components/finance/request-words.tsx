import { StatusChip } from "@/components/register/status-chip";
import type { RequestView } from "@/lib/firm";
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

export function requestChip(r: RequestView) {
  const { words, tone } = WORDS[r.status];
  return (
    <span className="flex flex-wrap justify-end gap-1.5 md:justify-start">
      <StatusChip tone={tone}>{words}</StatusChip>
      {r.late && r.status !== "Delivered" && r.status !== "PO uploaded" && <StatusChip tone="late">Late</StatusChip>}
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
