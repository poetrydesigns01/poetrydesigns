/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useRef, useState } from "react";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { Count, Icon, Initials, Panel } from "@/components/admin/glass-kit";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useFirm, useViewer } from "@/lib/demo-store";
import type { ProjectView } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { listWords } from "@/lib/format";
import { focusReturn } from "./focus-return";
import { usePanel } from "./rows";
import { hasFinance } from "./shared";

// The procurement lead's team: who is in it and which sites each one buys for, with two
// actions through the pause: add a member, and give a member more sites.

const TEAM = "Procurement" as const;

function SitesPicker({
  projects,
  have,
  chosen,
  onChange,
  label,
}: {
  projects: ProjectView[];
  have: ProjectId[];
  chosen: ProjectId[];
  onChange: (next: ProjectId[]) => void;
  label: string;
}) {
  return (
    <ChipGroup label={label} columns={2}>
      {projects.map((p) => {
        const already = have.includes(p.id);
        const on = already || chosen.includes(p.id);
        return (
          <Chip
            key={p.id}
            pressed={on}
            detail={already ? "Already covered" : undefined}
            onClick={() => {
              if (already) return;
              onChange(on ? chosen.filter((id) => id !== p.id) : [...chosen, p.id]);
            }}
          >
            {p.name}
          </Chip>
        );
      })}
    </ChipGroup>
  );
}

function AssignSites({
  person,
  by,
  have,
  projects,
  onDone,
  adding,
}: {
  person?: PersonId;
  by: PersonId;
  have: ProjectId[];
  projects: ProjectView[];
  onDone: () => void;
  /** People who can be added, when this adds a new member. */
  adding?: { id: PersonId; name: string; title: string }[];
}) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const submitRef = useRef<HTMLButtonElement>(null);
  const [who, setWho] = useState<PersonId | "">(person ?? "");
  const [sites, setSites] = useState<ProjectId[]>([]);
  const [error, setError] = useState("");
  const name = who ? (firm.person(who)?.name ?? who) : "";

  const submit = () => {
    if (pause.pending !== null) return;
    if (!who) {
      setError("Choose who joins the team.");
      return;
    }
    if (!adding && sites.length === 0) {
      setError("Choose at least one more site.");
      return;
    }
    setError("");
    const { record } = demo;
    const personId = who;
    const chosen = sites;
    pause.start({
      what: adding ? `${name}, added to procurement` : `${listWords(chosen.map((id) => firm.project(id)?.name ?? id))} given to ${name}`,
      origin: submitRef.current,
      commit: () => {
        record({ kind: "member.added", team: TEAM, personId, sites: chosen, by });
        setSites([]);
        setWho(person ?? "");
        onDone();
      },
    });
  };

  return (
    <form
      className="glass-inner grid gap-4 p-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {adding && (
        <Field label="Who joins">
          <select className={field} value={who} onChange={(event) => setWho(event.target.value as PersonId)}>
            <option value="">Choose</option>
            {adding.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}, {p.title.charAt(0).toLowerCase()}
                {p.title.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      )}
      <SitesPicker
        projects={projects}
        have={have}
        chosen={sites}
        onChange={setSites}
        label={adding ? "Sites" : "More sites"}
      />
      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
      <div>
        <button ref={submitRef} type="submit" className="btn btn-primary w-full sm:w-auto" aria-disabled={pause.pending !== null}>
          {adding ? "Add to the team" : sites.length > 1 ? `Assign ${sites.length} sites` : "Assign site"}
        </button>
      </div>
    </form>
  );
}

export function FinanceTeam() {
  const firm = useFirm();
  const me = useViewer("finance");
  const pause = usePause();
  const panel = usePanel();
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);

  if (!me.senior) {
    return (
      <StaffBoard
        place="Team"
        headline="For the procurement lead"
        chip={false}
        back={{ label: "Back to Today", href: "/staff/finance" }}
      />
    );
  }

  const projects = firm.projects.filter((p) => p.phase !== "draft" && p.phase !== "handed-over");
  const members = firm.people.filter((p) => p.id !== me.id && p.active && p.teams.includes(TEAM));
  const candidates = firm.people
    .filter((p) => p.role !== "client" && p.active && !p.teams.includes(TEAM))
    .sort((a, b) => Number(b.role === "finance") - Number(a.role === "finance"))
    .map((p) => ({ id: p.id, name: p.name, title: p.title }));
  const uncovered = projects.filter((p) => p.team.procurement.length === 0);

  return (
    <>
      <StaffBoard place="Team" headline="Procurement team" chip={false} />

      <div className="mt-6 grid gap-5">
        {uncovered.length > 0 && (
          <section aria-label="Sites with no buyer" className="glass flex flex-wrap items-center gap-2 px-4 py-3">
            <Icon name="alert" className="size-4 text-brick" />
            <span className="text-15 font-semibold">No buyer</span>
            {uncovered.map((p) => (
              <StatusChip key={p.id} tone="late">
                {p.name}
              </StatusChip>
            ))}
          </section>
        )}

        <Panel
          title="Members"
          aside={
            <span className="flex items-center gap-2">
              <Count n={members.length} />
              <button
                ref={addRef}
                type="button"
                className="btn btn-glass min-h-11 gap-2 px-4 text-15"
                aria-expanded={adding}
                onClick={() => {
                  if (adding && pause.pending !== null && pause.pending.rowId === null) pause.cancel();
                  setAdding((a) => !a);
                }}
              >
                {!adding && <Icon name="plus" />}
                {adding ? "Close" : "Add member"}
              </button>
            </span>
          }
          strong
        >
          {adding && (
            <div className="mb-3">
              <AssignSites
                by={me.id}
                have={[]}
                projects={projects}
                adding={candidates}
                onDone={() => {
                  setAdding(false);
                  focusReturn(addRef.current)();
                }}
              />
            </div>
          )}
          {members.length === 0 ? (
            <p className="px-1 py-3 text-15 text-ink-soft">No one else yet.</p>
          ) : (
            <ul className="grid gap-1">
              {members.map((m) => {
                const id = `member:${m.id}`;
                const sites = projects.filter((p) => p.team.procurement.includes(m.id));
                const open = panel.isOpen(id);
                return (
                  <li key={m.id} className="glass-row grid gap-3 px-3 py-3" data-row-id={id}>
                    <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
                      <div className="flex min-w-0 items-center gap-3">
                        <Initials name={m.name} />
                        <span className="grid min-w-0">
                          <span className="truncate text-15 font-semibold">{m.name}</span>
                          <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="link -my-3 inline-flex min-h-11 items-center text-13 text-ink-soft">
                            {m.phone}
                          </a>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {hasFinance(m) && <StatusChip tone="done">Accounts</StatusChip>}
                        {sites.length === 0 ? (
                          <StatusChip tone="locked">No site</StatusChip>
                        ) : (
                          sites.map((p) => (
                            <span key={p.id} className="glass-chip">
                              {p.name}
                            </span>
                          ))
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-glass min-h-11 justify-self-start px-4 text-15 sm:justify-self-end"
                        aria-expanded={open}
                        onClick={(event) => panel.toggle(id, event.currentTarget)}
                      >
                        {open ? "Close" : "Assign sites"}
                      </button>
                    </div>
                    {open && (
                      <AssignSites
                        person={m.id}
                        by={me.id}
                        have={sites.map((p) => p.id)}
                        projects={projects}
                        onDone={panel.close}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
