"use client";

import { useRef, useState } from "react";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { useDemo, useFirm, useViewer } from "@/lib/demo-store";
import type { ProjectView, StampView } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { listWords } from "@/lib/format";
import { focusReturn } from "./focus-return";
import { usePanel } from "./rows";
import { hasFinance } from "./shared";

// The procurement lead's team: who is in it, which sites each one buys for, and two
// actions, each through the pause: add a member, and give a member more sites. Adding to
// a team is how work is handed on here; there are no other permissions to set.

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
      className="grid gap-4 border-t border-sand pt-4"
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
        label={adding ? "Sites they buy for (you can add these later)" : "More sites"}
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
  const demo = useDemo();
  const me = useViewer("finance");
  const pause = usePause();
  const panel = usePanel();
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);

  if (!me.senior) {
    return (
      <StaffBoard
        place="Team"
        headline="This page is for the procurement lead."
        state="Your requests and money are on Today."
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
  // The team's own record: each addition and each site given, newest first.
  const stampsOf = (person: PersonId): StampView[] =>
    demo.events
      .flatMap((e) => (e.kind === "member.added" && e.team === TEAM && e.personId === person ? [e] : []))
      .map((e) => ({
        words: e.sites.length === 0 ? "Added to procurement" : `Given ${listWords(e.sites.map((id) => firm.project(id)?.name ?? id))}`,
        at: e.at,
        by: e.by,
      }))
      .reverse();

  return (
    <>
      <StaffBoard
        place="Team"
        headline={members.length > 0 ? `Your team: ${listWords(members.map((m) => m.name))}.` : "Your team has no one else yet."}
        state={
          uncovered.length === 0
            ? "Every open site has someone in procurement."
            : `${listWords(uncovered.map((p) => p.name))} ${uncovered.length === 1 ? "has" : "have"} no one in procurement.`
        }
        chip={false}
      />

      <div className="mt-10 grid gap-10">
        <Register title="Your team" empty="No one else is in the team yet.">
          {members.map((m) => {
            const id = `member:${m.id}`;
            const sites = projects.filter((p) => p.team.procurement.includes(m.id));
            const open = panel.isOpen(id);
            return (
              <RegisterRow
                key={m.id}
                id={id}
                margin={hasFinance(m) ? "Accounts" : `${sites.length} ${sites.length === 1 ? "site" : "sites"}`}
                title={m.name}
                sentence={
                  <>
                    {m.title}. {hasFinance(m) ? "Records money in and bills for every project. " : ""}
                    {sites.length > 0 ? `Buys for ${listWords(sites.map((p) => p.name))}.` : "Buys for no site yet."}{" "}
                    <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="link whitespace-nowrap py-3.5">
                      {m.phone}
                    </a>
                  </>
                }
                action={
                  <button
                    type="button"
                    className="btn btn-quiet"
                    aria-expanded={open}
                    onClick={(event) => panel.toggle(id, event.currentTarget)}
                  >
                    {open ? "Close" : "Assign sites"}
                  </button>
                }
                stamps={stampsOf(m.id)}
              >
                {open && (
                  <AssignSites
                    person={m.id}
                    by={me.id}
                    have={sites.map((p) => p.id)}
                    projects={projects}
                    onDone={panel.close}
                  />
                )}
              </RegisterRow>
            );
          })}
        </Register>

        <div className="grid justify-items-start gap-3">
          <button
            ref={addRef}
            type="button"
            className="btn btn-quiet"
            aria-expanded={adding}
            onClick={() => {
              if (adding && pause.pending !== null && pause.pending.rowId === null) pause.cancel();
              setAdding((a) => !a);
            }}
          >
            {adding ? "Close" : "Add a member"}
          </button>
          {adding && (
            <div className="w-full">
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
          <p className="text-15 text-ink-soft">New people are set up by Shalini Murthy on the admin People page.</p>
        </div>
      </div>
    </>
  );
}
