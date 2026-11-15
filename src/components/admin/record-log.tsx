/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useState } from "react";
import { LogRows } from "@/components/project/log-rows";
import { field } from "@/components/register/chips";
import { StaffBoard } from "@/components/register/staff-board";
import { useFirm } from "@/lib/demo-store";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { inRange, logKinds, type LogFilter } from "./admin-data";
import { Count, Panel, Segments } from "./glass-kit";

// The audit trail for the whole firm, newest first, narrowed by project, person, kind of
// action and date. Nothing here can be edited or deleted, by anyone.

const KINDS: { id: LogFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "approvals", label: "Approvals" },
  { id: "payments", label: "Payments" },
  { id: "materials", label: "Materials" },
  { id: "people", label: "People" },
  { id: "deletions", label: "Deletions" },
];

const RANGES: { id: "week" | "month" | "all"; label: string }[] = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "all", label: "All time" },
];

export function RecordLog() {
  const firm = useFirm();
  const ids = useId();
  const [project, setProject] = useState<ProjectId | "all">("all");
  const [person, setPerson] = useState<PersonId | "all">("all");
  const [kind, setKind] = useState<LogFilter>("all");
  const [range, setRange] = useState<"week" | "month" | "all">("all");

  const people = firm.people.filter((p) => firm.log.some((entry) => entry.by === p.id));
  const projects = firm.projects.filter((p) => firm.log.some((entry) => entry.projectId === p.id));
  const shown = firm.log.filter(
    (entry) =>
      (project === "all" || entry.projectId === project) &&
      (person === "all" || entry.by === person) &&
      (kind === "all" || logKinds(entry).includes(kind)) &&
      inRange(entry.at, range),
  );

  return (
    <>
      <StaffBoard place="Log" headline="The record" state="Read only, for everyone." chip={false} />
      <div className="mt-6 grid gap-5">
        <section aria-label="Filters" className="glass grid gap-3 p-3 sm:p-4 lg:grid-cols-2">
          <div>
            <label htmlFor={`${ids}-project`} className="lettering block text-ink-soft">
              Project
            </label>
            <select
              id={`${ids}-project`}
              className={`${field} mt-1`}
              value={project}
              onChange={(e) => setProject(e.target.value as ProjectId | "all")}
            >
              <option value="all">Every project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${ids}-person`} className="lettering block text-ink-soft">
              Person
            </label>
            <select
              id={`${ids}-person`}
              className={`${field} mt-1`}
              value={person}
              onChange={(e) => setPerson(e.target.value as PersonId | "all")}
            >
              <option value="all">Everyone</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </section>
        <div className="flex flex-wrap gap-3">
          <Segments<LogFilter> label="Action" value={kind} onChange={setKind} options={KINDS} />
          <Segments<"week" | "month" | "all"> label="When" value={range} onChange={setRange} options={RANGES} />
        </div>

        <Panel title="Entries" aside={<Count n={shown.length} />} strong>
          <LogPage key={`${project}-${person}-${kind}-${range}`} entries={shown} />
        </Panel>
      </div>
    </>
  );
}

/** Thirty entries at a time. */
function LogPage({ entries }: { entries: Parameters<typeof LogRows>[0]["entries"] }) {
  const [limit, setLimit] = useState(30);
  return (
    <>
      <LogRows entries={entries.slice(0, limit)} />
      {entries.length > limit && (
        <button type="button" className="btn btn-glass mt-3 min-h-11 w-full sm:w-auto" onClick={() => setLimit((l) => l + 30)}>
          Show more ({entries.length - limit})
        </button>
      )}
    </>
  );
}
