/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { dated, Empty, IconArrow, Panel, StepDots } from "@/components/architect/glass-ui";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import { draftName } from "./bd-words";
import { STEP_NAMES, type StepNo } from "./draft-steps";

// Onboard: the workspaces being set up, with the four steps as dots, and the ones opened.

export function OnboardList() {
  const firm = useFirm();
  const drafts = firm.drafts.filter((d) => d.by === "rohan");
  const working = drafts.filter((d) => !d.opened && d.stepsDone > 0);
  const opened = drafts.filter((d) => d.opened);

  return (
    <>
      <StaffBoard
        place="Onboard"
        headline={working.length === 0 ? "Nothing in setup" : `${working.length} in setup`}
        primary={{ label: "New project", href: "/staff/bd/onboard/new" }}
        chip={false}
      />
      <div className="mt-6 grid items-start gap-4 lg:mt-8 min-[1200px]:grid-cols-2">
        <Panel title="Setting up">
          {working.length === 0 ? (
            <Empty>None</Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-1">
              {working.map((d) => (
                <li key={d.id}>
                  <Link href={`/staff/bd/onboard/${d.id}`} className="glass-row flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                    <span className="min-w-0 flex-[1_1_10rem]">
                      <span className="block truncate text-15 font-semibold text-ink">{draftName(d)}</span>
                      <span className="block text-13 text-ink-soft">
                        {d.nextStep ? `Next: ${STEP_NAMES[d.nextStep as StepNo]}` : "Ready to open"}
                      </span>
                    </span>
                    <StepDots done={d.stepsDone} label={`${d.stepsDone} of 4 steps`} />
                    <StatusChip tone={d.nextStep ? "progress" : "done"}>{`${d.stepsDone}/4`}</StatusChip>
                    <IconArrow className="text-ink-soft" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Opened">
          {opened.length === 0 ? (
            <Empty>None yet</Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-1">
              {opened.map((d) => (
                <li key={d.id}>
                  <Link href={`/staff/bd/onboard/${d.id}`} className="glass-row flex min-h-11 items-center gap-3 px-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-15 font-semibold text-ink">{draftName(d)}</span>
                      {d.projectId && <span className="figure block text-13 text-ink-soft">{firm.project(d.projectId)?.code}</span>}
                    </span>
                    {d.projectId && !firm.plan(d.projectId) ? (
                      <StatusChip tone="waiting">No plan</StatusChip>
                    ) : (
                      <StatusChip tone="done">{d.openedAt ? `Opened ${dated(d.openedAt)}` : "Opened"}</StatusChip>
                    )}
                    <IconArrow className="text-ink-soft" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
