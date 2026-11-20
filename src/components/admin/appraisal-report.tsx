/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useState, type ReactNode } from "react";
import { PaperSheet } from "@/components/register/paper-sheet";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { AttentionList } from "@/components/shared/attention-list";
import { NpsScore } from "@/components/shared/nps-score";
import { replyWords } from "@/lib/desk";
import { useFirm } from "@/lib/demo-store";
import { courses, type PersonId } from "@/lib/firm-data";
import { daysBetween, formatDate, formatShortDate } from "@/lib/format";
import { Segments } from "./glass-kit";
import { KIND_WORDS, PERIOD_OPTIONS, ROLE_WORDS, SLOW_DAYS, daysWords, periodOf, type PeriodId } from "./appraisal-data";

// One person's appraisal for a period, on a sheet that prints alone: approvals handled with
// the average and the worst wait, what is waiting on them now, then by role: client feedback
// and engagement (business development, Project Heads), leads (business development), client
// requests decided (architects) and tasks (juniors). Every approval they answered is listed.

function Figure({ label, value, sub, late = false }: { label: string; value: ReactNode; sub?: ReactNode; late?: boolean }) {
  return (
    <div className="glass-inner grid min-w-0 content-start gap-0.5 px-3 py-2.5">
      <dt className="lettering text-ink-soft">{label}</dt>
      <dd className={`figure text-22 ${late ? "late-text" : "text-ink"}`}>{value}</dd>
      {sub && <dd className="truncate text-13 text-ink-soft">{sub}</dd>}
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="grid gap-2 border-t border-ink/10 pt-4">
      <h2 className="lettering text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}

export function AppraisalReport({ person, initialPeriod }: { person: PersonId; initialPeriod?: string }) {
  const firm = useFirm();
  const [periodId, setPeriodId] = useState<PeriodId>(periodOf(initialPeriod).id);
  const period = periodOf(periodId);
  const me = firm.person(person);
  // Anyone on the staff but the admin, including people added in this tab under People.
  if (!me || me.role === "client" || me.role === "admin") {
    return (
      <StaffBoard
        place="Performance"
        headline="Not found"
        chip={false}
        back={{ label: "Team", href: "/staff/admin/performance" }}
      />
    );
  }
  const a = firm.appraisal(person, period);
  const waiting = firm.attentionFor(person);
  const blocks = (courses[person] ?? []).filter((b) => b.accepted >= period.from && b.assigned <= period.to);

  return (
    <>
      <div className="no-print">
        <StaffBoard
          place="Performance"
          headline={me.name}
          chip={false}
          back={{ label: "Team", href: "/staff/admin/performance" }}
          primary={{ label: "Print", onClick: () => window.print() }}
        />
      </div>
      <div className="mt-6 grid gap-5">
        <div className="no-print">
          <Segments<PeriodId> label="Period" value={periodId} onChange={setPeriodId} options={PERIOD_OPTIONS} />
        </div>

        <PaperSheet title={`${me.name}, appraisal`}>
          <div className="grid gap-5">
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div className="grid gap-1">
                <p className="lettering text-ink-soft">Appraisal · {period.label}</p>
                <h1 className="display text-32 text-ink">{me.name}</h1>
                <p className="text-15 text-ink-soft">
                  {me.title.toLowerCase() === ROLE_WORDS[me.role].toLowerCase() ? me.title : `${me.title} · ${ROLE_WORDS[me.role]}`}
                </p>
              </div>
              <p className="text-13 text-ink-soft">
                {formatDate(period.from)} to {formatDate(period.to)}
              </p>
            </header>

            <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Figure label="Approvals handled" value={a.approvals.handled} />
              <Figure
                label="Average delay"
                value={daysWords(a.approvals.avgDelayDays)}
                late={(a.approvals.avgDelayDays ?? 0) >= SLOW_DAYS}
              />
              <Figure
                label="Worst delay"
                value={daysWords(a.approvals.worst?.delayDays)}
                sub={a.approvals.worst?.what}
                late={(a.approvals.worst?.delayDays ?? 0) >= SLOW_DAYS}
              />
              <Figure
                label="Urgent now"
                value={a.overdueNow}
                sub={a.pending.count > 0 ? `${a.pending.count} waiting · oldest ${daysWords(a.pending.oldestDays)}` : "Nothing waiting"}
                late={a.overdueNow > 0}
              />
            </dl>

            {a.nps && (
              <Block title="Client feedback">
                <div className="grid items-start gap-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                  <NpsScore
                    value={a.nps.nps}
                    count={a.nps.count}
                    promoters={a.nps.promoters}
                    passives={a.nps.passives}
                    detractors={a.nps.detractors}
                    size="lg"
                  />
                  {a.nps.latest.length > 0 && (
                    <ul className="grid gap-1" aria-label="Latest answer of each client">
                      {a.nps.latest.map((x) => (
                        <li key={x.id} className="glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
                          <span className="grid min-w-0">
                            <span className="truncate text-15">{firm.project(x.projectId)?.name ?? x.projectId}</span>
                            <span className="truncate text-13 text-ink-soft">
                              {x.point} · {formatShortDate(x.at)}
                              {x.comment ? ` · ${x.comment}` : ""}
                            </span>
                          </span>
                          <StatusChip tone={x.band === "promoter" ? "done" : x.band === "detractor" ? "late" : "waiting"}>
                            {String(x.score)}
                          </StatusChip>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {a.nps.trend.some((t) => t.count > 0) && (
                  <ol className="flex flex-wrap gap-1.5" aria-label="By month">
                    {a.nps.trend.map((t) => (
                      <li key={t.month} className="glass-chip">
                        <span className="text-ink-soft">{t.month.slice(0, 3)}</span>
                        <span className="figure">{t.nps === null ? "–" : t.nps > 0 ? `+${t.nps}` : t.nps}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Block>
            )}

            {a.engagement && (
              <Block title="Engagement">
                <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Figure
                    label="Median reply"
                    value={replyWords(a.engagement.medianReplyHours)}
                    sub={`${a.engagement.replies} replies`}
                  />
                  <Figure
                    label="Unanswered"
                    value={a.engagement.unanswered}
                    sub={a.engagement.oldestUnansweredAt ? `Since ${formatShortDate(a.engagement.oldestUnansweredAt)}` : undefined}
                    late={a.engagement.unanswered > 0}
                  />
                  <Figure label="Escalations open" value={a.engagement.escalationsOpen} late={a.engagement.escalationsOpen > 0} />
                  <Figure label="Clients" value={a.engagement.clients} />
                </dl>
              </Block>
            )}

            {a.prospects && (
              <Block title="Leads">
                <dl className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  <Figure label="Registered" value={a.prospects.registered} />
                  <Figure label="Signed up" value={a.prospects.converted} />
                  <Figure label="Dropped" value={a.prospects.dropped} />
                  <Figure label="Under discussion" value={a.prospects.active} />
                  <Figure label="Follow-ups due" value={a.prospects.followUpsDue} late={a.prospects.followUpsDue > 0} />
                </dl>
              </Block>
            )}

            {a.requests && (
              <Block title="Client requests">
                <dl className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  <Figure label="Decided" value={a.requests.decided} />
                  <Figure
                    label="Turnaround"
                    value={daysWords(a.requests.avgTurnaroundDays)}
                    late={(a.requests.avgTurnaroundDays ?? 0) >= SLOW_DAYS}
                  />
                  <Figure label="Open" value={a.requests.open} />
                </dl>
              </Block>
            )}

            {a.tasks && (
              <Block title="Tasks, last 90 days">
                <dl className="grid grid-cols-3 gap-2">
                  <Figure label="Tasks" value={a.tasks.count} />
                  <Figure label="On time" value={`${a.tasks.onTimePercent}%`} late={a.tasks.onTimePercent < 80} />
                  <Figure label="Average" value={daysWords(a.tasks.avgDays)} />
                </dl>
                {blocks.length > 0 && (
                  <ul className="grid gap-1">
                    {blocks.map((b) => (
                      <li key={b.title} className="glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
                        <span className="grid min-w-0">
                          <span className="truncate text-15">{b.title}</span>
                          <span className="truncate text-13 text-ink-soft">
                            {firm.project(b.projectId)?.name} · {formatShortDate(b.assigned)} · {daysBetween(b.assigned, b.accepted)} d
                            {b.revisions > 0 ? ` · ${b.revisions} rev.` : ""}
                          </span>
                        </span>
                        {b.lateDays > 0 ? (
                          <StatusChip tone="late">{`${b.lateDays} d late`}</StatusChip>
                        ) : (
                          <StatusChip tone="done">On time</StatusChip>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Block>
            )}

            <Block title={`Approvals, ${a.approvals.handled}`}>
              {a.approvals.records.length === 0 ? (
                <p className="text-15 text-ink-soft">None in this period</p>
              ) : (
                <table className="w-full border-separate border-spacing-0 text-15">
                  <caption className="sr-only">Approvals handled</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="lettering pb-2 pl-3 text-left font-semibold text-ink-soft">
                        What
                      </th>
                      <th scope="col" className="lettering hidden pb-2 pl-3 text-left font-semibold text-ink-soft md:table-cell">
                        Reached
                      </th>
                      <th scope="col" className="lettering hidden pb-2 pl-3 text-left font-semibold text-ink-soft sm:table-cell">
                        Answered
                      </th>
                      <th scope="col" className="lettering pr-3 pb-2 pl-3 text-right font-semibold text-ink-soft">
                        Delay
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.approvals.records.map((r, i) => (
                      <tr key={r.id}>
                        <td className={`py-2 pl-3 align-top ${i > 0 ? "border-t border-ink/10" : ""}`}>
                          <span className="grid min-w-0">
                            <span>{r.what}</span>
                            <span className="text-13 text-ink-soft">
                              {KIND_WORDS[r.kind]}
                              {r.projectId ? ` · ${firm.project(r.projectId)?.name ?? r.projectId}` : ""}
                            </span>
                          </span>
                        </td>
                        <td className={`hidden py-2 pl-3 align-top text-ink-soft md:table-cell ${i > 0 ? "border-t border-ink/10" : ""}`}>
                          {formatShortDate(r.since)}
                        </td>
                        <td className={`hidden py-2 pl-3 align-top text-ink-soft sm:table-cell ${i > 0 ? "border-t border-ink/10" : ""}`}>
                          {formatShortDate(r.doneAt)}
                        </td>
                        <td className={`py-2 pr-3 pl-3 text-right align-top ${i > 0 ? "border-t border-ink/10" : ""}`}>
                          <span className={`figure ${r.delayDays >= SLOW_DAYS ? "late-text" : ""}`}>{daysWords(r.delayDays)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Block>

            <Block title={`Waiting now, ${waiting.length}`}>
              <AttentionList items={waiting} label="Waiting now" empty="Nothing waiting" limit={8} />
            </Block>
          </div>
        </PaperSheet>
      </div>
    </>
  );
}
