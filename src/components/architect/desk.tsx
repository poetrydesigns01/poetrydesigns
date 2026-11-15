/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { projectsFor } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { TaskView } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import type { DesignItemView, TaskDrawingView, Tone } from "@/lib/portal";
import { addDays, datePart, dayCount, daysBetween, inrDelta } from "@/lib/format";
import { isOpen, juniorsOf, useArchitect } from "./common";
import { changeTone } from "./design-bits";
import { DESIGNS_HREF, isDesignTrack, itemChip } from "./designs";
import { day, dayTime, Empty, IconArrow, IconCheck, IconEye, IconSend, IconUpload, Panel, rowBtn, rowPrimary, Stat, Stats } from "./glass-ui";
import { dueNow, planChip, weeksLabel } from "./plan-bits";
import { ReviewPanel } from "./review-panel";

// The studio desk: what needs the architect, the design tasks the plan puts in this week,
// what the client has viewed and decided, the drawings the site is waiting for, and the
// changes the architect has recommended.

type Need = {
  id: string;
  title: string;
  project?: string;
  chip: { tone: Tone; words: string };
  /** A link to where it is done, or an inline answer. */
  href?: string;
  /** The row to open there. */
  focus?: string;
  label: string;
  icon?: ReactNode;
  review?: TaskView;
  drawing?: TaskDrawingView;
};

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
  const [open, setOpen] = useState<string | null>(null);

  const inScope = (id: ProjectId) => me.scope === "all" || me.scope === id;
  const projects = projectsFor("architect", me.id, firm).filter((p) => inScope(p.id));
  const headed = projects.filter((p) => p.team.head === me.id);
  const headedIds = new Set(headed.map((p) => p.id));
  const name = (id: ProjectId) => firm.project(id)?.name ?? "";

  // ---- The site's drawings this architect owes ----
  const drawings = firm.siteDrawings
    .filter((d) => inScope(d.projectId) && d.status === "awaited" && (d.by === me.id || headedIds.has(d.projectId)))
    .sort((a, b) => b.daysLate - a.daysLate || a.neededBy.localeCompare(b.neededBy));
  const lateDrawings = drawings.filter((d) => d.daysLate > 0).length;

  // ---- Design items: what the client has viewed and decided ----
  const items = projects.flatMap((p) => firm.designStages(p.id).flatMap((s) => s.items));
  const withClient = items.filter((i) => i.status === "waiting");
  const viewed = withClient.filter((i) => i.viewed).length;
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
  const weekLate = week.filter((x) => x.t.late).length;

  // ---- Changes recommended ----
  const changes = firm.revisions
    .filter((r) => inScope(r.projectId) && projects.some((p) => p.id === r.projectId))
    .sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));
  const changesOpen = changes.filter((r) => r.status === "with-client").length;
  const timeline = me.scope !== "all" ? firm.timeline(me.scope) : firm.timeline("iyer");
  const recommendAt = headed.find((p) => p.phase === "building" || p.phase === "in-design") ?? headed[0];

  // ---- Needs you ----
  const needs: Need[] = [];
  // Demand letters are not here: every receipt in the workbook is Accounts & Finance's.
  if (me.senior) {
    for (const r of changes) {
      if (r.status !== "changes-asked" || !headedIds.has(r.projectId)) continue;
      needs.push({
        id: `rev:${r.id}`,
        title: r.item,
        project: name(r.projectId),
        chip: { tone: "progress", words: "Client asked changes" },
        href: `/staff/projects/${r.projectId}/programme#changes`,
        label: "Revise",
      });
    }
    const juniors = new Set(juniorsOf(firm, me.id).map((p) => p.id));
    for (const t of firm.tasks) {
      if (t.status !== "submitted" || t.assignedBy !== me.id || !juniors.has(t.person) || !inScope(t.projectId)) continue;
      needs.push({
        id: `task:${t.id}`,
        title: t.title,
        project: `${t.personName.split(" ")[0]} · ${t.projectName}`,
        chip: { tone: "waiting", words: "In review" },
        label: "Review",
        review: t,
      });
    }
  } else {
    for (const t of firm.tasks) {
      if (t.person !== me.id || t.kind !== "work" || !inScope(t.projectId) || !isOpen(t)) continue;
      const today = t.dueAt ? datePart(t.dueAt) <= TODAY : false;
      if (t.status !== "revision" && !t.overdue && !today) continue;
      needs.push({
        id: `task:${t.id}`,
        title: t.title,
        project: t.projectName,
        chip:
          t.status === "revision"
            ? { tone: "progress", words: "Sent back" }
            : t.overdue
              ? { tone: "late", words: "Overdue" }
              : { tone: "waiting", words: "Due today" },
        href: "/staff/architect/tasks",
        label: "Open",
      });
    }
  }
  for (const i of items) {
    if (i.status !== "modify" || (i.preparedBy !== me.id && !(me.senior && headedIds.has(i.projectId)))) continue;
    needs.push({
      id: `design:${i.id}`,
      title: `${i.title} v${(i.version ?? 0) + 1}`,
      project: name(i.projectId),
      chip: { tone: "progress", words: "Modify requested" },
      href: DESIGNS_HREF,
      focus: `${i.projectId}:${i.id}`,
      label: "Upload",
      icon: <IconUpload />,
    });
  }
  for (const d of drawings) {
    // The architect's own drawings due soon, and as Project Head any that are already late.
    const lateOnMine = me.senior && headedIds.has(d.projectId) && d.daysLate > 0;
    if (d.by !== me.id && !lateOnMine) continue;
    const left = daysBetween(TODAY, d.neededBy);
    if (d.daysLate === 0 && left > 7) continue;
    needs.push({
      id: `drawing:${d.id}`,
      title: `${d.sheet} ${d.title}`,
      project: d.by === me.id ? name(d.projectId) : `${d.byName.split(" ")[0]} · ${name(d.projectId)}`,
      chip: drawingChip(d),
      label: "Mark sent",
      icon: <IconSend />,
      drawing: d,
    });
  }

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
    needs.length === 0 ? `All clear, ${me.first}` : `${needs.length} ${needs.length === 1 ? "needs" : "need"} you, ${me.first}`;

  const needRow = (n: Need, index: number) => {
    const isFirst = index === 0;
    const cls = isFirst ? rowPrimary : rowBtn;
    let action: ReactNode;
    if (n.href) {
      action = (
        <Link href={n.href} className={cls} onClick={() => n.focus && demo.setFocusRow({ href: DESIGNS_HREF, id: n.focus })}>
          {n.icon ?? null}
          {n.label}
          {!n.icon && <IconArrow />}
        </Link>
      );
    } else if (n.drawing) {
      const d = n.drawing;
      action = (
        <button type="button" className={cls} aria-disabled={pause.pending !== null} onClick={(e) => markSent(d, e.currentTarget)}>
          {n.icon}
          {n.label}
        </button>
      );
    } else if (n.review) {
      const expanded = open === n.id;
      action = (
        <button
          type="button"
          className={expanded ? rowBtn : cls}
          aria-expanded={expanded}
          onClick={() => {
            if (expanded && pause.pending !== null) pause.cancel();
            setOpen(expanded ? null : n.id);
          }}
        >
          {expanded ? "Close" : n.label}
        </button>
      );
    }
    return (
      <li key={n.id} className="glass-row px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="min-w-0 flex-[1_1_14rem]">
            <p className="truncate text-15 font-semibold text-ink">{n.title}</p>
            {n.project && <p className="truncate text-13 text-ink-soft">{n.project}</p>}
          </div>
          <StatusChip tone={n.chip.tone}>{n.chip.words}</StatusChip>
          {action}
        </div>
        {n.review && open === n.id && <ReviewPanel task={n.review} by={me.id} onDone={() => setOpen(null)} />}
      </li>
    );
  };

  return (
    <>
      <StaffBoard place="Desk" headline={headline} />

      <div className="mt-6 grid gap-4 lg:mt-8">
        <Stats label="At a glance">
          <Stat
            label="This week"
            value={week.length}
            href={DESIGNS_HREF}
            note={weekLate > 0 ? <StatusChip tone="late">{`${weekLate} late`}</StatusChip> : undefined}
          />
          <Stat
            label="With client"
            value={withClient.length}
            note={
              withClient.length > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-13 text-ink-soft">
                  <IconEye /> {viewed} viewed
                </span>
              ) : undefined
            }
          />
          <Stat
            label="Drawings due"
            value={drawings.length}
            note={lateDrawings > 0 ? <StatusChip tone="late">{`${lateDrawings} late`}</StatusChip> : undefined}
          />
          {me.senior ? (
            <Stat label="Changes open" value={changesOpen} />
          ) : (
            <Stat
              label="In review"
              value={firm.tasks.filter((t) => t.person === me.id && t.status === "submitted" && inScope(t.projectId)).length}
              href="/staff/architect/tasks"
            />
          )}
        </Stats>

        <div className="grid items-start gap-4 min-[1200px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="grid min-w-0 gap-4">
            <Panel title="Needs you">
              {needs.length === 0 ? (
                <Empty>
                  <span className="inline-flex items-center gap-2">
                    <IconCheck /> Nothing waiting
                  </span>
                </Empty>
              ) : (
                <ul className="grid grid-cols-1 gap-1">{needs.map(needRow)}</ul>
              )}
            </Panel>

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
                          className="glass-row flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5"
                        >
                          <span className="min-w-0 flex-[1_1_12rem]">
                            <span className="block truncate text-15 font-semibold text-ink">{item?.title ?? t.name}</span>
                            <span className="block truncate text-13 text-ink-soft">
                              {[name(t.projectId), weeksLabel(t.clock, t.fromWeek, t.toWeek), who].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          {item?.status === "waiting" && (
                            <IconEye label={item.viewed ? "Viewed" : "Not viewed"} className={item.viewed ? "text-kota" : "text-ink-soft"} />
                          )}
                          <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
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
            <ul className="grid grid-cols-1 gap-1">
              {changes.slice(0, 5).map((r) => (
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
      </div>
    </>
  );
}
