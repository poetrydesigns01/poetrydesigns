/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { WaitTier } from "@/lib/desk";

// How long something has waited, as a pill: "Today", "1 d", "3 d" (brass, waiting) or
// "Urgent · 6 d" (brick, bold). The word carries it; the colour only reinforces it.

const TIER_CLASS: Record<WaitTier, string> = {
  normal: "",
  waiting: "chip-waiting",
  urgent: "chip-late",
};

export function waitWords(waitedDays: number, tier: WaitTier): string {
  const days = waitedDays === 0 ? "Today" : `${waitedDays} d`;
  return tier === "urgent" ? `Urgent · ${waitedDays} d` : days;
}

export function WaitChip({
  waitedDays,
  tier,
  className = "",
}: {
  waitedDays: number;
  tier: WaitTier;
  className?: string;
}) {
  const label =
    tier === "urgent"
      ? `Urgent, waiting ${waitedDays === 1 ? "1 day" : `${waitedDays} days`}`
      : waitedDays === 0
        ? "Since today"
        : `Waiting ${waitedDays === 1 ? "1 day" : `${waitedDays} days`}`;
  return (
    <span className={`glass-chip figure ${TIER_CLASS[tier]} ${className}`} aria-label={label} title={label}>
      {waitWords(waitedDays, tier)}
    </span>
  );
}
