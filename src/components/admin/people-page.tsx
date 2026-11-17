/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { EmailPreview } from "@/components/register/email-preview";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useFirm, type NewEvent } from "@/lib/demo-store";
import type { Person, PersonId, ProjectId, StaffRole } from "@/lib/firm-data";
import { listWords } from "@/lib/format";
import { peopleOf, ROLE_GROUP, ROLE_TEAM, roleChangeWords, STAFF_ROLES, type PersonView } from "./admin-data";
import { Count, Icon, Initials, Panel, ROW_ACTION, Segments } from "./glass-kit";

// Everyone who uses the portal, filtered by role. Each staff row has one action, "Change":
// role, senior or junior, finance access, a project or team, Project Head, deactivation.
// Every change asks for a reason, waits five seconds, and is logged. Nobody is deleted.

type Action = "role" | "level" | "access" | "team" | "head" | "active";

const ROLE_ORDER: Person["role"][] = [...STAFF_ROLES, "client"];

/** The title that goes with a role and seniority, until the person's own is set. */
function titleFor(role: StaffRole, senior: boolean): string {
  switch (role) {
    case "bd":
      return senior ? "Business development" : "Client relations";
    case "architect":
      return senior ? "Senior architect" : "Junior architect";
    case "site":
      return senior ? "Senior site engineer" : "Junior site engineer";
    case "finance":
      return senior ? "Procurement lead" : "Procurement";
    case "admin":
      return "Operations";
  }
}

const ROLE_WORD: Record<StaffRole, string> = {
  bd: "Business development",
  architect: "Architect",
  site: "Site engineer",
  finance: "Procurement and finance",
  admin: "Admin",
};

type RoleFilter = Person["role"] | "all";

const ROLE_SHORT: Record<Person["role"], string> = {
  bd: "BD",
  architect: "Architects",
  site: "Site",
  finance: "Procurement",
  admin: "Admin",
  client: "Clients",
};

export function PeoplePage() {
  const demo = useDemo();
  const firm = useFirm();
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState<RoleFilter>("all");
  const people = useMemo(() => peopleOf(firm, demo.events), [firm, demo.events]);
  const roles = ROLE_ORDER.filter((r) => people.some((p) => p.role === r));
  const shown = people
    .filter((p) => role === "all" || p.role === role)
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || Number(b.active) - Number(a.active));
  const active = people.filter((p) => p.active && p.role !== "client").length;

  return (
    <>
      <StaffBoard
        place="People"
        headline={`${active} staff, ${people.filter((p) => p.role === "client").length} clients`}
        primary={{ label: adding ? "Close" : "Add person", onClick: () => setAdding((a) => !a) }}
        chip={false}
      />
      <div className="mt-6 grid gap-5">
        {adding && <AddPerson onClose={() => setAdding(false)} />}
        <Segments<RoleFilter>
          label="Role"
          value={role}
          onChange={setRole}
          scroll
          options={[
            { id: "all", label: "All", count: people.length },
            ...roles.map((r) => ({ id: r, label: ROLE_SHORT[r], count: people.filter((p) => p.role === r).length })),
          ]}
        />
        <Panel title={role === "all" ? "Everyone" : ROLE_GROUP[role]} aside={<Count n={shown.length} />} strong>
          <ul className="grid gap-1">
            {shown.map((p) => (
              <PersonRow key={p.id} person={p} />
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function PersonRow({ person }: { person: PersonView }) {
  const [open, setOpen] = useState(false);
  const pause = usePause();
  const rowId = `person:${person.id}`;
  const staff = person.role !== "client";
  const heads = person.projects.filter((p) => p.head);
  const others = person.projects.filter((p) => !p.head);

  const close = () => {
    if (pause.pending?.rowId === rowId) pause.cancel();
    setOpen(false);
  };

  return (
    <li className={`glass-row grid gap-3 px-3 py-3 ${person.active ? "" : "opacity-70"}`} data-row-id={rowId}>
      {/* On a phone the change button sits at the top right of the name, the chips under
          both; from 768 px name, chips and button stand in one line. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <Initials name={person.name} />
          <span className="grid min-w-0">
            <span className="truncate text-15 font-semibold">{person.active ? person.name : <s>{person.name}</s>}</span>
            <span className="truncate text-13 text-ink-soft">{person.title}</span>
          </span>
        </div>
        {staff && (
          <button
            type="button"
            className={`${ROW_ACTION} justify-self-end md:order-last`}
            aria-expanded={open}
            aria-label={open ? `Close changes for ${person.name}` : `Change ${person.name}`}
            onClick={() => (open ? close() : setOpen(true))}
          >
            <Icon name="pencil" />
            {open ? "Close" : "Change"}
          </button>
        )}
        <div className="col-span-2 flex flex-wrap gap-1.5 empty:hidden md:col-span-1">
          {!person.active && <StatusChip tone="locked">Deactivated</StatusChip>}
          {staff && <span className="glass-chip">{person.senior ? "Senior" : "Junior"}</span>}
          {person.access.includes("finance") && <StatusChip tone="done">Finance access</StatusChip>}
          {/* One count per kind; the full list is in the Change panel and the tooltip. */}
          {heads.length > 0 && (
            <span className="glass-chip chip-progress" title={heads.map((p) => p.name).join(", ")}>
              Head · {heads.length}
              <span className="sr-only">: {listWords(heads.map((p) => p.name))}</span>
            </span>
          )}
          {others.length === 1 && <span className="glass-chip">{others[0].name}</span>}
          {others.length > 1 && (
            <span className="glass-chip" title={others.map((p) => p.name).join(", ")}>
              {others.length} projects
              <span className="sr-only">: {listWords(others.map((p) => p.name))}</span>
            </span>
          )}
          {person.onboarded > 0 && <span className="glass-chip">{person.onboarded} onboarded</span>}
        </div>
      </div>
      {open && staff && <PersonChanges person={person} rowId={rowId} pause={pause} onDone={() => setOpen(false)} />}
    </li>
  );
}

function PersonChanges({
  person,
  rowId,
  pause,
  onDone,
}: {
  person: PersonView;
  rowId: string;
  pause: ReturnType<typeof usePause>;
  onDone: () => void;
}) {
  const demo = useDemo();
  const firm = useFirm();
  const ids = useId();
  const role = person.role as StaffRole;
  const live = firm.projects.filter((p) => p.phase !== "draft");
  // A senior architect on a project's team who is not its head can be made its Project Head.
  const headable =
    role === "architect" && person.senior && person.active
      ? live.filter((p) => p.team.head !== person.id && p.team.architects.includes(person.id))
      : [];
  const teamable = live.filter(
    (p) =>
      p.team.head !== person.id &&
      !p.team.architects.includes(person.id) &&
      !p.team.engineers.includes(person.id) &&
      !p.team.procurement.includes(person.id),
  );

  const actions: { id: Action; label: string }[] = [
    { id: "role", label: "Change role" },
    { id: "level", label: person.senior ? "Mark junior" : "Mark senior" },
    ...(person.access.includes("finance") || role === "finance" || role === "admin"
      ? []
      : [{ id: "access" as const, label: "Give access" }]),
    { id: "team", label: "Add to project or team" },
    ...(headable.length > 0 ? [{ id: "head" as const, label: "Make Project Head" }] : []),
    { id: "active", label: person.active ? "Deactivate" : "Reactivate" },
  ];

  const [action, setAction] = useState<Action | null>(null);
  const [toRole, setToRole] = useState<StaffRole | null>(null);
  const [scope, setScope] = useState<"all" | ProjectId[]>("all");
  const [team, setTeam] = useState<"Studio" | "Site" | "Procurement">(
    role === "site" ? "Site" : role === "finance" ? "Procurement" : "Studio",
  );
  const [sites, setSites] = useState<ProjectId[]>([]);
  const [head, setHead] = useState<ProjectId | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const needsReason = action !== null && action !== "team";
  const toggleSite = (id: ProjectId) =>
    setSites((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const scopeList = scope === "all" ? [] : scope;

  /** The change as one sentence, read back while it is filled in. */
  function readBack(): string {
    switch (action) {
      case "role":
        return toRole ? `Move ${person.name} to ${ROLE_GROUP[toRole]}.` : `Choose ${person.first}'s new role.`;
      case "level":
        return `Mark ${person.name} ${person.senior ? "junior" : "senior"}.`;
      case "access":
        return `Give ${person.name} access to finance on ${
          scope === "all"
            ? "all projects"
            : scopeList.length > 0
              ? listWords(scopeList.map((id) => firm.project(id)?.name ?? id))
              : "the projects you choose"
        }.`;
      case "team":
        return `Add ${person.name} to ${team}${
          sites.length > 0 ? ` for ${listWords(sites.map((id) => firm.project(id)?.name ?? id))}` : ""
        }.`;
      case "head": {
        const p = head ? firm.project(head) : undefined;
        return p
          ? `Make ${person.name} Project Head of ${p.name} in place of ${firm.person(p.team.head)?.name ?? p.team.head}.`
          : "Choose the project.";
      }
      case "active":
        return person.active
          ? `Deactivate ${person.name}. Their entries stay in the record.`
          : `Reactivate ${person.name}.`;
      default:
        return "";
    }
  }

  function eventOf(why: string): NewEvent | string {
    switch (action) {
      case "role":
        if (!toRole) return "Choose the new role.";
        return {
          kind: "person.changed",
          person: person.id,
          change: roleChangeWords(person.name, person.role, toRole),
          reason: why,
          patch: { role: toRole, title: titleFor(toRole, person.senior), teams: [ROLE_TEAM[toRole]] },
          by: "shalini",
        };
      case "level":
        return {
          kind: "person.changed",
          person: person.id,
          change: `Marked ${person.name} ${person.senior ? "junior" : "senior"}.`,
          reason: why,
          patch: { senior: !person.senior },
          by: "shalini",
        };
      case "access":
        if (scope !== "all" && scope.length === 0) return "Choose at least one project, or all projects.";
        return { kind: "access.given", personId: person.id, access: "finance", scope, reason: why, by: "shalini" };
      case "team":
        if (sites.length === 0) return "Choose at least one project.";
        return { kind: "member.added", team, personId: person.id, sites, by: "shalini" };
      case "head": {
        const p = head ? firm.project(head) : undefined;
        if (!p) return "Choose the project.";
        return { kind: "head.changed", projectId: p.id, from: p.team.head, to: person.id, reason: why, by: "shalini" };
      }
      case "active":
        return {
          kind: "person.changed",
          person: person.id,
          change: `${person.active ? "Deactivated" : "Reactivated"} ${person.name}.`,
          reason: why,
          patch: { active: !person.active },
          by: "shalini",
        };
      default:
        return "Choose a change first.";
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    const why = reason.trim();
    if (needsReason && !why) {
      setError("Write the reason. It is kept in the log.");
      return;
    }
    const next = eventOf(why);
    if (typeof next === "string") {
      setError(next);
      return;
    }
    setError("");
    pause.start({
      what: readBack(),
      commit: () => {
        demo.record(next);
        setAction(null);
        setReason("");
        onDone();
      },
    });
  };

  const pick = (id: Action) => {
    setAction(id);
    setError("");
  };

  return (
    <form
      onSubmit={submit}
      className="glass-inner grid gap-4 p-4"
      aria-label={`Change ${person.name}`}
    >
      {person.projects.length > 0 && (
        <ul aria-label="Projects" className="flex flex-wrap gap-1.5">
          {person.projects.map((p) => (
            <li key={p.id} className={`glass-chip ${p.head ? "chip-progress" : ""}`}>
              {p.head ? `Head, ${p.name}` : p.name}
            </li>
          ))}
        </ul>
      )}
      <ChipGroup label="What to change">
        {actions.map((a) => (
          <Chip key={a.id} pressed={action === a.id} onClick={() => pick(a.id)}>
            {a.label}
          </Chip>
        ))}
      </ChipGroup>

      {action === "role" && (
        <ChipGroup label="New role">
          {STAFF_ROLES.filter((r) => r !== role).map((r) => (
            <Chip key={r} pressed={toRole === r} onClick={() => setToRole(r)}>
              {ROLE_WORD[r]}
            </Chip>
          ))}
        </ChipGroup>
      )}

      {action === "access" && (
        <ChipGroup label="Finance access on">
          <Chip pressed={scope === "all"} onClick={() => setScope("all")}>
            All projects
          </Chip>
          {live.map((p) => (
            <Chip
              key={p.id}
              pressed={scope !== "all" && scope.includes(p.id)}
              onClick={() =>
                setScope(
                  scope === "all" ? [p.id] : scope.includes(p.id) ? scope.filter((x) => x !== p.id) : [...scope, p.id],
                )
              }
            >
              {p.name}
            </Chip>
          ))}
        </ChipGroup>
      )}

      {action === "team" && (
        <>
          <ChipGroup label="Team">
            {(["Studio", "Site", "Procurement"] as const).map((t) => (
              <Chip key={t} pressed={team === t} onClick={() => setTeam(t)}>
                {t}
              </Chip>
            ))}
          </ChipGroup>
          <ChipGroup label="Projects">
            {teamable.map((p) => (
              <Chip key={p.id} pressed={sites.includes(p.id)} onClick={() => toggleSite(p.id)}>
                {p.name}
              </Chip>
            ))}
          </ChipGroup>
        </>
      )}

      {action === "head" && (
        <ChipGroup label="Project Head of">
          {headable.map((p) => (
            <Chip key={p.id} pressed={head === p.id} onClick={() => setHead(p.id)}>
              {p.name}
            </Chip>
          ))}
        </ChipGroup>
      )}

      {action && (
        <>
          <p className="text-17">{readBack()}</p>
          {needsReason && (
            <Field label="Reason" error={error || undefined}>
              <input
                id={`${ids}-reason`}
                className={field}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError("");
                }}
              />
            </Field>
          )}
          {!needsReason && error && (
            <p className="text-15 font-semibold text-brick" role="alert">
              {error}
            </p>
          )}
          <div>
            <button
              type="submit"
              className="btn btn-primary min-h-12 w-full sm:w-auto"
              aria-disabled={pause.pending?.rowId === rowId ? true : undefined}
            >
              Record the change
            </button>
          </div>
        </>
      )}
    </form>
  );
}

/** "Add a person": name, email, role, senior or junior, then the invite they would be sent. */
function AddPerson({ onClose }: { onClose: () => void }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const ids = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole | null>(null);
  const [senior, setSenior] = useState<boolean | null>(null);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const close = () => {
    if (pause.pending?.what.startsWith("Add ")) pause.cancel();
    onClose();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    const found: Record<string, string> = {};
    const full = name.trim();
    if (full.split(/\s+/).length < 1 || !full) found.name = "Write their full name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) found.email = "Write an email address, such as name@poetry.example.com.";
    if (!role) found.role = "Choose a role.";
    if (senior === null) found.senior = "Choose senior or junior.";
    if (!reason.trim()) found.reason = "Write why they are joining. It is kept in the log.";
    setErrors(found);
    if (Object.keys(found).length > 0 || !role || senior === null) return;
    const slug = full
      .toLowerCase()
      .replace(/[^a-z]+/g, "-")
      .replace(/^-|-$/g, "");
    let id = `new-${slug}` as PersonId;
    for (let i = 2; firm.person(id); i++) id = `new-${slug}-${i}` as PersonId;
    const person: Person = {
      id,
      name: full,
      first: full.split(/\s+/)[0],
      role,
      title: titleFor(role, senior),
      senior,
      phone: "",
      email: email.trim(),
      teams: [ROLE_TEAM[role]],
      access: [],
      active: true,
    };
    pause.start({
      what: `Add ${full}`,
      commit: () => {
        demo.record({ kind: "person.added", person, change: `Added ${full}.`, reason: reason.trim(), by: "shalini" });
        onClose();
      },
    });
  };

  return (
    <section aria-label="Add a person" className="glass-strong p-4 sm:p-5">
      <h2 className="text-17 font-semibold">Add a person</h2>
      <form onSubmit={submit} className="mt-4 grid max-w-[44rem] gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" error={errors.name}>
            <input
              id={`${ids}-name`}
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              id={`${ids}-email`}
              type="email"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </Field>
        </div>
        <div>
          <ChipGroup label="Role">
            {STAFF_ROLES.map((r) => (
              <Chip key={r} pressed={role === r} onClick={() => setRole(r)}>
                {ROLE_WORD[r]}
              </Chip>
            ))}
          </ChipGroup>
          {errors.role && (
            <p className="mt-1.5 text-15 font-semibold text-brick" role="alert">
              {errors.role}
            </p>
          )}
        </div>
        <div>
          <ChipGroup label="Senior or junior">
            <Chip pressed={senior === true} onClick={() => setSenior(true)}>
              Senior
            </Chip>
            <Chip pressed={senior === false} onClick={() => setSenior(false)}>
              Junior
            </Chip>
          </ChipGroup>
          {errors.senior && (
            <p className="mt-1.5 text-15 font-semibold text-brick" role="alert">
              {errors.senior}
            </p>
          )}
        </div>
        <Field label="Why they are joining" error={errors.reason}>
          <input id={`${ids}-reason`} className={field} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <EmailPreview
          label="See the invite they will get"
          to={email.trim() || "their email address"}
          subject="Your Poetry Designs portal account"
          body={[
            `Hello ${name.trim().split(/\s+/)[0] || "there"},`,
            `Shalini Murthy has added you to the Poetry Designs portal as ${role ? titleFor(role, senior ?? false).toLowerCase() : "a member of staff"}.`,
            "Open the link in this email to set up your sign-in. The link works once and for a short time.",
          ]}
        />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn btn-glass min-h-12" aria-disabled={pause.pending ? true : undefined}>
            Add {name.trim().split(/\s+/)[0] || "them"}
          </button>
          <button type="button" className="btn btn-glass min-h-12" onClick={close}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
