/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { Icon } from "@/components/admin/glass-kit";
import { requestTitle } from "@/components/site/site-kit";
import { TODAY } from "@/lib/demo-data";
import { useFirm } from "@/lib/demo-store";
import type { Firm, RequestView } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { daysBetween, formatShortDate } from "@/lib/format";
import { MarkSeen } from "./mark-seen";
import { WaitingChip, requestChip, responseDays } from "./request-words";
import { requestTask, type RequestTask } from "./request-task";
import { ProjectLink } from "./rows";
import { procuresFor } from "./shared";

// Material requests grouped the way the sites work: by project, then by the milestone task
// the material is for. Each project shows how quickly procurement answers it (average days
// from the request to its first PO); each row how long it has waited, or how fast its PO went.

type Group = { task: RequestTask; rows: RequestView[] };
type ProjectGroup = { projectId: ProjectId; name: string; code: string; groups: Group[]; urgency: number };

const ROW =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 " +
  "md:grid-cols-[minmax(0,1fr)_6.5rem_9rem_9rem_8rem]";

export function groupRequests(rows: RequestView[], firm: Firm): ProjectGroup[] {
  const projects = new Map<ProjectId, ProjectGroup>();
  for (const r of rows) {
    const project = firm.project(r.projectId);
    let p = projects.get(r.projectId);
    if (!p) {
      p = { projectId: r.projectId, name: project?.name ?? r.projectName, code: project?.code ?? "", groups: [], urgency: 0 };
      projects.set(r.projectId, p);
    }
    const task = requestTask(r, firm);
    let g = p.groups.find((x) => x.task.key === task.key);
    if (!g) {
      g = { task, rows: [] };
      p.groups.push(g);
    }
    g.rows.push(r);
    p.urgency = Math.max(p.urgency, (r.late ? 1000 : 0) + r.days);
  }
  const list = [...projects.values()];
  for (const p of list) {
    p.groups.sort((a, b) => a.task.milestone - b.task.milestone || a.task.name.localeCompare(b.task.name));
    for (const g of p.groups) g.rows.sort((a, b) => b.days - a.days || a.no.localeCompare(b.no));
  }
  return list.sort((a, b) => b.urgency - a.urgency || a.name.localeCompare(b.name));
}

/** Average days from request to first PO over a project's answered requests. */
function speedOf(projectId: ProjectId, firm: Firm): { days: number; n: number } | null {
  const answered = firm.requests
    .filter((r) => r.projectId === projectId && !r.queued)
    .map(responseDays)
    .filter((d): d is number => d !== null);
  if (answered.length === 0) return null;
  return { days: answered.reduce((t, d) => t + d, 0) / answered.length, n: answered.length };
}

export function RequestGroups({ rows, person, empty }: { rows: RequestView[]; person: PersonId; empty: string }) {
  const firm = useFirm();
  const projects = groupRequests(rows, firm);
  const waiting = rows.some((r) => r.status !== "Delivered" && r.status !== "PO uploaded");
  if (projects.length === 0) {
    return (
      <section className="glass p-5">
        <p className="text-15 text-ink-soft">{empty}</p>
      </section>
    );
  }
  return (
    <div className="grid gap-4">
      {projects.map((p) => {
        const speed = speedOf(p.projectId, firm);
        return (
          <section key={p.projectId} aria-label={p.name} className="glass-strong min-w-0 p-3 sm:p-5">
            <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-1 pb-2">
              <span className="grid min-w-0">
                <ProjectLink id={p.projectId} name={p.name} className="justify-self-start text-17 font-semibold" />
                {p.code && <span className="text-13 tabular-nums text-ink-soft">{p.code}</span>}
              </span>
              {speed && (
                <span
                  className={`glass-chip tabular-nums ${speed.days >= 4 ? "chip-late" : speed.days >= 2 ? "chip-waiting" : "chip-done"}`}
                  title={`Average of ${speed.n}`}
                >
                  {speed.days.toFixed(1)} days to PO
                </span>
              )}
            </header>

            <div
              aria-hidden="true"
              className="lettering hidden gap-x-3 px-3 pb-1 text-ink-soft md:grid md:grid-cols-[minmax(0,1fr)_6.5rem_9rem_9rem_8rem]"
            >
              <span>Request</span>
              <span>Needed by</span>
              <span>{waiting ? "Waiting" : "Speed"}</span>
              <span>Status</span>
              <span />
            </div>

            <div className="grid gap-3">
              {p.groups.map((g) => (
                <div key={g.task.key} className="grid gap-0.5">
                  <h3 className="flex min-w-0 items-center gap-2 border-t border-ink/10 px-1 pb-0.5 pt-2.5">
                    {g.task.milestone > 0 && (
                      <span className="shrink-0 text-13 text-ink-soft">Milestone {g.task.milestone} ·</span>
                    )}
                    <span className="min-w-0 truncate text-15 font-semibold text-ink">{g.task.name}</span>
                  </h3>
                  <ul className="grid gap-0.5">
                    {g.rows.map((r) => (
                      <RequestRow key={r.no} r={r} person={person} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RequestRow({ r, person }: { r: RequestView; person: PersonId }) {
  const firm = useFirm();
  const more = r.lines.length > 1 ? ` +${r.lines.length - 1}` : "";
  const open = r.status !== "Delivered" && r.status !== "PO uploaded";
  const answered = responseDays(r);
  const left = daysBetween(TODAY, r.neededBy);
  return (
    <li className={`glass-row ${ROW}`}>
      <span className="grid min-w-0">
        <Link
          href={`/staff/finance/requests/${r.no}`}
          className="link -my-2 flex min-h-11 min-w-0 items-center justify-self-start text-15 font-semibold"
        >
          <span className="truncate">{requestTitle(r, firm)}</span>
        </Link>
        <span className="truncate text-13 text-ink-soft" title={`${r.lineWords[0]}${more}`}>
          {r.no}
        </span>
      </span>
      <span className="md:hidden">{requestChip(r, { late: false })}</span>

      <span className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 md:contents">
        <span className="grid text-15">
          <span className="sr-only">Needed by </span>
          <span>{formatShortDate(r.neededBy)}</span>
          {open && (
            <span className={`text-13 ${r.late || left < 0 ? "late-text" : "text-ink-soft"}`}>
              {left < 0 ? `${-left} days late` : left === 0 ? "Today" : `in ${left} days`}
            </span>
          )}
        </span>
        <span>
          {open ? (
            <WaitingChip r={r} />
          ) : answered !== null ? (
            <span className={`glass-chip ${answered >= 4 ? "chip-late" : answered >= 2 ? "chip-waiting" : "chip-done"}`}>
              PO in {answered === 0 ? "a day" : `${answered} ${answered === 1 ? "day" : "days"}`}
            </span>
          ) : (
            <span className="text-13 text-ink-soft">–</span>
          )}
        </span>
        <span className="hidden md:block">{requestChip(r, { late: false })}</span>
      </span>

      {r.status === "New" && procuresFor(person, firm.project(r.projectId)) ? (
        <span className="col-span-2 flex md:col-span-1 md:justify-end">
          <MarkSeen no={r.no} person={person} className="min-h-11 w-full whitespace-nowrap px-4 text-15 md:w-auto" />
        </span>
      ) : (
        <span className="hidden md:flex md:justify-end">
          <Link
            href={`/staff/finance/requests/${r.no}`}
            className="btn btn-glass min-h-11 w-full gap-1.5 whitespace-nowrap px-4 text-15 md:w-auto"
            aria-label={`Open ${r.no}`}
          >
            Open <Icon name="arrow" />
          </Link>
        </span>
      )}
    </li>
  );
}
