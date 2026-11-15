"use client";

import Link from "next/link";
import { dayWords } from "@/components/admin/admin-data";
import { Initials } from "@/components/admin/glass-kit";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import type { LogEntry } from "@/lib/firm-data";
import { formatTime } from "@/lib/format";

// The record as rows: the date and time to the minute, who, what, and the reason where one
// was required. A client's decision carries a "Client" chip, a deletion is struck with a
// "Deleted" chip. There are no actions on a row: nothing in the record can be edited.

export function LogRows({
  entries,
  showProject = true,
  empty = "Nothing in the record matches.",
}: {
  entries: LogEntry[];
  showProject?: boolean;
  empty?: string;
}) {
  const firm = useFirm();
  if (entries.length === 0) return <p className="px-1 py-4 text-15 text-ink-soft">{empty}</p>;

  return (
    <ol className="grid gap-1">
      {entries.map((entry) => {
        const who = firm.person(entry.by)?.name ?? entry.by;
        const project = entry.projectId ? firm.project(entry.projectId) : undefined;
        const time = formatTime(entry.at);
        const deleted = entry.kind === "deleted";
        const client = entry.kind === "client";
        return (
          <li
            key={entry.id}
            className="glass-row grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-1 px-3 py-3 sm:grid-cols-[7.5rem_2rem_minmax(0,1fr)]"
          >
            <p className="lettering col-span-2 text-ink-soft sm:col-span-1 sm:pt-2">
              {dayWords(entry.at)}
              {time ? `, ${time}` : ""}
            </p>
            <Initials name={who} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-15">
                <span className="font-semibold">{who}</span>
                {client && <StatusChip tone="done">Client</StatusChip>}
                {deleted && <StatusChip tone="late">Deleted</StatusChip>}
                {showProject && project && (
                  <Link
                    href={`/staff/projects/${project.id}/log`}
                    className="link -my-3 inline-flex min-h-11 items-center text-13 text-ink-soft"
                  >
                    {project.name}
                  </Link>
                )}
              </p>
              <p className="max-w-[64ch] text-15">{deleted ? <s className="text-ink-soft">{entry.action}</s> : entry.action}</p>
              {entry.detail && <p className="max-w-[60ch] text-13 text-ink-soft">&ldquo;{entry.detail}&rdquo;</p>}
              {entry.reason && (
                <p className="max-w-[60ch] text-13 text-ink-soft">
                  <span className="font-semibold">Reason:</span> {entry.reason.replace(/\.?$/, ".")}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
