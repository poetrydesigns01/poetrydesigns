/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { PROJECT, progressOf } from "@/components/client-home/data";
import { ArrowIcon } from "@/components/client-home/icons";
import { CLIENT_PAGE, PageHead } from "@/components/client-home/page-frame";
import { TimelineList } from "@/components/client-home/timeline-list";
import { WeekGantt } from "@/components/client-home/week-gantt";
import "@/components/client-home/home.css";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import { addDays, dayCount, formatDate } from "@/lib/format";

// Iyer Residence timeline: planned and expected handover, the weekly plan as on Poetry's
// schedule sheet (a stacked list on phones), the days her approved changes added, and what
// the changes waiting on her would add.

export default function TimelinePage() {
  const firm = useFirm();
  const timeline = firm.timeline(PROJECT);
  const site = firm.siteStage(PROJECT);

  if (!timeline) {
    return (
      <div className={CLIENT_PAGE}>
        <PageHead title="Timeline" />
        <p className="glass p-5 text-17 text-ink">Dates coming soon</p>
      </div>
    );
  }

  const progress = progressOf(timeline, site);
  const pendingDays = timeline.pending.reduce((total, c) => total + c.days, 0);
  const approved = [...timeline.inPlan, ...timeline.changes];
  const onPlan = timeline.handoverPlanned === timeline.handoverExpected;
  const added = timeline.extraDays > 0;

  return (
    <div className={CLIENT_PAGE}>
      <PageHead title="Timeline">
        {progress.held && <span className="glass-chip chip-waiting">Waiting on payment</span>}
        {progress.week > 0 && (
          <span className="glass-chip chip-progress">
            Week {progress.week} of {progress.weeks}
          </span>
        )}
      </PageHead>

      {onPlan ? (
        <section className="glass-strong flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-4" aria-label="Handover">
          <p className="lettering text-ink-soft">Handover</p>
          <p className="figure text-22 text-ink">{formatDate(timeline.handoverExpected)}</p>
          <StatusChip tone="done">On plan</StatusChip>
        </section>
      ) : (
        <section
          className={`glass-strong grid grid-cols-2 gap-2 p-2 sm:p-3 ${added ? "sm:grid-cols-3" : ""}`}
          aria-label="Handover"
        >
          <div className="glass-inner grid gap-1 p-3 sm:p-4">
            <p className="lettering text-ink-soft">Planned handover</p>
            <p className="figure text-17 text-ink min-[360px]:text-22">{formatDate(timeline.handoverPlanned)}</p>
          </div>
          <div className="glass-inner grid gap-1 p-3 sm:p-4">
            <p className="lettering text-ink-soft">Expected handover</p>
            <p className="figure text-17 text-ink min-[360px]:text-22">{formatDate(timeline.handoverExpected)}</p>
          </div>
          {added && (
            <div className="glass-inner col-span-2 grid gap-1 p-3 sm:col-span-1 sm:p-4">
              <p className="lettering text-ink-soft">Added by your changes</p>
              <p className="figure late-text text-22">+{dayCount(timeline.extraDays)}</p>
            </div>
          )}
        </section>
      )}

      <div className="hidden md:block">
        <WeekGantt timeline={timeline} />
      </div>
      <div className="md:hidden">
        <TimelineList timeline={timeline} />
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2 lg:gap-5">
        <section className="glass flex flex-col p-2 sm:p-3" aria-labelledby="added-title">
          <h2 id="added-title" className="display px-3 pt-2 pb-1 text-22 text-ink">
            Approved changes
          </h2>
          {approved.length === 0 ? (
            <p className="px-3 py-2.5 text-15 text-ink-soft">No days added</p>
          ) : (
            <ul>
              {approved.map((change) => (
                <li
                  key={change.id}
                  className="glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5"
                >
                  <span className="grid min-w-0">
                    <span className="text-15 text-ink">{change.title}</span>
                    <span className="truncate text-13 text-ink-soft">
                      {change.inPlan ? "Before construction" : `From milestone ${change.n}`}
                      {change.approvedAt ? ` · ${formatDate(change.approvedAt)}` : ""}
                    </span>
                  </span>
                  {change.inPlan ? (
                    <StatusChip tone="done">In the plan</StatusChip>
                  ) : (
                    <span className="late-text text-17">+{dayCount(change.days)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 flex items-center justify-between gap-3 border-t border-ink/10 px-3 pt-3 pb-2">
            <span className="lettering text-ink-soft">Added</span>
            <span className={`text-17 ${timeline.extraDays > 0 ? "late-text" : "text-ink"}`}>
              {timeline.extraDays > 0 ? `+${dayCount(timeline.extraDays)}` : "0 days"}
            </span>
          </p>
        </section>

        <section className="glass flex flex-col p-2 sm:p-3" aria-labelledby="pending-title">
          <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-1">
            <h2 id="pending-title" className="display text-22 text-ink">
              Waiting on you
            </h2>
            {timeline.pending.length > 0 && (
              <span className="glass-chip chip-waiting">{timeline.pending.length} pending</span>
            )}
          </div>
          {timeline.pending.length === 0 ? (
            <p className="px-3 py-2.5 text-15 text-ink-soft">No pending changes</p>
          ) : (
            <>
              <ul>
                {timeline.pending.map((change) => (
                  <li
                    key={change.id}
                    className="glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5"
                  >
                    <span className="grid min-w-0">
                      <span className="text-15 text-ink">{change.title}</span>
                      <span className="truncate text-13 text-ink-soft">From milestone {change.n}</span>
                    </span>
                    <span className={`glass-chip ${change.days > 0 ? "chip-late" : "chip-done"}`}>
                      {change.days > 0 ? `+${dayCount(change.days)}` : "No delay"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 flex flex-wrap items-center justify-between gap-x-3 border-t border-ink/10 px-3 pt-3 pb-2">
                <span className="lettering text-ink-soft">If all approved</span>
                <span className="text-15 text-ink">
                  <span className="figure">{formatDate(addDays(timeline.handoverExpected, pendingDays))}</span>
                  {pendingDays > 0 && <span className="late-text"> · +{dayCount(pendingDays)}</span>}
                </span>
              </p>
              <div className="px-1 pt-3 pb-1 sm:px-3">
                <Link href="/client/changes" className="btn btn-primary gap-2">
                  Review changes
                  <ArrowIcon />
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
