import type { ReactNode } from "react";
import type { Tone } from "@/lib/portal";

// A status in a glass pill: a word, with its colour only reinforcing it. Every derived view
// in portal.ts carries a `tone` beside its status words, so a row writes
// <StatusChip tone={stage.tone}>{stage.status}</StatusChip>.

const TONE_CLASS: Record<Tone, string> = {
  done: "chip-done",
  waiting: "chip-waiting",
  late: "chip-late",
  locked: "chip-locked",
  progress: "chip-progress",
};

export function StatusChip({ tone, children, className = "" }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={`glass-chip ${TONE_CLASS[tone]} ${className}`}>{children}</span>;
}
