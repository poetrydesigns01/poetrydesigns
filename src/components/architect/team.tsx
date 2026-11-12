"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { TaskCourse } from "@/components/instruments/task-course";
import { Chip, ChipGroup } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { AssignLine } from "@/components/tasks/assign-line";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { StampView, TaskView } from "@/lib/firm";
import { courses, performance, templates, TEAM_FINDING, WEEK, type Person, type PersonId, type ProjectId } from "@/lib/firm-data";
import { datePart, listWords } from "@/lib/format";
import { isOpen, juniorsOf, useArchitect } from "./common";
import { ReviewPanel } from "./review-panel";

// A senior architect's team: one line to give a junior a task, every junior's work that is
// due, late or in for review, how each junior has done over the last 90 days, and who is on
// each project. Juniors are told this page is for seniors.

function lowerFirst(text: string): string {
  // "PDF drawing" and "CR-2026-007" keep their capitals.
  if (/^[A-Z]{2}/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

const CATEGORY_NAME = Object.fromEntries(templates.map((t) => [t.id, t.name])) as Record<string, string>;

/** A titled group inside a lane: "Late", with its rows. */
function Group({ title, children }: { title: string; children: ReactNode[] }) {
  if (children.length === 0) return null;
  return (
    <div>
      <h4 className="lettering pt-3 text-ink-soft">{title}</h4>
      <ul>{children}</ul>
    </div>
  );
}

export function ArchitectTeam() {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const me = useArchitect();
  const [assigning, setAssigning] = useState(false);
  const [panel, setPanel] = useState<string | null>(null);
  const [adding, setAdding] = useState<ProjectId | null>(null);
  const [addWho, setAddWho] = useState<PersonId | null>(null);

  if (!me.senior) {
    return (
      <>
        <StaffBoard place="Team" headline="This page is for senior architects." chip={false} />
        <p className="mt-8 text-17">
          <Link href="/staff/architect" className="link inline-flex min-h-11 items-center">
            Back to your desk
          </Link>
        </p>
      </>
    );
  }

  const juniors = juniorsOf(firm, me.id);
  const names = listWords(juniors.map((p) => p.name));
  const inScope = (t: TaskView) => me.scope === "all" || t.projectId === me.scope;

  const closeRow = (rowId: string) => {
    if (pause.pending !== null && pause.pending.rowId === rowId) pause.cancel();
    setPanel(null);
  };

  const taskRow = (t: TaskView) => {
    const rowId = `task:${t.id}`;
    const open = panel === rowId;
    const reviewer = t.assignedBy === me.id;
    const inReview = t.status === "submitted";
    const by = firm.person(t.assignedBy)?.first ?? t.assignedByName;
    const margin = inReview ? t.statusWords : t.status === "accepted" ? "Accepted" : (t.due ?? t.statusWords);
    return (
      <RegisterRow
        key={t.id}
        id={rowId}
        margin={margin}
        overdue={t.overdue}
        title={
          <>
            {t.title},{" "}
            <Link href={`/staff/projects/${t.projectId}`} className="link -my-3 inline-flex min-h-11 items-center font-normal">
              {t.projectName}
            </Link>
          </>
        }
        sentence={`${t.deliverable}.${t.status === "revision" ? " Sent back, being redone." : ""}${
          reviewer ? "" : ` ${by} reviews it.`
        }`}
        stamps={firm.stampsFor(rowId).filter((stamp) => stamp.words !== "Assigned" || datePart(stamp.at) === TODAY)}
        action={
          inReview && reviewer ? (
            <button
              type="button"
              className="btn btn-quiet"
              aria-expanded={open}
              onClick={() => (open ? closeRow(rowId) : setPanel(rowId))}
            >
              {open ? "Close" : "Accept or send back"}
            </button>
          ) : undefined
        }
      >
        {open && <ReviewPanel task={t} by={me.id} onDone={() => setPanel(null)} />}
      </RegisterRow>
    );
  };

  const lane = (junior: Person) => {
    const theirs = firm.tasks.filter((t) => t.kind === "work" && t.person === junior.id && inScope(t));
    const late = theirs.filter((t) => isOpen(t) && t.overdue);
    const due = theirs
      .filter((t) => isOpen(t) && !t.overdue)
      .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
    const review = theirs.filter((t) => t.status === "submitted");
    const accepted = theirs.filter(
      (t) => t.status === "accepted" && t.acceptedAt && datePart(t.acceptedAt) >= WEEK.from && datePart(t.acceptedAt) <= WEEK.to,
    );
    const none = late.length + due.length + review.length + accepted.length === 0;
    return (
      <div key={junior.id} className="min-w-0">
        <h3 className="pt-4 text-17 font-semibold">{junior.name}</h3>
        {none && <p className="py-3 text-15 text-ink-soft">Nothing open.</p>}
        <Group title="Late">{late.map(taskRow)}</Group>
        <Group title="Due">{due.map(taskRow)}</Group>
        <Group title="In for review">{review.map(taskRow)}</Group>
        <Group title="Accepted this week">{accepted.map(taskRow)}</Group>
      </div>
    );
  };

  // ---- Team on your projects ----
  const headed = firm.projects.filter((p) => p.phase !== "draft" && p.phase !== "handed-over" && p.team.head === me.id && (me.scope === "all" || p.id === me.scope));
  const memberStamps = (projectId: ProjectId): StampView[] =>
    demo.events
      .filter((e) => e.kind === "member.added" && e.team === "Studio" && e.sites.includes(projectId))
      .map((e) => {
        const added = e.kind === "member.added" ? e.personId : me.id;
        return {
          words: `${firm.person(added)?.name ?? added} added`,
          at: e.at,
          by: e.by,
          carbon: { to: [added], href: "/staff/architect", rowId: `team:${projectId}` },
        };
      })
      .reverse();

  const addMember = (projectId: ProjectId, origin: HTMLElement) => {
    if (pause.pending !== null || !addWho) return;
    const personId = addWho;
    const { record } = demo;
    const by = me.id;
    pause.start({
      what: `${firm.person(personId)?.name ?? personId} added to ${firm.project(projectId)?.name ?? projectId}`,
      origin,
      commit: () => {
        record({ kind: "member.added", team: "Studio", personId, sites: [projectId], by });
        setAdding(null);
        setAddWho(null);
      },
    });
  };

  return (
    <>
      <StaffBoard
        place="Team"
        headline={`Your team: ${names}.`}
        state={TEAM_FINDING}
        primary={assigning ? undefined : { label: "Assign a task", onClick: () => setAssigning(true) }}
      />

      <div className="mt-8 grid gap-12">
        {assigning && (
          <section aria-label="Assign a task" className="grid gap-3">
            <div className="flex items-center justify-between gap-4 border-b border-ink pb-2">
              <h2 className="text-17 font-semibold lg:text-22">Assign a task</h2>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  if (pause.pending !== null && pause.pending.rowId === null) pause.cancel();
                  setAssigning(false);
                }}
              >
                Close
              </button>
            </div>
            <div className="max-w-[48rem]">
              <AssignLine from={me.id} juniors={juniors.map((p) => p.id)} />
            </div>
          </section>
        )}

        <section className="register" aria-label="Due and late">
          <h2 className="register-title">Due and late</h2>
          <div className="grid gap-x-8 min-[1200px]:grid-cols-2">{juniors.map(lane)}</div>
        </section>

        <section className="register" aria-label="How each junior is doing, last 90 days">
          <h2 className="register-title">How each junior is doing, last 90 days</h2>
          <ul className="sheet-rows ruled mt-5">
            {performance
              .filter((row) => juniors.some((p) => p.id === row.person))
              .map((row) => {
                const person = firm.person(row.person);
                const blocks = (courses[row.person] ?? []).map((b) => ({ title: b.title, late: b.lateDays, revisions: b.revisions }));
                return (
                  <li key={row.person} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-8">
                    <div className="grid content-start gap-2">
                      <h3 className="text-17 font-semibold">{person?.name}</h3>
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-15 sm:grid-cols-3">
                        <div>
                          <dt className="text-ink-soft">Tasks</dt>
                          <dd className="figure text-17">{row.tasks}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-soft">On time</dt>
                          <dd className="figure text-17">
                            {row.onTime} of {row.tasks}, {row.onTimePercent}%
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-soft">Late</dt>
                          <dd className="figure text-17">{row.late}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-soft">Revisions per task</dt>
                          <dd className="figure text-17">{row.avgRevisions.toFixed(1)}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-soft">Days per task</dt>
                          <dd className="figure text-17">{row.avgDays.toFixed(1)}</dd>
                        </div>
                      </dl>
                      <ul className="grid gap-0.5 text-15">
                        {row.byCategory.map((c) => (
                          <li key={c.category}>
                            {CATEGORY_NAME[c.category] ?? c.category}: {lowerFirst(c.words)}.
                          </li>
                        ))}
                      </ul>
                    </div>
                    {blocks.length > 0 && (
                      <div className="min-w-0">
                        <TaskCourse tasks={blocks} label="Last 30 days" width={280} />
                      </div>
                    )}
                  </li>
                );
              })}
          </ul>
          <p className="mt-4 text-15 text-ink-soft">Only you and admin see this.</p>
        </section>

        <section className="register" aria-label="Team on your projects">
          <h2 className="register-title">Team on your projects</h2>
          <ul>
            {headed.map((p) => {
              const rowId = `team:${p.id}`;
              const studio = p.team.architects.map((id) => firm.person(id)?.name ?? id);
              const free = juniors.filter((j) => !p.team.architects.includes(j.id));
              const open = adding === p.id;
              return (
                <RegisterRow
                  key={p.id}
                  id={rowId}
                  margin={p.stageWords}
                  title={
                    <Link href={`/staff/projects/${p.id}`} className="link -my-3 inline-flex min-h-11 items-center">
                      {p.name}
                    </Link>
                  }
                  sentence={
                    studio.length > 0
                      ? `${listWords(studio)} ${studio.length === 1 ? "draws" : "draw"} for it with you.`
                      : "No junior is on it yet."
                  }
                  stamps={memberStamps(p.id)}
                  action={
                    free.length > 0 ? (
                      <button
                        type="button"
                        className="btn btn-quiet"
                        aria-expanded={open}
                        onClick={() => {
                          if (open) {
                            if (pause.pending !== null && pause.pending.rowId === rowId) pause.cancel();
                            setAdding(null);
                          } else {
                            setAdding(p.id);
                            setAddWho(free[0]?.id ?? null);
                          }
                        }}
                      >
                        {open ? "Close" : "Add a junior"}
                      </button>
                    ) : undefined
                  }
                >
                  {open && (
                    <div className="grid gap-4 pt-2">
                      <ChipGroup label="Who joins the project">
                        {free.map((j) => (
                          <Chip key={j.id} pressed={addWho === j.id} onClick={() => setAddWho(j.id)}>
                            {j.name}
                          </Chip>
                        ))}
                      </ChipGroup>
                      <div>
                        <button
                          type="button"
                          className="btn btn-quiet"
                          aria-disabled={pause.pending !== null}
                          onClick={(event) => addMember(p.id, event.currentTarget)}
                        >
                          Add {firm.person(addWho ?? free[0].id)?.first} to {p.name}
                        </button>
                      </div>
                    </div>
                  )}
                </RegisterRow>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
