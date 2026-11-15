"use client";

import { DecisionLog, DesignGroups } from "@/components/designs/stage-table";
import { useDesignStages } from "@/components/designs/items";
import { StatusChip } from "@/components/register/status-chip";

// Designs in the order of Poetry's workflow: floor plan drafts 1 to 3 and the final draft,
// elevation options 1 to 3 and the final elevation, design and cost approvals, the final
// estimate, then the selections during construction, milestone by milestone. Decided groups
// fold to one line. Each item is prepared by the architect, viewed by the client, then
// approved or sent back with a comment, and every decision keeps its date and time.

export default function DesignsPage() {
  const stages = useDesignStages();
  const items = stages.flatMap((stage) => (stage.locked ? [] : stage.items));
  const waiting = items.filter((item) => item.status === "waiting").length;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6 lg:gap-5 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <h1 className="display text-32 text-ink">Designs</h1>
        {waiting > 0 ? (
          <StatusChip tone="waiting">{waiting} to review</StatusChip>
        ) : (
          <StatusChip tone="done">All decided</StatusChip>
        )}
      </header>

      <DesignGroups stages={stages} />

      <DecisionLog stages={stages} />
    </div>
  );
}
