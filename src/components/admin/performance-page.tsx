/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { NpsScore } from "@/components/shared/nps-score";
import { useFirm } from "@/lib/demo-store";
import type { Appraisal } from "@/lib/desk";
import { performance, templateOf, type PerformanceRow } from "@/lib/firm-data";
import { GlassTable, Initials, Meter, Panel, Segments, StatCard, StatRow } from "./glass-kit";
import {
  PERIOD_OPTIONS,
  SLOW_DAYS,
  TEAM_SORTS,
  appraised,
  daysWords,
  periodOf,
  sortTeam,
  type PeriodId,
  type TeamSort,
} from "./appraisal-data";

// Appraisals: for each person on the staff over a period, the approvals they handled and how
// long each waited on them (the average and the worst), what is overdue on them now, and for
// business development and the Project Heads, client feedback (NPS, with its count). Sorted
// by the delay by default; each name opens a printable report. The juniors' task record
// follows.

type Key = "tasks" | "onTimePercent" | "late" | "avgRevisions";

const SORTS: { id: Key; label: string }[] = [
  { id: "tasks", label: "Tasks" },
  { id: "onTimePercent", label: "On time" },
  { id: "late", label: "Late" },
  { id: "avgRevisions", label: "Revisions" },
];

function Delay({ days }: { days: number | null }) {
  if (days === null) return <span className="font-normal text-ink-soft">–</span>;
  return <span className={`figure ${days >= SLOW_DAYS ? "late-text" : "font-normal"}`}>{daysWords(days)}</span>;
}

export function PerformancePage() {
  const firm = useFirm();
  const [periodId, setPeriodId] = useState<PeriodId>("cycle");
  const [teamSort, setTeamSort] = useState<TeamSort>("delay");
  const [sort, setSort] = useState<Key>("tasks");
  const period = periodOf(periodId);

  const team = appraised(firm.people).map((p) => firm.appraisal(p.id, period));
  const teamRows = sortTeam(team, teamSort);
  const handled = team.reduce((t, a) => t + a.approvals.handled, 0);
  const delays = team.flatMap((a) => a.approvals.records.map((r) => r.delayDays));
  const avgDelay = delays.length > 0 ? Math.round((delays.reduce((t, d) => t + d, 0) / delays.length) * 10) / 10 : null;
  const urgentNow = team.reduce((t, a) => t + a.overdueNow, 0);
  const nps = firm.npsFirm;

  const rows = [...performance].sort((a, b) => b[sort] - a[sort]);
  const name = (row: PerformanceRow) => firm.person(row.person)?.name ?? row.person;
  const kinds = (row: PerformanceRow) => row.byCategory.map((c) => templateOf(c.category).name).join(" · ");
  const kindsDiffer = new Set(performance.map(kinds)).size > 1;
  const reportHref = (a: Appraisal) => `/staff/admin/performance/${a.personId}?period=${period.id}`;

  return (
    <>
      <StaffBoard place="Performance" headline={`Appraisals, ${period.label}`} chip={false} />
      <div className="mt-6 grid gap-5">
        <Segments<PeriodId> label="Period" value={periodId} onChange={setPeriodId} options={PERIOD_OPTIONS} />

        <StatRow cols={4} label="The team">
          <StatCard label="Approvals handled" value={handled} icon="check" />
          <StatCard
            label="Average delay"
            value={daysWords(avgDelay)}
            icon="clock"
            tone={avgDelay !== null && avgDelay >= SLOW_DAYS ? "late" : undefined}
          />
          <StatCard label="Urgent now" value={urgentNow} icon="alert" tone={urgentNow > 0 ? "late" : undefined} />
          <StatCard
            label="Client NPS"
            value={nps.nps === null ? "–" : nps.nps > 0 ? `+${nps.nps}` : nps.nps}
            sub={nps.count === 1 ? "1 answer" : `${nps.count} answers`}
            icon="users"
            tone={nps.nps !== null && nps.nps < 0 ? "late" : undefined}
          />
        </StatRow>

        <Panel
          title="Team"
          aside={<Segments<TeamSort> label="Sort team" value={teamSort} onChange={setTeamSort} options={TEAM_SORTS} />}
          strong
        >
          <GlassTable<Appraisal>
            caption={`Team, ${period.label}`}
            rows={teamRows}
            rowKey={(a) => a.personId}
            wide="lg"
            lead={(a) => (
              <Link href={reportHref(a)} className="group -my-2 flex min-h-11 items-center gap-2">
                <Initials name={a.name} />
                <span className="grid min-w-0">
                  <span className="link truncate">{a.name}</span>
                  <span className="truncate text-13 font-normal text-ink-soft">{firm.person(a.personId)?.title}</span>
                </span>
              </Link>
            )}
            chip={(a) =>
              a.overdueNow > 0 ? <StatusChip tone="late">{a.overdueNow} urgent</StatusChip> : <StatusChip tone="done">Clear</StatusChip>
            }
            columns={[
              {
                label: "Person",
                cell: (a) => (
                  <Link href={reportHref(a)} className="group -my-2 flex min-h-11 min-w-48 items-center gap-2">
                    <Initials name={a.name} />
                    <span className="grid min-w-0">
                      <span className="link truncate">{a.name}</span>
                      <span className="truncate text-13 font-normal text-ink-soft">{firm.person(a.personId)?.title}</span>
                    </span>
                  </Link>
                ),
              },
              { label: "Handled", align: "right", width: "w-24", cell: (a) => <span className="figure font-normal">{a.approvals.handled}</span> },
              { label: "Avg delay", align: "right", width: "w-28", cell: (a) => <Delay days={a.approvals.avgDelayDays} /> },
              {
                label: "Worst",
                cell: (a) =>
                  a.approvals.worst ? (
                    <span className="grid min-w-0 max-w-56">
                      <Delay days={a.approvals.worst.delayDays} />
                      <span className="truncate text-13 font-normal text-ink-soft">{a.approvals.worst.what}</span>
                    </span>
                  ) : (
                    <span className="font-normal text-ink-soft">–</span>
                  ),
              },
              {
                label: "Waiting now",
                width: "w-32",
                phone: false,
                cell: (a) =>
                  a.pending.count === 0 ? (
                    <StatusChip tone="done">Clear</StatusChip>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="figure font-normal">{a.pending.count}</span>
                      {a.overdueNow > 0 && <StatusChip tone="late">{a.overdueNow} urgent</StatusChip>}
                    </span>
                  ),
              },
              {
                label: "NPS",
                width: "w-40",
                cell: (a) =>
                  a.nps ? (
                    <NpsScore
                      value={a.nps.nps}
                      count={a.nps.count}
                      promoters={a.nps.promoters}
                      passives={a.nps.passives}
                      detractors={a.nps.detractors}
                      size="sm"
                    />
                  ) : (
                    <span className="font-normal text-ink-soft">–</span>
                  ),
              },
            ]}
          />
        </Panel>

        <Panel title="Juniors, tasks" aside={<Segments<Key> label="Sort juniors" value={sort} onChange={setSort} options={SORTS} />}>
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
      </div>
    </>
  );
}
