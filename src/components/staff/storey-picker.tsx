"use client";

import { useId, useState, type ReactNode } from "react";
import { field } from "@/components/register/chips";
import type { ProjectView } from "@/lib/firm";
import { templateOf, type ProjectId } from "@/lib/firm-data";

// Which site and which stage a request is for. Both are filled in already (the site in
// view and the stage under way), so most days nobody touches this: the read-back sentence
// says them, and "Change" opens the two selects. The stages come from the project's own
// category template, so a farmhouse lists farmhouse stages.

export function StoreyPicker({
  sites,
  projectId,
  n,
  onProject,
  onMilestone,
  children,
}: {
  /** The sites this person works on. */
  sites: ProjectView[];
  projectId: ProjectId;
  n: number;
  onProject: (id: ProjectId) => void;
  onMilestone: (n: number) => void;
  /** The sentence that says the choice, set beside "Change". */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const ids = useId();
  const project = sites.find((p) => p.id === projectId) ?? sites[0];
  const stages = project ? templateOf(project.category).milestones : [];

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          className="link min-h-14 shrink-0 cursor-pointer px-2 text-17 font-semibold"
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Done" : "Change"}
        </button>
      </div>
      <div id={panel} hidden={!open} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-project`} className="block text-17 font-semibold">
            Site
          </label>
          <select
            id={`${ids}-project`}
            className={`${field} mt-1.5`}
            value={projectId}
            onChange={(event) => onProject(event.target.value as ProjectId)}
          >
            {sites.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}, {p.place}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${ids}-milestone`} className="block text-17 font-semibold">
            Milestone
          </label>
          <select
            id={`${ids}-milestone`}
            className={`${field} mt-1.5`}
            value={n}
            onChange={(event) => onMilestone(Number(event.target.value))}
          >
            {stages.map((m) => {
              const state = project?.milestones.find((x) => x.n === m.n)?.state;
              return (
                <option key={m.n} value={m.n}>
                  {m.n}. {m.name}
                  {state === "under-way" ? ", under way" : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </div>
  );
}
