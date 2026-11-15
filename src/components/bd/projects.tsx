"use client";

import Link from "next/link";
import { dated, Empty, IconArrow, Panel, Stat, Stats } from "@/components/architect/glass-ui";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import { phaseChip, pipeline, THIS_MONTH } from "./bd-words";

// Every project Rohan onboarded, newest first: its code, when, whether the client has
// signed in, the plan's week and where it stands. Each row opens its project record.

const COLS = "md:grid md:grid-cols-[minmax(0,1fr)_7rem_8.5rem_4rem_9rem_1.25rem]";

export function BdProjects() {
  const firm = useFirm();
  const projects = pipeline(firm.projects);
  const thisMonth = projects.filter((p) => (p.onboardedOn ?? "").startsWith(THIS_MONTH)).length;
  const signedIn = projects.filter((p) => p.clientSignedInOn).length;
  const building = projects.filter((p) => p.phase === "building").length;

  return (
    <>
      <StaffBoard
        place="Projects"
        headline={`${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
        chip={false}
      />
      <div className="mt-6 grid gap-4 lg:mt-8">
        <Stats label="Pipeline" cols={3}>
          <Stat label="This month" value={thisMonth} />
          <Stat label="Signed in" value={`${signedIn}/${projects.length}`} />
          <Stat label="Building" value={building} />
        </Stats>

        <Panel title="Onboarded">
          <div aria-hidden="true" className={`lettering hidden gap-x-3 px-3 pb-1 text-ink-soft ${COLS}`}>
            <span>Project</span>
            <span>Onboarded</span>
            <span>Client</span>
            <span>Week</span>
            <span>Stage</span>
            <span />
          </div>
          {projects.length === 0 ? (
            <Empty>None yet</Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-1">
              {projects.map((p) => {
                const chip = phaseChip(p);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/staff/projects/${p.id}`}
                      className={`glass-row flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 ${COLS} md:items-center`}
                    >
                      <span className="min-w-0 basis-full md:basis-auto">
                        <span className="block truncate text-15 font-semibold text-ink">{p.name}</span>
                        <span className="block truncate text-13 text-ink-soft">
                          <span className="figure text-ink">{p.code || "—"}</span> · {p.clients.join(", ")}
                        </span>
                      </span>
                      <span className="text-13 text-ink">{p.onboardedOn ? dated(p.onboardedOn) : "—"}</span>
                      <span>
                        <StatusChip tone={p.clientSignedInOn ? "done" : "late"}>
                          {p.clientSignedInOn ? "Signed in" : "Not signed in"}
                        </StatusChip>
                      </span>
                      <span className="figure text-13 text-ink">
                        {!p.plan || p.phase === "handed-over" ? "—" : p.plan.todayWeek >= 1 ? `W${p.plan.todayWeek}` : `P${p.plan.todayPreWeek}`}
                      </span>
                      <span>
                        <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
                      </span>
                      <IconArrow className="ml-auto text-ink-soft md:ml-0" />
                    </Link>
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
