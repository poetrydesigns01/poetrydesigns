/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { DecisionLog, DesignGroups } from "@/components/designs/stage-table";
import { useDesignStages } from "@/components/designs/items";
import { CLIENT_PAGE, PageHead } from "@/components/client-home/page-frame";
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
    <div className={CLIENT_PAGE}>
      <PageHead title="Designs">
        {waiting > 0 ? (
          <StatusChip tone="waiting">{waiting} to review</StatusChip>
        ) : (
          <StatusChip tone="done">All decided</StatusChip>
        )}
      </PageHead>

      <DesignGroups stages={stages} />

      <DecisionLog stages={stages} />
    </div>
  );
}
