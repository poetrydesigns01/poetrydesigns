"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { EmailPreview } from "@/components/register/email-preview";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { useDemo, useFirm, type NewEvent } from "@/lib/demo-store";
import type { Person, PersonId, ProjectId, StaffRole } from "@/lib/firm-data";
import { listWords } from "@/lib/format";
import { peopleOf, ROLE_GROUP, ROLE_TEAM, roleChangeWords, STAFF_ROLES, type PersonView } from "./admin-data";

// Everyone who uses the portal, grouped by role. Each staff row has one action, "Change",
// which opens the changes the admin can make: role, senior or junior, finance access, a
// project or team, Project Head of a project, and deactivation. Every change asks for a
// reason, waits five seconds, and is written to the log. People are never deleted.

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

/** One sentence about the person: title, projects, teams and access, no colon labels. */
function personSentence(person: PersonView): string {
  const heads = person.projects.filter((p) => p.head).map((p) => p.name);
  const others = person.projects.filter((p) => !p.head).map((p) => p.name);
  const parts = [person.title];
  if (person.role === "client") {
    if (others.length > 0) parts.push(`Client of ${listWords(others)}`);
  } else {
    if (heads.length > 0) parts.push(`Project Head of ${listWords(heads)}`);
    if (others.length > 0) parts.push(`${heads.length > 0 ? "Also on" : "On"} ${listWords(others)}`);
    if (person.onboarded > 0) parts.push(`Onboarded ${person.onboarded} projects`);
    if (person.projects.length === 0 && person.onboarded === 0) parts.push("On no project yet");
    if (person.teams.length > 0) parts.push(`${listWords(person.teams)} team`);
    if (person.access.includes("finance")) parts.push("Finance access");
  }
  return `${parts.join(". ")}.`;
}

export function PeoplePage() {
  const demo = useDemo();
  const firm = useFirm();
  const [adding, setAdding] = useState(false);
  const people = useMemo(() => peopleOf(firm, demo.events), [firm, demo.events]);
  const roles = ROLE_ORDER.filter((role) => people.some((p) => p.role === role));

  return (
    <>
      <StaffBoard
        place="People"
        headline={`${people.length} people in ${roles.length} roles.`}
        state="Deactivated people keep their place in the record. Nobody is deleted."
        primary={{ label: "Add a person", onClick: () => setAdding(true) }}
        chip={false}
      />
      {adding && <AddPerson onClose={() => setAdding(false)} />}
      <div className="mt-8 grid gap-12">
        {roles.map((role) => (
          <Register key={role} title={ROLE_GROUP[role]} limit={20}>
            {people
              .filter((p) => p.role === role)
              .map((p) => (
                <PersonRow key={p.id} person={p} />
              ))}
          </Register>
        ))}
      </div>
    </>
  );
}

function PersonRow({ person }: { person: PersonView }) {
  const [open, setOpen] = useState(false);
  const pause = usePause();
  const rowId = `person:${person.id}`;
  const staff = person.role !== "client";

  const close = () => {
    if (pause.pending?.rowId === rowId) pause.cancel();
    setOpen(false);
  };

  return (
    <RegisterRow
      id={rowId}
      margin={person.role === "client" ? "Client" : person.senior ? "Senior" : "Junior"}
      marginSub={person.active ? undefined : "Deactivated"}
      title={person.active ? person.name : <s>{person.name}</s>}
      sentence={personSentence(person)}
      stamps={person.stamps}
      action={
        staff ? (
          <button
            type="button"
            className="btn btn-quiet min-h-11"
            aria-expanded={open}
            onClick={() => (open ? close() : setOpen(true))}
          >
            {open ? "Close" : "Change"}
          </button>
        ) : undefined
      }
    >
      {open && staff && <PersonChanges person={person} rowId={rowId} pause={pause} onDone={() => setOpen(false)} />}
    </RegisterRow>
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
      className="mt-2 grid gap-5 border-l-2 border-sand py-2 pl-4"
      aria-label={`Change ${person.name}`}
    >
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
            <Field label="Reason" hint="Kept in the log beside the change." error={error || undefined}>
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
  const what = `${name.trim() || "The new person"}${role ? `, ${titleFor(role, senior ?? false).toLowerCase()}` : ""}`;

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
    <section aria-label="Add a person" className="mt-8 border-b border-sand pb-8">
      <h2 className="register-title">Add a person</h2>
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
        <p className="text-17">Add {what}.</p>
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="btn btn-quiet min-h-12" aria-disabled={pause.pending ? true : undefined}>
            Add {name.trim().split(/\s+/)[0] || "them"}
          </button>
          <button type="button" className="btn btn-quiet min-h-12" onClick={close}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
