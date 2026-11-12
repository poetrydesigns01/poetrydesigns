"use client";

import Link from "next/link";
import { dayWords } from "@/components/admin/admin-data";
import { SealGlyph } from "@/components/instruments/glyphs";
import { ChalkTick } from "@/components/staff/chalk-tick";
import { useFirm } from "@/lib/demo-store";
import type { LogEntry } from "@/lib/firm-data";
import { formatTime } from "@/lib/format";

// The record as lines: the time to the minute, who, what, and the reason where one was
// required. A client's approval carries the seal glyph, a staff action a chalk mark, and a
// deletion is a struck line with who struck it and why. There are no actions on a line:
// nothing in the record can be edited or deleted, by anyone.

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
  if (entries.length === 0) return <p className="py-4 text-17 text-ink-soft">{empty}</p>;

  return (
    <ol className="grid">
      {entries.map((entry) => {
        const who = firm.person(entry.by)?.name ?? entry.by;
        const project = entry.projectId ? firm.project(entry.projectId) : undefined;
        const time = formatTime(entry.at);
        const deleted = entry.kind === "deleted";
        return (
          <li
            key={entry.id}
            className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-sand py-3 sm:grid-cols-[1.25rem_9rem_minmax(0,1fr)]"
          >
            <span className="pt-1" aria-hidden="true">
              {entry.kind === "client" ? (
                <SealGlyph size={16} />
              ) : deleted ? (
                <span className="block h-px w-4 translate-y-2 bg-ink" />
              ) : (
                <ChalkTick className="size-4 text-ink-soft" />
              )}
            </span>
            <p className="lettering col-start-2 text-ink-soft sm:pt-1">
              <span className="sr-only">
                {entry.kind === "client" ? "Client approval. " : deleted ? "Deletion. " : "Staff action. "}
              </span>
              {dayWords(entry.at)}
              {time ? `, ${time}` : ""}
            </p>
            <div className="col-start-2 min-w-0 sm:col-start-3 sm:row-start-1">
              <p className="max-w-[60ch] text-17">
                <span className="font-semibold">{who}</span>{" "}
                {deleted ? <s className="text-ink-soft">{entry.action}</s> : entry.action}
              </p>
              {entry.detail && <p className="max-w-[56ch] text-15 text-ink-soft">&ldquo;{entry.detail}&rdquo;</p>}
              {entry.reason && (
                <p className="max-w-[56ch] text-15 text-ink-soft">
                  <span className="font-semibold">Reason given.</span> {entry.reason.replace(/\.?$/, ".")}
                </p>
              )}
              {showProject && project && (
                <p className="lettering">
                  <Link
                    href={`/staff/projects/${project.id}/log`}
                    className="link inline-flex min-h-11 items-center text-ink-soft"
                  >
                    {project.name}
                  </Link>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
