"use client";

import { useId, useState } from "react";
import { LogRows } from "@/components/project/log-rows";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { StaffBoard } from "@/components/register/staff-board";
import { useFirm } from "@/lib/demo-store";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { inRange, logKinds, type LogFilter } from "./admin-data";

// The audit trail for the whole firm, newest first. It can be narrowed by project, person,
// kind of action and date, and nothing else: there are no actions on a line.

const KINDS: { id: Exclude<LogFilter, "all">; label: string }[] = [
  { id: "approvals", label: "Approvals" },
  { id: "payments", label: "Payments" },
  { id: "materials", label: "Materials" },
  { id: "people", label: "People" },
  { id: "deletions", label: "Deletions" },
];

const RANGES: { id: "week" | "month" | "all"; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All" },
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
      <StaffBoard
        place="Log"
        headline="The record."
        state="Entries cannot be edited or deleted, including by admin."
        chip={false}
      />
      <div className="mt-8 grid gap-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor={`${ids}-project`} className="block text-15 font-semibold">
              Project
            </label>
            <select
              id={`${ids}-project`}
              className={`${field} mt-1.5`}
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
            <label htmlFor={`${ids}-person`} className="block text-15 font-semibold">
              Person
            </label>
            <select
              id={`${ids}-person`}
              className={`${field} mt-1.5`}
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
        </div>
        <ChipGroup label="Action">
          {KINDS.map((k) => (
            <Chip key={k.id} pressed={kind === k.id} onClick={() => setKind(kind === k.id ? "all" : k.id)}>
              {k.label}
            </Chip>
          ))}
        </ChipGroup>
        <ChipGroup label="When">
          {RANGES.map((r) => (
            <Chip key={r.id} pressed={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </Chip>
          ))}
        </ChipGroup>

        <section aria-label="Entries">
          <h2 className="register-title">{shown.length === 1 ? "1 entry" : `${shown.length} entries`}, newest first</h2>
          <LogRows entries={shown} />
        </section>
      </div>
    </>
  );
}
