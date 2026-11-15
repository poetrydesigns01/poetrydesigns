/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import Link from "next/link";
import { StatusChip } from "@/components/register/status-chip";
import type { DesignItemStatus, DesignStageView, Tone } from "@/lib/portal";
import { ArrowIcon } from "./icons";

// Floor plan, then 3D elevation, then the final cost estimate: how far each has been
// approved, one row each, every row opening Designs.

const DOT: Record<DesignItemStatus, string> = {
  approved: "bg-kota",
  waiting: "bg-brass-light ring-2 ring-brass/40",
  modify: "bg-laterite",
  "not-uploaded": "border border-ink/30",
};

function chipFor(stage: DesignStageView): { tone: Tone; words: string } {
  // A stage opens only once the one before it is fully approved.
  if (stage.locked) return { tone: "locked", words: "Locked" };
  const toReview = stage.items.filter((i) => i.status === "waiting").length;
  if (toReview > 0) return { tone: "waiting", words: `${toReview} to review` };
  if (stage.status === "approved") return { tone: "done", words: "Approved" };
  if (stage.items.some((i) => i.status === "modify")) return { tone: "progress", words: "Being revised" };
  return { tone: "locked", words: "Not started" };
}

export function ApprovalsCard({ stages }: { stages: DesignStageView[] }) {
  return (
    <section className="glass p-2 sm:p-3" aria-labelledby="approvals-title">
      <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-1">
        <h2 id="approvals-title" className="display text-22 text-ink">
          Approvals
        </h2>
        <Link href="/client/designs" className="inline-flex min-h-11 items-center gap-1.5 text-15 font-semibold text-ink">
          Designs
          <ArrowIcon />
        </Link>
      </div>
      <ol>
        {stages.map((stage, i) => {
          const chip = chipFor(stage);
          return (
            <li key={stage.stage}>
              <Link
                href="/client/designs"
                className="glass-row grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5"
              >
                <span
                  className={`figure grid size-8 place-items-center rounded-full text-15 ${
                    stage.status === "approved" ? "bg-kota text-lime" : "bg-white/60 text-ink"
                  }`}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="grid min-w-0 gap-1">
                  <span className="truncate text-15 font-semibold text-ink">{stage.label}</span>
                  <span className="flex items-center gap-1.5" aria-hidden="true">
                    {stage.items.map((item) => (
                      <span key={item.id} className={`size-2.5 rounded-full ${DOT[item.status]}`} />
                    ))}
                    <span className="ml-1 text-13 text-ink-soft">
                      {stage.approved}/{stage.total}
                    </span>
                  </span>
                  <span className="sr-only">
                    {stage.approved} of {stage.total} approved
                  </span>
                </span>
                <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
