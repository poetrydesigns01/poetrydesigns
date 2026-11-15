"use client";

import Link from "next/link";
import { useId } from "react";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import { useFirm } from "@/lib/demo-store";
import type { Firm } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { daysBetween, datePart, formatShortDate } from "@/lib/format";
import type { SiteMilestoneView, SiteStageView, SiteTaskView, Tone } from "@/lib/portal";
import { Icon, PanelHead, ProgressBar, dateSpan, requestHref, type IconName } from "./site-kit";

// The milestone pieces the site screens share, all read from the project's plan: the
// meter for the board, the lock while a milestone's instalment is not in, the next
// milestone waiting on its instalment, and what the site is waiting for from the design side.

/** The milestone's progress, for the board. */
export function StageMeter({ stage }: { stage: SiteMilestoneView }) {
  const done = stage.tasks.filter((t) => t.state === "done").length;
  return (
    <div className="grid w-full gap-2">
      <div className="flex items-end justify-between gap-3">
        <p className="figure text-32 leading-none">
          {stage.percent}
          <span className="text-17">%</span>
        </p>
        <p className="lettering text-lime/75">
          {done} of {stage.tasks.length} done
        </p>
      </div>
      <ProgressBar value={stage.percent} dark label={`Milestone ${stage.n} progress`} />
    </div>
  );
}

/** "Milestone 4 · 26 Oct – 22 Nov", for the board's state line. */
export function milestoneLine(stage: SiteMilestoneView): string {
  return `${stage.name} · ${dateSpan(stage.plannedStart, stage.plannedEnd)}`;
}

/** The instalment a milestone opens with, as a chip: "Demand letter raised", "Payment received". */
export function useInstalment(projectId: ProjectId, n: number) {
  const firm = useFirm();
  return firm.payments(projectId).find((p) => p.n === n) ?? null;
}

function InstalmentLine({ projectId, n }: { projectId: ProjectId; n: number }) {
  const pay = useInstalment(projectId, n);
  if (!pay) return null;
  const due = pay.dueDate ?? pay.expectedDueDate;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-15 text-ink">{pay.instalmentLabel}</span>
      <StatusChip tone={pay.tone}>{pay.status}</StatusChip>
      {pay.state !== "paid" && <span className="text-13 text-ink-soft">Due {formatShortDate(due)}</span>}
    </span>
  );
}

/** A slim banner when the milestone in hand waits on its instalment. */
export function LockBanner({ stage }: { stage: SiteMilestoneView }) {
  if (!stage.locked) return null;
  return (
    <div className="glass-strong flex items-center gap-3 px-4 py-3" role="status">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brass/15 text-brass-deep">
        <Icon name="lock" />
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="text-15 font-semibold text-ink">{stage.name} locked</p>
        <InstalmentLine projectId={stage.projectId} n={stage.n} />
      </div>
    </div>
  );
}

/** One task of the next milestone, short: its name, who, and the materials to request ahead. */
function NextRow({ task, person }: { task: SiteTaskView; person: PersonId }) {
  const toRequest = task.materials.filter((m) => m.status === "to-request" && !m.requestNo);
  const first = toRequest[0];
  return (
    <li className="glass-row flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5">
      <span className="flex min-w-0 flex-1 basis-40 items-center gap-2.5">
        <Icon name={task.locked ? "lock" : "calendar"} className="size-4.5 shrink-0 text-ink-soft" />
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate text-15 text-ink">{task.title}</span>
          <span className="text-13 text-ink-soft">
            {task.assignee === person ? "You" : task.assigneeName.split(" ")[0] || "Site"}
            {task.workOrders.length > 0 && ` · ${task.workOrders.length} crew`}
          </span>
        </span>
      </span>
      {first ? (
        <Link
          href={requestHref(task, first)}
          className="btn btn-glass btn-sm gap-1.5"
          aria-label={`Request ${toRequest.length} for ${task.title}`}
        >
          <Icon name="plus" className="size-4.5" />
          <span className={first.short ? "late-text" : undefined}>{toRequest.length} to request</span>
        </Link>
      ) : (
        <StatusChip tone={task.locked ? "locked" : "waiting"}>{task.locked ? "Locked" : formatShortDate(task.plannedStart)}</StatusChip>
      )}
    </li>
  );
}

/** The milestone after the one in hand: when it starts, its instalment, its tasks. */
export function NextMilestone({
  stage,
  person,
  hide = [],
}: {
  stage: SiteStageView;
  person: PersonId;
  /** Tasks already shown as cards above. */
  hide?: string[];
}) {
  const id = useId();
  const next = stage.next;
  if (!next) return null;
  // Design items for it are listed under Awaited.
  const tasks = next.tasks.filter((t) => t.track !== "design" && !hide.includes(t.id));
  return (
    <section className="glass p-2 sm:p-3" aria-labelledby={id}>
      <PanelHead id={id} title={`Next · ${next.name}`} icon={next.locked ? "lock" : "flag"}>
        <StatusChip tone={next.locked ? "locked" : "progress"}>{next.locked ? "Locked" : "Open"}</StatusChip>
      </PanelHead>
      <div className="grid gap-1.5 px-2 pb-2">
        <p className="text-17 font-semibold text-ink">{next.short}</p>
        <p className="flex items-center gap-1.5 text-13 text-ink-soft">
          <Icon name="calendar" className="size-4.5" />
          From {formatShortDate(next.plannedStart)}
        </p>
        <InstalmentLine projectId={next.projectId} n={next.n} />
      </div>
      {tasks.length > 0 && (
        <ul className="grid gap-1">
          {tasks.map((t) => (
            <NextRow key={t.id} task={t} person={person} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ---- Awaited from design ----

export type AwaitedItem = {
  key: string;
  icon: IconName;
  /** "S-212", for a drawing sheet. */
  sheet?: string;
  title: string;
  /** Who it is with: "Ananya", "Client". */
  who: string;
  /** When the site needs it. */
  need: string | null;
  chip: { words: string; tone: Tone };
  daysLate: number;
};

/**
 * What the site waits for from the design side: the plan's design tasks for project
 * initiation, the milestone in hand and the next (MEP drawings, structural details,
 * door frames, tile schedules), and the drawing sheets not yet in. Late ones first.
 */
export function awaitedFor(firm: Firm, projectId: ProjectId): AwaitedItem[] {
  const plan = firm.plan(projectId);
  const cur = plan?.currentMilestone ?? null;
  const items = firm.designStages(projectId).flatMap((s) => s.items);
  const design: AwaitedItem[] = (plan?.tasks ?? [])
    .filter(
      (t) =>
        t.track === "design" &&
        t.state !== "done" &&
        (t.stage === "initiation" || (cur !== null && t.milestone !== null && t.milestone <= cur + 1)),
    )
    .map((t) => {
      const item = items.find((i) => i.id === t.templateId);
      const withClient = t.clientApproves && item?.status === "waiting";
      const need = item?.neededBy ?? t.plannedEnd;
      const since = withClient && item?.uploadedAt ? daysBetween(datePart(item.uploadedAt), TODAY) : 0;
      const chip =
        t.daysLate > 0
          ? { words: `${t.daysLate} d late`, tone: "late" as const }
          : t.state === "locked"
            ? { words: "Locked", tone: "locked" as const }
            : withClient
              ? { words: since > 0 ? `With client ${since} d` : "With client", tone: "waiting" as const }
              : item?.status === "modify"
                ? { words: "Being revised", tone: "progress" as const }
                : { words: "In design", tone: "progress" as const };
      return {
        key: t.id,
        icon: "pencil" as const,
        title: t.name,
        who: withClient ? "Client" : ((t.assignee ? firm.person(t.assignee)?.first : undefined) ?? "Architect"),
        need,
        chip,
        daysLate: t.daysLate,
      };
    });
  const drawings: AwaitedItem[] = firm.siteDrawings
    .filter((d) => d.projectId === projectId && d.status === "awaited")
    .map((d) => ({
      key: d.id,
      icon: "sheet" as const,
      sheet: d.sheet,
      title: d.title,
      who: d.byName.split(" ")[0],
      need: d.neededBy,
      chip: d.daysLate > 0 ? { words: `${d.daysLate} d late`, tone: "late" as const } : { words: "Awaited", tone: "waiting" as const },
      daysLate: d.daysLate,
    }));
  const rank = (a: AwaitedItem) => (a.daysLate > 0 ? 0 : a.chip.tone === "locked" ? 2 : 1);
  return [...design, ...drawings].sort(
    (a, b) => rank(a) - rank(b) || b.daysLate - a.daysLate || (a.need ?? "").localeCompare(b.need ?? ""),
  );
}

/** Design items and drawings the site is waiting on, days late in red. */
export function AwaitedPanel({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const id = useId();
  const items = awaitedFor(firm, projectId);
  const late = items.filter((i) => i.daysLate > 0).length;
  return (
    <section className="glass p-2 sm:p-3" aria-labelledby={id}>
      <PanelHead id={id} title="Awaited" icon="sheet" count={items.length}>
        {late > 0 && <StatusChip tone="late">{late} late</StatusChip>}
      </PanelHead>
      {items.length === 0 ? (
        <p className="px-2 pb-2 text-15 text-ink-soft">All in</p>
      ) : (
        <ul className="grid gap-1">
          {items.map((a) => (
            <li key={a.key} className="glass-row flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon name={a.icon} className="size-4.5 shrink-0 text-laterite" />
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-15 text-ink">
                    {a.sheet && <span className="figure">{a.sheet} </span>}
                    {a.title}
                  </span>
                  <span className="text-13 text-ink-soft">
                    {a.who}
                    {a.need && ` · need ${formatShortDate(a.need)}`}
                  </span>
                </span>
              </span>
              <StatusChip tone={a.chip.tone}>{a.chip.words}</StatusChip>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
