/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { fitFacts } from "@/components/project/team";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import type { TaskView } from "@/lib/firm";
import { performance, WEEK, type PersonId } from "@/lib/firm-data";
import { datePart } from "@/lib/format";
import { AssignForm } from "./assign-form";
import { ProjectRow } from "./project-row";
import { isOpen, juniorsOf, taskChip, taskRank, useArchitect } from "./common";
import { dayTime, Empty, IconArrow, Panel, rowBtn } from "./glass-ui";
import { ReviewPanel } from "./review-panel";

// A senior architect's team, to watch each person: assign a task, the juniors' tasks as one
// table with reviews answered in their rows, how each junior has done over 90 days and where
// they are strong, and the projects this head runs. Juniors are put on a project, or invited,
// from that project's Team tab.

const KIND_WORDS = { "city-villa": "city villa", farmhouse: "farmhouse", eco: "eco home", "cement-blocks": "block home" } as const;

const COLS = "md:grid md:grid-cols-[minmax(0,1fr)_6rem_8.5rem_7.5rem_6.5rem]";

export function ArchitectTeam() {
  const firm = useFirm();
  const pause = usePause();
  const me = useArchitect();
  const [assigning, setAssigning] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [who, setWho] = useState<PersonId | "all">("all");

  if (!me.senior) {
    return (
      <>
        <StaffBoard place="Team" headline="For senior architects" chip={false} />
        <div className="glass mt-6 p-4">
          <Link href="/staff/architect" className="btn btn-glass min-h-11 gap-1.5 px-4 text-15">
            Today <IconArrow />
          </Link>
        </div>
      </>
    );
  }

  const juniors = juniorsOf(firm, me.id);
  const strengthWords = (person: PersonId) => {
    const s = firm.architectStrengths(person);
    const kinds = Object.entries(s.categories)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([id, n]) => `${n} ${KIND_WORDS[id as keyof typeof KIND_WORDS] ?? id}${n === 1 ? "" : "s"}`);
    return [...kinds, ...fitFacts(s).slice(0, 1)].join(" · ");
  };
  const juniorIds = new Set(juniors.map((p) => p.id));
  const inScope = (t: TaskView) => me.scope === "all" || t.projectId === me.scope;
  // His juniors' tasks, and any task he set someone else (a site check, say), so every hand-in
  // he reviews is here.
  const tasks = firm.tasks
    .filter((t) => t.kind === "work" && (juniorIds.has(t.person) || t.assignedBy === me.id) && inScope(t) && (who === "all" || t.person === who))
    .filter((t) => t.status !== "accepted" || (t.acceptedAt && datePart(t.acceptedAt) >= WEEK.from))
    .sort((a, b) => taskRank(a) - taskRank(b) || (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  const inReview = tasks.filter((t) => t.status === "submitted").length;
  const late = tasks.filter((t) => isOpen(t) && t.overdue).length;

  const headed = firm.projects.filter(
    (p) => p.phase !== "draft" && p.phase !== "handed-over" && p.team.head === me.id && (me.scope === "all" || p.id === me.scope),
  );

  return (
    <>
      <StaffBoard
        place="Team"
        headline="Your team"
        primary={assigning ? undefined : { label: "Assign a task", onClick: () => setAssigning(true) }}
      />

      <div className="mt-6 grid gap-4 lg:mt-8">
        {assigning && (
          <Panel
            title="Assign a task"
            strong
            aside={
              <button
                type="button"
                className={rowBtn}
                onClick={() => {
                  if (pause.pending !== null) pause.cancel();
                  setAssigning(false);
                }}
              >
                Close
              </button>
            }
          >
            <div className="px-1 pb-1">
              <AssignForm from={me.id} juniors={juniors.map((p) => p.id)} onDone={() => setAssigning(false)} />
            </div>
          </Panel>
        )}

        <Panel
          title="Team tasks"
          aside={
            <>
              {late > 0 && <StatusChip tone="late">{late} overdue</StatusChip>}
              {inReview > 0 && <StatusChip tone="waiting">{inReview} in review</StatusChip>}
            </>
          }
        >
          <div className="flex flex-wrap gap-2 px-1 pb-3" role="group" aria-label="Show">
            {[{ id: "all" as const, name: "All" }, ...juniors.map((p) => ({ id: p.id, name: p.first }))].map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={who === p.id}
                className="chip min-h-11 px-4"
                onClick={() => setWho(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div aria-hidden="true" className={`lettering hidden gap-x-3 px-3 pb-1 text-ink-soft ${COLS}`}>
            <span>Task</span>
            <span>Who</span>
            <span>Due</span>
            <span>Status</span>
            <span className="w-24" />
          </div>
          {tasks.length === 0 ? (
            <Empty>No tasks</Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-1">
              {tasks.map((t) => {
                const chip = taskChip(t);
                const canReview = t.status === "submitted" && t.assignedBy === me.id;
                const expanded = review === t.id;
                return (
                  <li key={t.id} className="glass-row px-3 py-2.5">
                    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${COLS} md:items-center`}>
                      <div className="min-w-0 basis-full md:basis-auto">
                        <p className="truncate text-15 font-semibold text-ink">{t.title}</p>
                        <p className="-my-3 truncate py-3 text-13 text-ink-soft">
                          <Link href={`/staff/projects/${t.projectId}`} className="link -my-3 inline-flex min-h-11 items-center">
                            {t.projectName}
                          </Link>
                        </p>
                      </div>
                      <span className="text-15 text-ink">{t.personName.split(" ")[0]}</span>
                      <span className="text-13 text-ink">{t.dueAt ? dayTime(t.dueAt) : "—"}</span>
                      <span>
                        <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
                      </span>
                      <span className="ml-auto flex justify-end md:ml-0">
                        {canReview && (
                          <button
                            type="button"
                            className={rowBtn}
                            aria-expanded={expanded}
                            onClick={() => {
                              if (expanded && pause.pending !== null) pause.cancel();
                              setReview(expanded ? null : t.id);
                            }}
                          >
                            {expanded ? "Close" : "Review"}
                          </button>
                        )}
                      </span>
                    </div>
                    {expanded && <ReviewPanel task={t} by={me.id} onDone={() => setReview(null)} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="grid items-start gap-4 min-[1200px]:grid-cols-2">
          <Panel title="Last 90 days">
            <ul className="grid grid-cols-1 gap-2">
              {performance
                .filter((row) => juniorIds.has(row.person))
                .map((row) => (
                  <li key={row.person} className="glass-inner grid gap-2 p-3">
                    <p className="grid gap-0.5">
                      <span className="text-15 font-semibold text-ink">{firm.person(row.person)?.name}</span>
                      <span className="text-13 text-ink-soft">{strengthWords(row.person)}</span>
                    </p>
                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ["Tasks", String(row.tasks)],
                        ["On time", `${row.onTimePercent}%`],
                        ["Late", String(row.late)],
                        ["Revisions", row.avgRevisions.toFixed(1)],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="lettering text-ink-soft">{label}</dt>
                          <dd className={`figure text-22 ${label === "Late" && row.late > 0 ? "text-brick" : "text-ink"}`}>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
            </ul>
          </Panel>

          <Panel title="Project teams">
            {headed.length === 0 ? (
              <Empty>No projects</Empty>
            ) : (
              <ul className="grid grid-cols-1 gap-1">
                {headed.map((p) => {
                  const team = firm.architectTeam(p.id);
                  const invited = team.members.filter((m) => m.state === "invited").length;
                  const names = team.members
                    .filter((m) => m.state === "assigned")
                    .map((m) => firm.person(m.personId)?.first ?? m.personId);
                  return (
                    <li key={p.id}>
                      <ProjectRow project={p} href={`/staff/projects/${p.id}/team`}>
                        <span className="text-13 text-ink-soft">{names.length > 0 ? names.join(" · ") : "No juniors"}</span>
                        {invited > 0 && <StatusChip tone="waiting">{`${invited} invited`}</StatusChip>}
                      </ProjectRow>
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
