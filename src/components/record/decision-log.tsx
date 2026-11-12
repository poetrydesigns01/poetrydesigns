"use client";

import { useState } from "react";
import { SealGlyph } from "@/components/instruments/glyphs";
import { Chip } from "@/components/register/chips";
import { useFirm } from "@/lib/demo-store";
import type { LogEntry } from "@/lib/firm-data";
import { formatStamp } from "@/lib/format";

// Every decision on her house, newest first, with who made it and when. It can be read and
// filtered and nothing else: there is no control here that edits or removes a line.

type Filter = "all" | "drawings" | "stages" | "payments" | "changes";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "drawings", label: "Drawings" },
  { id: "stages", label: "Stages" },
  { id: "payments", label: "Payments" },
  { id: "changes", label: "Changes" },
];

/** Which filter a line belongs to, read from what was done. Hours and the agreement show under All only. */
function kindOf(entry: LogEntry): Filter | null {
  const action = entry.action;
  if (/as finished/.test(action)) return "stages";
  if (/payment|schedule|two parts|milestone/i.test(action)) return "payments";
  if (/hours|advisory|agreement uploaded/i.test(action)) return null;
  if (/plan|elevation|specification|drawing|version \d/i.test(action)) return "drawings";
  if (entry.kind === "client") return "changes";
  return null;
}

const EMPTY: Record<Filter, string> = {
  all: "Nothing has been decided yet.",
  drawings: "No drawings have been decided yet.",
  stages: "No stages have been accepted yet.",
  payments: "No payments have been approved yet.",
  changes: "No changes have been decided yet.",
};

export function DecisionLog({ entries }: { entries: LogEntry[] }) {
  const firm = useFirm();
  const [filter, setFilter] = useState<Filter>("all");
  // Her posts in the thread are words, not decisions: they live in Updates.
  const decisions = entries.filter((entry) => !entry.action.startsWith("Posted in"));
  const shown = filter === "all" ? decisions : decisions.filter((entry) => kindOf(entry) === filter);

  return (
    <div>
      <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f.id} pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-17 text-ink-soft">{EMPTY[filter]}</p>
      ) : (
        <ol className="sheet-rows mt-6">
          {shown.map((entry) => {
            const client = entry.kind === "client";
            return (
              <li key={entry.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3">
                <span className="pt-1">{client && <SealGlyph size={16} />}</span>
                <div className="min-w-0">
                  <p className="max-w-[58ch] text-17">{entry.action}</p>
                  {entry.detail && <p className="mt-0.5 max-w-[56ch] text-15 text-ink-soft">&ldquo;{entry.detail}&rdquo;</p>}
                  <p className="mt-0.5 text-15 text-ink-soft">
                    {firm.person(entry.by)?.name ?? entry.by}, {formatStamp(entry.at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
