/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useState } from "react";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import { courses, performance, templateOf, type PerformanceRow } from "@/lib/firm-data";
import { daysBetween, formatShortDate, listWords } from "@/lib/format";
import { GlassTable, Initials, Meter, Panel, Segments, StatCard, StatRow } from "./glass-kit";

// How the juniors are doing over the last 90 days: tasks, on time, late, revisions and days
// taken, in one table; then the recent tasks of each junior who had any, late ones in brick.

type Key = "tasks" | "onTimePercent" | "late" | "avgRevisions";

const SORTS: { id: Key; label: string }[] = [
  { id: "tasks", label: "Tasks" },
  { id: "onTimePercent", label: "On time" },
  { id: "late", label: "Late" },
  { id: "avgRevisions", label: "Revisions" },
];

export function PerformancePage() {
  const firm = useFirm();
  const [sort, setSort] = useState<Key>("tasks");
  const rows = [...performance].sort((a, b) => b[sort] - a[sort]);
  const tasks = performance.reduce((t, r) => t + r.tasks, 0);
  const onTime = performance.reduce((t, r) => t + r.onTime, 0);
  const late = performance.reduce((t, r) => t + r.late, 0);
  const revisions = tasks > 0 ? performance.reduce((t, r) => t + r.avgRevisions * r.tasks, 0) / tasks : 0;
  const name = (row: PerformanceRow) => firm.person(row.person)?.name ?? row.person;
  const kinds = (row: PerformanceRow) => row.byCategory.map((c) => templateOf(c.category).name).join(" · ");
  // A line every junior shares says nothing about any one of them, so it is left off then.
  const kindsDiffer = new Set(performance.map(kinds)).size > 1;
  const busy = rows.filter((row) => (courses[row.person] ?? []).length > 0);
  const idle = rows.filter((row) => (courses[row.person] ?? []).length === 0);

  return (
    <>
      <StaffBoard place="Performance" headline="Juniors, last 90 days" chip={false} />
      <div className="mt-6 grid gap-5">
        <StatRow cols={4} label="All juniors">
          <StatCard label="Tasks" value={tasks} icon="check" />
          <StatCard label="On time" value={`${tasks > 0 ? Math.round((onTime / tasks) * 100) : 0}%`} icon="clock" />
          <StatCard label="Late" value={late} icon="alert" tone={late > 0 ? "late" : undefined} />
          <StatCard label="Revisions" value={revisions.toFixed(1)} sub="Average per task" icon="file" />
        </StatRow>

        <Panel title="By junior" aside={<Segments<Key> label="Sort" value={sort} onChange={setSort} options={SORTS} />} strong>
          <GlassTable<PerformanceRow>
            caption="Juniors, last 90 days"
            rows={rows}
            rowKey={(r) => r.person}
            wide="lg"
            lead={(r) => (
              <span className="flex items-center gap-2">
                <Initials name={name(r)} />
                {name(r)}
              </span>
            )}
            chip={(r) => <span className="figure text-15">{r.onTimePercent}%</span>}
            columns={[
              {
                label: "Junior",
                cell: (r) => (
                  <span className="flex items-center gap-2">
                    <Initials name={name(r)} />
                    <span className="grid">
                      <span>{name(r)}</span>
                      {kindsDiffer && <span className="text-13 font-normal text-ink-soft">{kinds(r)}</span>}
                    </span>
                  </span>
                ),
              },
              { label: "Tasks", align: "right", width: "w-20", cell: (r) => <span className="figure">{r.tasks}</span> },
              {
                label: "On time",
                width: "w-44",
                cell: (r) => (
                  <span className="grid gap-1">
                    <span className="figure">{r.onTimePercent}%</span>
                    <Meter value={r.onTimePercent / 100} tone={r.onTimePercent >= 80 ? "done" : "waiting"} label={`${name(r)}, on time`} />
                  </span>
                ),
              },
              {
                label: "Late",
                align: "right",
                width: "w-20",
                cell: (r) => <span className={`figure ${r.late > 0 ? "late-text" : "font-normal"}`}>{r.late}</span>,
              },
              { label: "Revisions", align: "right", width: "w-24", cell: (r) => <span className="figure font-normal">{r.avgRevisions.toFixed(1)}</span> },
              { label: "Days", align: "right", width: "w-20", cell: (r) => <span className="figure font-normal">{r.avgDays.toFixed(1)}</span> },
            ]}
          />
        </Panel>

        {/* Recent tasks, one panel per junior who had any; an odd last panel takes the row. */}
        <section aria-labelledby="recent-tasks" className="grid gap-3">
          <h2 id="recent-tasks" className="px-1 text-17 font-semibold text-ink">
            Recent tasks, last 30 days
          </h2>
          <div className="grid gap-5 lg:grid-cols-2 lg:[&>*:last-child:nth-child(odd)]:col-span-2">
            {busy.map((row) => {
              const blocks = courses[row.person] ?? [];
              return (
                <Panel key={row.person} title={name(row)}>
                  <ul className="grid gap-1">
                    {blocks.map((b) => (
                      <li key={b.title} className="glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5">
                        <span className="grid min-w-0">
                          <span className="truncate text-15">{b.title}</span>
                          <span className="text-13 text-ink-soft">
                            {firm.project(b.projectId)?.name} · {formatShortDate(b.assigned)} · {daysBetween(b.assigned, b.accepted)} days
                            {b.revisions > 0 ? ` · ${b.revisions} ${b.revisions === 1 ? "revision" : "revisions"}` : ""}
                          </span>
                        </span>
                        {b.lateDays > 0 ? (
                          <StatusChip tone="late">{b.lateDays === 1 ? "1 day late" : `${b.lateDays} days late`}</StatusChip>
                        ) : (
                          <StatusChip tone="done">On time</StatusChip>
                        )}
                      </li>
                    ))}
                  </ul>
                </Panel>
              );
            })}
          </div>
          {idle.length > 0 && (
            <p className="px-1 text-15 text-ink-soft">No tasks for {listWords(idle.map(name))}.</p>
          )}
        </section>
      </div>
    </>
  );
}
