/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { ClientRequests } from "@/components/project/requests";
import { projectsFor } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { AttentionList } from "@/components/shared/attention-list";
import { ProjectTile } from "@/components/shared/project-tile";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import type { DesignItemView, TaskDrawingView, Tone } from "@/lib/portal";
import { addDays, datePart, dayCount, daysBetween, inrDelta } from "@/lib/format";
import { todayItems } from "@/lib/today-count";
import { useArchitect } from "./common";
import { changeTone } from "./design-bits";
import { DESIGNS_HREF, isDesignTrack, itemChip } from "./designs";
import { day, dayTime, Empty, IconArrow, IconEye, IconSend, IconUpload, Panel, rowBtn, Stat, Stats } from "./glass-ui";
import { dueNow, planChip, weeksLabel } from "./plan-bits";
import { ProjectRow } from "./project-row";

// The studio's Today: everything waiting on the architect, urgent first with how long each
// has waited; the client requests a Project Head answers; the projects that need a look; the
// design tasks the plan puts in this week; the drawings the site waits for; what the client
// has viewed and decided; the changes recommended; and every project as a picture.

/** Days until a drawing is needed, or how late it is. */
function drawingChip(d: TaskDrawingView): { tone: Tone; words: string } {
  if (d.daysLate > 0) return { tone: "late", words: `${d.daysLate} ${d.daysLate === 1 ? "day" : "days"} late` };
  const left = daysBetween(TODAY, d.neededBy);
  if (left <= 0) return { tone: "waiting", words: "Due today" };
  return { tone: left <= 7 ? "waiting" : "locked", words: `Due ${day(d.neededBy)}` };
}

export function ArchitectDesk() {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const me = useArchitect();

  const inScope = (id: ProjectId) => me.scope === "all" || me.scope === id;
  const projects = projectsFor("architect", me.id, firm).filter((p) => inScope(p.id));
  const headed = projects.filter((p) => p.team.head === me.id);
  const headedIds = new Set(headed.map((p) => p.id));
  const name = (id: ProjectId) => firm.project(id)?.name ?? "";

  // ---- Waiting on this architect, urgent first: the rows the rail's Today figure counts ----
  // A senior answers a junior's work to review on the Team page, beside the team's other tasks.
  const attention = todayItems(firm, "architect", me.id, me.scope);
  const urgent = attention.filter((i) => i.tier === "urgent").length;
  const approvals = attention.filter((i) => i.approval).length;
  const needing = firm.projectsNeedingAttention(me.id).filter((x) => inScope(x.projectId));

  // ---- Client requests to this Project Head: open ones, then the last few answered ----
  const requests = firm.requestsForHead(me.id).filter((r) => inScope(r.projectId));
  const openRequests = requests.filter((r) => r.open);
  const recentRequests = [...openRequests, ...requests.filter((r) => !r.open).slice(0, Math.max(0, 4 - openRequests.length))];
  const toDecide = requests.filter((r) => r.waitingOn === "head").length;

  // ---- The site's drawings this architect owes ----
  const drawings = firm.siteDrawings
    .filter((d) => inScope(d.projectId) && d.status === "awaited" && (d.by === me.id || headedIds.has(d.projectId)))
    .sort((a, b) => b.daysLate - a.daysLate || a.neededBy.localeCompare(b.neededBy));
  const lateDrawings = drawings.filter((d) => d.daysLate > 0).length;

  // ---- Design items: what the client has viewed and decided ----
  const items = projects.flatMap((p) => firm.designStages(p.id).flatMap((s) => s.items));
  const itemOf = (projectId: ProjectId, templateId: string) => items.find((i) => i.projectId === projectId && i.id === templateId);
  const recentFrom = addDays(TODAY, -45);
  const clientNews = items
    .flatMap((i): { item: DesignItemView; at: string }[] => {
      if (i.status === "waiting") return [{ item: i, at: i.viewedAt ?? i.uploadedAt ?? "" }];
      if ((i.status === "approved" || i.status === "modify") && i.decidedAt && datePart(i.decidedAt) >= recentFrom)
        return [{ item: i, at: i.decidedAt }];
      return [];
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  // ---- The plan: design tasks due this week or late, the architect's own and, as Project Head, the team's ----
  const week = projects
    .flatMap((p) => {
      const plan = firm.plan(p.id);
      if (!plan) return [];
      return plan.tasks
        .filter((t) => isDesignTrack(t) && dueNow(plan, t))
        .filter((t) => t.assignee === me.id || (headedIds.has(p.id) && !!t.assignee && firm.person(t.assignee)?.role === "architect"))
        .filter((t) => itemOf(p.id, t.templateId)?.status !== "approved")
        .map((t) => ({ t, plan }));
    })
    .sort((a, b) => b.t.daysLate - a.t.daysLate || a.t.plannedEnd.localeCompare(b.t.plannedEnd));

  // ---- Changes recommended ----
  const changes = firm.revisions
    .filter((r) => inScope(r.projectId) && projects.some((p) => p.id === r.projectId))
    .sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));
  const timeline = me.scope !== "all" ? firm.timeline(me.scope) : firm.timeline("iyer");
  const recommendAt = headed.find((p) => p.phase === "building" || p.phase === "in-design") ?? headed[0];

  const markSent = (d: TaskDrawingView, origin: HTMLElement) => {
    if (pause.pending !== null) return;
    const { record } = demo;
    const by: PersonId = me.id;
    pause.start({
      what: `${d.sheet} sent to site`,
      origin,
      commit: () => record({ kind: "drawing.sent", projectId: d.projectId, drawingId: d.id, file: `${d.sheet}.pdf`, by }),
    });
  };

  const headline =
    attention.length === 0
      ? `All clear, ${me.first}`
      : `${attention.length} waiting on you, ${me.first}`;

  return (
    <>
      <StaffBoard place="Today" headline={headline} />

      <div className="mt-6 grid gap-4 lg:mt-8">
        <Stats label="At a glance">
          <Stat label="Urgent" value={urgent} tone={urgent > 0 ? "late" : undefined} />
          <Stat label="Approvals" value={approvals} />
          {headed.length > 0 ? (
            <Stat
              label="Requests"
              value={toDecide}
              note={toDecide > 0 ? <StatusChip tone="waiting">To decide</StatusChip> : undefined}
            />
          ) : (
            <Stat
              label="In review"
              value={firm.tasks.filter((t) => t.person === me.id && t.status === "submitted" && inScope(t.projectId)).length}
              href="/staff/architect/tasks"
            />
          )}
          <Stat
            label="Drawings due"
            value={drawings.length}
            note={lateDrawings > 0 ? <StatusChip tone="late">{`${lateDrawings} late`}</StatusChip> : undefined}
          />
        </Stats>

        <div className="grid items-start gap-4 min-[1200px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="grid min-w-0 gap-4">
            <section aria-labelledby="desk-waiting" className="grid gap-2">
              <h2 id="desk-waiting" className="flex items-center gap-2 px-1 text-17 font-semibold text-ink">
                Waiting on you
                {urgent > 0 && <StatusChip tone="late">{`${urgent} urgent`}</StatusChip>}
              </h2>
              <AttentionList items={attention} label="Waiting on you" empty="Nothing waiting" />
            </section>

            {(headed.length > 0 || requests.length > 0) && (
              <ClientRequests id="requests" title="Client requests" requests={recentRequests} showProject empty="None open" />
            )}

            <Panel
              title="This week"
              aside={
                <Link href={DESIGNS_HREF} className={rowBtn}>
                  Track <IconArrow />
                </Link>
              }
            >
              {week.length === 0 ? (
                <Empty>Nothing due</Empty>
              ) : (
                <ul className="grid grid-cols-1 gap-1">
                  {week.map(({ t, plan }) => {
                    const item = itemOf(t.projectId, t.templateId);
                    const chip = item ? itemChip(item, plan, t) : planChip(plan, t);
                    const who = t.assignee && t.assignee !== me.id ? firm.person(t.assignee)?.first : null;
                    const upload = item && item.status !== "waiting";
                    return (
                      <li key={t.id}>
                        <Link
                          href={DESIGNS_HREF}
                          onClick={() => demo.setFocusRow({ href: DESIGNS_HREF, id: `${t.projectId}:${t.templateId}` })}
                          className="glass-row grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5"
                        >
                          <span className="grid min-w-0 gap-1">
                            <span className="block truncate text-15 font-semibold text-ink">{item?.title ?? t.name}</span>
                            <span className="block truncate text-13 text-ink-soft">
                              {[name(t.projectId), weeksLabel(t.clock, t.fromWeek, t.toWeek), who].filter(Boolean).join(" · ")}
                            </span>
                            <span className="flex items-center gap-2">
                              <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
                              {item?.status === "waiting" && (
                                <IconEye label={item.viewed ? "Viewed" : "Not viewed"} className={item.viewed ? "text-kota" : "text-ink-soft"} />
                              )}
                            </span>
                          </span>
                          {upload ? <IconUpload className="text-ink-soft" /> : <IconArrow className="text-ink-soft" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid min-w-0 gap-4">
            <Panel title="Needs a look">
              {needing.length === 0 ? (
                <Empty>All on track</Empty>
              ) : (
                <ul className="grid grid-cols-1 gap-1">
                  {needing.map((x) => (
                    <li key={x.projectId}>
                      <ProjectRow project={x.project}>
                        {x.reasons.slice(0, 3).map((r) => (
                          <StatusChip key={r.kind + r.words} tone={r.tone}>
                            {r.words}
                          </StatusChip>
                        ))}
                      </ProjectRow>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Drawings for site">
              {drawings.length === 0 ? (
                <Empty>None awaited</Empty>
              ) : (
                <ul className="grid grid-cols-1 gap-1">
                  {drawings.map((d) => {
                    const chip = drawingChip(d);
                    return (
                      <li key={d.id} className="glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-15 text-ink">{d.title}</p>
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-13 text-ink-soft">
                            <span className="figure text-ink">{d.sheet}</span>
                            <span className="truncate">
                              {me.senior ? `${d.byName.split(" ")[0]} · ` : ""}
                              {name(d.projectId)}
                            </span>
                            <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
                          </p>
                        </div>
                        {(d.by === me.id || me.senior) && (
                          <button
                            type="button"
                            className={`${rowBtn} size-11 p-0`}
                            aria-disabled={pause.pending !== null}
                            aria-label={`Mark ${d.sheet} sent to site`}
                            title="Mark sent"
                            onClick={(e) => markSent(d, e.currentTarget)}
                          >
                            <IconSend />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Client">
              {clientNews.length === 0 ? (
                <Empty>Nothing new</Empty>
              ) : (
                <ul className="grid grid-cols-1 gap-1">
                  {clientNews.map(({ item }) => {
                    let chip: { tone: Tone; words: string };
                    if (item.status === "approved") chip = { tone: "done", words: `Approved ${dayTime(item.decidedAt)}` };
                    else if (item.status === "modify") chip = { tone: "progress", words: `Modify ${dayTime(item.decidedAt)}` };
                    else if (item.viewedAt) chip = { tone: "waiting", words: `Viewed ${dayTime(item.viewedAt)}` };
                    else chip = { tone: "locked", words: "Not viewed" };
                    return (
                      <li key={`${item.projectId}:${item.id}`} className="glass-row flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                        <span className="min-w-0 flex-[1_1_10rem]">
                          <span className="block truncate text-15 text-ink">
                            {item.title} <span className="figure text-ink-soft">v{item.version}</span>
                          </span>
                          <span className="block truncate text-13 text-ink-soft">{name(item.projectId)}</span>
                        </span>
                        <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        {changes.length > 0 && (
          <Panel
            title="Changes recommended"
            aside={
              <>
                {timeline && timeline.extraDays > 0 && <span className="late-text text-15">+{timeline.extraDays} days</span>}
                {me.senior && recommendAt && (
                  <Link href={`/staff/projects/${recommendAt.id}/programme#changes`} className={rowBtn}>
                    Recommend <IconArrow />
                  </Link>
                )}
              </>
            }
          >
            <ul className="grid grid-cols-1 gap-1 lg:grid-cols-2">
              {changes.slice(0, 6).map((r) => (
                <li key={r.id} className="glass-row flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                  <div className="min-w-0 flex-[1_1_12rem]">
                    <p className="truncate text-15 text-ink">{r.item}</p>
                    <p className="text-13 text-ink-soft">
                      {r.id} · {name(r.projectId)}
                    </p>
                  </div>
                  <span className="figure text-15 text-ink">{inrDelta(r.amount)}</span>
                  {r.days > 0 && <span className="late-text text-15">+{dayCount(r.days)}</span>}
                  <StatusChip tone={changeTone(r.status)}>{r.statusWords}</StatusChip>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {projects.length > 0 && (
          <section aria-labelledby="desk-projects" className="grid gap-2">
            <h2 id="desk-projects" className="px-1 text-17 font-semibold text-ink">
              Projects
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {projects.map((p) => (
                <li key={p.id} className="min-w-0">
                  <ProjectTile
                    project={p}
                    badge={p.team.head === me.id ? <span className="glass-chip">Head</span> : undefined}
                    className="h-full"
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
