"use client";

import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { ProgrammeStrip } from "@/components/instruments/programme-strip";
import { useDemo, useFirm, type DemoState } from "@/lib/demo-store";
import type { Firm, ProjectView } from "@/lib/firm";
import type { PersonId, ProjectId, StaffRole } from "@/lib/firm-data";

// The project chip in the board. It filters the registers, the counts and the board picture
// to one project, or shows them all. A site engineer always looks at one site at a time.

/** The person a role is being viewed as. BD is always Rohan and admin always Shalini. */
export function viewerIdOf(role: StaffRole, viewers: DemoState["viewers"]): PersonId {
  if (role === "bd") return "rohan";
  if (role === "admin") return "shalini";
  return viewers[role];
}

/** The projects a person works on, in the order the firm lists them. */
export function projectsFor(role: StaffRole, person: PersonId, firm: Firm): ProjectView[] {
  const open = firm.projects.filter((p) => p.phase !== "draft");
  if (role === "site") return open.filter((p) => p.team.engineers.includes(person));
  if (role === "architect") return open.filter((p) => p.team.head === person || p.team.architects.includes(person));
  return open;
}

/**
 * What the registers are filtered to. A site engineer defaults to his first site and has no
 * "all"; everyone else defaults to all. A scope left over from another person falls back.
 */
export function scopeFor(
  role: StaffRole,
  person: PersonId,
  scope: DemoState["scope"],
  firm: Firm,
): ProjectId | "all" {
  const mine = projectsFor(role, person, firm);
  const chosen = scope[role];
  if (role === "site") {
    return mine.some((p) => p.id === chosen) ? (chosen as ProjectId) : (mine[0]?.id ?? "iyer");
  }
  if (!chosen || chosen === "all") return "all";
  return mine.some((p) => p.id === chosen) ? chosen : "all";
}

/** The scope for a role as the current viewer sees it, for screens and the shell. */
export function useScope(role: StaffRole): ProjectId | "all" {
  const demo = useDemo();
  const firm = useFirm();
  return scopeFor(role, viewerIdOf(role, demo.viewers), demo.scope, firm);
}

export function ProjectSwitch({ role }: { role: StaffRole }) {
  const demo = useDemo();
  const firm = useFirm();
  const ref = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const person = viewerIdOf(role, demo.viewers);
  const mine = projectsFor(role, person, firm);
  const scope = scopeFor(role, person, demo.scope, firm);
  const current = scope === "all" ? null : (mine.find((p) => p.id === scope) ?? null);
  const allWords = role === "architect" ? "All my projects" : "All projects";

  // A menu is a passing thing: it is closed when this screen is hidden.
  useLayoutEffect(() => {
    const details = ref.current;
    return () => {
      if (details) details.open = false;
    };
  }, []);

  const close = (focus: boolean) => {
    if (ref.current) ref.current.open = false;
    if (focus) summaryRef.current?.focus();
  };

  const choose = (id: ProjectId | "all") => {
    demo.setScope(role, id);
    close(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDetailsElement>) => {
    if (event.key === "Escape" && ref.current?.open) {
      event.stopPropagation();
      close(true);
    }
  };

  const label = current ? current.name : `${allWords} (${mine.length})`;
  const short = current ? current.name : `All (${mine.length})`;

  return (
    <details ref={ref} className="min-w-0 max-lg:static lg:relative" onKeyDown={onKeyDown}>
      <summary
        ref={summaryRef}
        className="btn btn-quiet min-h-11 min-w-0 max-w-full cursor-pointer list-none gap-3 px-3 text-15 font-semibold max-[399px]:px-2! max-[359px]:px-1.5! max-[389px]:text-15! lg:min-h-12 lg:px-4 [&::-webkit-details-marker]:hidden"
        aria-label={`Projects: ${label}. Change`}
      >
        {current && (
          <span aria-hidden="true" className="hidden sm:block">
            <ProgrammeStrip cells={current.strip} size={40} tone="dark" label={current.stageWords} />
          </span>
        )}
        <span className="min-w-0 truncate lg:hidden">{short}</span>
        <span className="hidden min-w-0 truncate lg:inline">{label}</span>
      </summary>
      <div className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-32px))] border border-ink bg-paper p-2 text-ink">
        <p className="lettering px-2 pb-1 pt-1 text-ink-soft">Show the registers for</p>
        <ul className="grid">
          {role !== "site" && (
            <li>
              <button
                type="button"
                aria-pressed={scope === "all"}
                onClick={() => choose("all")}
                className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 px-2 text-left text-17 hover:bg-sand-2 aria-pressed:bg-sand-2 aria-pressed:font-semibold aria-pressed:shadow-[inset_3px_0_0_var(--color-rosewood)]"
              >
                <span>{allWords}</span>
                <span className="lettering text-ink-soft">{mine.length}</span>
              </button>
            </li>
          )}
          {mine.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={scope === p.id}
                onClick={() => choose(p.id)}
                className="grid min-h-12 w-full cursor-pointer grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 px-2 py-1.5 text-left hover:bg-sand-2 aria-pressed:bg-sand-2 aria-pressed:font-semibold aria-pressed:shadow-[inset_3px_0_0_var(--color-rosewood)]"
              >
                <span aria-hidden="true">
                  <ProgrammeStrip cells={p.strip} size={40} label={p.stageWords} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-17">{p.name}</span>
                  <span className="lettering block font-normal text-ink-soft">{p.stageWords}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
