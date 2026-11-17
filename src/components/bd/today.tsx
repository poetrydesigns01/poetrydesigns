/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  dated,
  Empty,
  IconArrow,
  IconCheck,
  IconSend,
  Panel,
  rowBtn,
  Stat,
  Stats,
  StepDots,
} from "@/components/architect/glass-ui";
import { useScope } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { TurnItem } from "@/lib/firm";
import { TODAY } from "@/lib/demo-data";
import { addDays, hours } from "@/lib/format";
import type { Tone } from "@/lib/portal";
import { STEP_NAMES, type StepNo } from "./draft-steps";
import { draftName, phaseChip, pipeline, THIS_MONTH } from "./bd-words";
import { BdTaskRow, bdTasksOf } from "./plan-panel";

// Rohan's Today: what needs him (drafts to finish, plans to generate, hours asked, invites
// not taken up), the month's count, the plan tasks the business team supports (sign-up,
// design brief, approvals) and the projects he onboarded.

function ResendInvite({ item, className }: { item: TurnItem; className: string }) {
  const demo = useDemo();
  const pause = usePause();
  const projectId = item.projectId;
  if (!projectId) return null;
  return (
    <button
      type="button"
      className={className}
      aria-disabled={pause.pending !== null}
      onClick={(event) => {
        if (pause.pending !== null) return;
        const { record } = demo;
        pause.start({
          what: `Invite for ${item.title}, sent again`,
          origin: event.currentTarget,
          commit: () => record({ kind: "invite.resent", projectId, by: "rohan" }),
        });
      }}
    >
      <IconSend /> Resend
    </button>
  );
}

export function BdToday() {
  const firm = useFirm();
  const demo = useDemo();
  const scope = useScope("bd");
  const turns = firm.turns("rohan", scope);
  const drafts = firm.drafts.filter((d) => d.by === "rohan");
  const working = drafts.filter((d) => !d.opened && d.stepsDone > 0);
  const projects = pipeline(firm.projects).filter((p) => scope === "all" || p.id === scope);
  const notSignedIn = projects.filter((p) => !p.clientSignedInOn).length;
  const asked = firm.creditRequests.filter((r) => r.open && (scope === "all" || r.projectId === scope));
  const onboarded = firm.onboardedIn(THIS_MONTH).length;
  const first = working[0];
  // Workspaces opened with no plan yet: onboarding ends with the plan.
  const soon = addDays(TODAY, 14);
  const unplanned = drafts.filter((d) => d.opened && d.projectId && !firm.plan(d.projectId));
  const bdTasks = projects
    .flatMap((p) => bdTasksOf(firm, p.id).map((task) => ({ ...task, project: p.name })))
    // Open, and started or starting within two weeks.
    .filter((x) => x.t.state !== "done" && x.t.plannedStart <= soon)
    .sort((a, b) => b.t.daysLate - a.t.daysLate || a.t.plannedStart.localeCompare(b.t.plannedStart));

  const n = turns.length + unplanned.length;
  const headline = n === 0 ? "All clear, Rohan" : `${n} ${n === 1 ? "needs" : "need"} you, Rohan`;

  const row = (item: TurnItem) => {
    const cls = rowBtn;
    let sub: ReactNode = null;
    let chip: { tone: Tone; words: string } | null = {
      tone: "waiting",
      words: item.margin,
    };
    let action: ReactNode = null;
    if (item.id.startsWith("draft:")) {
      const d = drafts.find((x) => `draft:${x.id}` === item.id);
      // The dots already say how far it is, so the row names the next step and has no chip.
      sub = d ? (
        <span className="flex items-center gap-2 text-13 text-ink-soft">
          <StepDots done={d.stepsDone} label={`${d.stepsDone} of 4 steps`} />
          {d.nextStep ? `Next: ${STEP_NAMES[d.nextStep as StepNo]}` : "Ready to open"}
        </span>
      ) : null;
      chip = null;
      action = (
        <Link href={item.href} className={cls}>
          Continue <IconArrow />
        </Link>
      );
    } else if (item.id.startsWith("invite:")) {
      sub = <span className="text-13 text-ink-soft">Invited · {item.margin}</span>;
      chip = { tone: "late", words: "Not signed in" };
      action = <ResendInvite item={item} className={cls} />;
    } else {
      const r = asked.find((x) => x.id === item.id);
      sub = <span className="text-13 text-ink-soft">{r ? firm.project(r.projectId)?.name : ""}</span>;
      chip = {
        tone: "waiting",
        words: r ? `${hours(r.hours)} asked` : item.margin,
      };
      action = (
        <Link
          href={`/staff/bd/hours#${item.id}`}
          className={cls}
          onClick={() => demo.setFocusRow({ href: "/staff/bd/hours", id: item.id })}
        >
          Add hours
        </Link>
      );
    }
    const title = item.id.startsWith("draft:") ? (drafts.find((x) => `draft:${x.id}` === item.id) ?? null) : null;
    return (
      // One layout for every row: the words and the chip at the left, the action at the right.
      <li key={item.id} className="glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5">
        <div className="grid min-w-0 justify-items-start gap-1">
          <p className="max-w-full truncate text-15 font-semibold text-ink">
            {title
              ? draftName(title)
              : item.id.startsWith("invite:")
                ? item.title
                : (asked.find((x) => x.id === item.id)?.by ?? item.title)}
          </p>
          {sub}
          {chip && <StatusChip tone={chip.tone}>{chip.words}</StatusChip>}
        </div>
        {action}
      </li>
    );
  };

  return (
    <>
      <StaffBoard
        place="Today"
        headline={headline}
        primary={
          first
            ? {
                label: `Continue ${draftName(first)}`,
                href: `/staff/bd/onboard/${first.id}`,
              }
            : { label: "New project", href: "/staff/bd/onboard/new" }
        }
      />
      <div className="mt-6 grid gap-4 lg:mt-8">
        <Stats label="At a glance">
          <Stat label="Setting up" value={working.length} href="/staff/bd/onboard" />
          <Stat label="Onboarded this month" value={onboarded} />
          <Stat label="Not signed in" value={notSignedIn} tone={notSignedIn > 0 ? "late" : undefined} />
          <Stat label="Hours asked" value={asked.length} href="/staff/bd/hours" />
        </Stats>

        <div className="grid items-start gap-4 min-[1200px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="grid min-w-0 gap-4">
            <Panel title="Needs you">
              {n === 0 ? (
                <Empty>
                  <span className="inline-flex items-center gap-2">
                    <IconCheck /> Nothing waiting
                  </span>
                </Empty>
              ) : (
                <ul className="grid grid-cols-1 gap-1">
                  {unplanned.map((d) => (
                    <li key={`plan:${d.id}`} className="glass-row flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                      <div className="grid min-w-0 flex-[1_1_12rem] gap-1">
                        <p className="truncate text-15 font-semibold text-ink">{draftName(d)}</p>
                        <span className="figure text-13 text-ink-soft">{d.projectId ? firm.project(d.projectId)?.code : ""}</span>
                      </div>
                      <StatusChip tone="waiting">No plan</StatusChip>
                      <Link href={`/staff/bd/onboard/${d.id}`} className={rowBtn}>
                        Plan <IconArrow />
                      </Link>
                    </li>
                  ))}
                  {turns.map(row)}
                </ul>
              )}
            </Panel>

            <Panel title="Business team">
              {bdTasks.length === 0 ? (
                <Empty>Nothing open</Empty>
              ) : (
                <ul className="grid grid-cols-1 gap-1">
                  {bdTasks.map((task) => (
                    <BdTaskRow key={task.t.id} task={task} project={task.project} />
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel
            title="Projects"
            aside={
              <Link href="/staff/bd/projects" className={rowBtn}>
                All <IconArrow />
              </Link>
            }
          >
            {projects.length === 0 ? (
              <Empty>None yet</Empty>
            ) : (
              <ul className="grid grid-cols-1 gap-1">
                {projects.slice(0, 6).map((p) => {
                  const chip = phaseChip(p);
                  return (
                    <li key={p.id}>
                      <Link href={`/staff/projects/${p.id}`} className="glass-row flex min-h-11 items-center gap-3 px-3 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-15 text-ink">{p.name}</span>
                          <span className="block text-13 text-ink-soft">{p.onboardedOn ? dated(p.onboardedOn) : "—"}</span>
                        </span>
                        <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
