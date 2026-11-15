"use client";

import Link from "next/link";
import { useId } from "react";
import { useScope } from "@/components/register/project-switch";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm, useViewer } from "@/lib/demo-store";
import type { ProjectId } from "@/lib/firm-data";
import { formatShortDate } from "@/lib/format";
import { AwaitedPanel, LockBanner, NextMilestone, StageMeter, awaitedFor, milestoneLine } from "./milestone";
import { NeedsYou } from "./rows";
import {
  Icon,
  PHOTO_EVERY_DAYS,
  PanelHead,
  StatStrip,
  byUrgency,
  heldUp,
  isMine,
  isOpenRequest,
  lastPhotos,
  openTurns,
  procurementDays,
  requestStatus,
  requestTitle,
  siteTasksOf,
} from "./site-kit";
import { TaskCard } from "./task-card";
import "./site.css";

// The site engineer's action screen, from the project's plan: the milestone in hand and how
// far it is, a lock while its instalment is not in, the three things he does, his tasks,
// and the next milestone waiting on its instalment. Design items and drawings the site
// waits for, what needs him and the site requests stand at the side.

function SideRequests({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const id = useId();
  const open = firm.requests
    .filter((r) => r.projectId === projectId && isOpenRequest(r))
    .sort((a, b) => b.at.localeCompare(a.at) || b.no.localeCompare(a.no));
  const shown = open.slice(0, 4);
  return (
    <section className="glass p-2 sm:p-3" aria-labelledby={id}>
      <PanelHead id={id} title="Site requests" icon="truck" count={open.length}>
        <Link href="/staff/site/requests" className="link inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-15 text-ink">
          Mine
        </Link>
      </PanelHead>
      {shown.length === 0 ? (
        <p className="px-2 pb-2 text-15 text-ink-soft">None open</p>
      ) : (
        <ul className="grid gap-1">
          {shown.map((r) => {
            const s = requestStatus(r);
            const days = procurementDays(r);
            const waiting = r.pos.length === 0 && !r.queued;
            return (
              <li key={r.no} className="glass-row">
                <Link href={`/staff/site/requests/${r.no}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="grid min-w-0 gap-0.5">
                    <span className="truncate text-15 text-ink">{requestTitle(r, firm)}</span>
                    <span className="text-13 text-ink-soft">
                      {waiting ? (
                        <span className={days > 3 ? "late-text" : undefined}>{days} d waiting</span>
                      ) : (
                        `Need ${formatShortDate(r.neededBy)}`
                      )}
                    </span>
                  </span>
                  <StatusChip tone={s.tone}>{s.words}</StatusChip>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function SiteToday() {
  const firm = useFirm();
  const me = useViewer("site");
  const scope = useScope("site");
  const projectId: ProjectId = scope === "all" ? "iyer" : scope;
  const project = firm.project(projectId);
  const stage = firm.siteStage(projectId);
  const turns = openTurns(firm.turns(me.id, projectId), firm);
  const tasksId = useId();

  if (!project || !stage) {
    return (
      <div className="site-screen">
        <StaffBoard place="Today" headline={project?.name ?? "Today"} />
        <NeedsYou items={turns} person={me.id} />
        <p className="glass px-4 py-3 text-15 text-ink">No milestone on site</p>
      </div>
    );
  }

  // The site does the engineering; design tasks show as what it waits for.
  const work = stage.tasks.filter((t) => t.track !== "design");
  // A senior sees the milestone's work; a junior the tasks given to him, this milestone or the next.
  const shown = (me.senior ? work : siteTasksOf(stage).filter((t) => isMine(t, me.id))).sort(byUrgency);
  const late = stage.tasks.filter(heldUp).length;
  const toRequest = siteTasksOf(stage)
    .flatMap((t) => t.materials)
    .filter((m) => m.status === "to-request" && !m.requestNo);
  const awaitedLate = awaitedFor(firm, projectId).filter((a) => a.daysLate > 0).length;
  // Every request procurement still owes this site, ordered in part or not at all.
  const openRequests = firm.requests.filter((r) => r.projectId === projectId && isOpenRequest(r));
  const slowRequests = openRequests.filter((r) => r.pos.length === 0 && procurementDays(r) > 3).length;
  const photos = lastPhotos(firm, projectId, me.id);
  const photosLate = !photos || photos.days > PHOTO_EVERY_DAYS;
  const week = firm.plan(projectId)?.todayWeek ?? 0;

  return (
    <div className="site-screen">
      <StaffBoard
        place={week > 0 ? `Today · Week ${week}` : "Today"}
        headline={stage.short}
        state={milestoneLine(stage)}
        picture={<StageMeter stage={stage} />}
      />

      <LockBanner stage={stage} />

      <nav aria-label="Site actions" className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {/* On a phone the shell's bar above the tabs is "Request material". */}
        <div className="hidden lg:grid">
          <Link href="/staff/site/request" className="btn btn-primary btn-tile">
            <Icon name="plus" />
            Request material
          </Link>
        </div>
        <Link href="/staff/site/update" className="btn btn-glass btn-tile">
          <Icon name="camera" />
          Post site photos
        </Link>
        <Link href={`/staff/site/stage?project=${projectId}`} className="btn btn-glass btn-tile">
          <Icon name="flag" />
          Milestone done
        </Link>
      </nav>

      <StatStrip
        label="This milestone"
        items={[
          { icon: "clock", label: "Held up", value: late, alert: late > 0 },
          { icon: "box", label: "To request", value: toRequest.length, alert: toRequest.some((m) => m.short) },
          { icon: "sheet", label: "Awaited late", value: awaitedLate, alert: awaitedLate > 0 },
          { icon: "truck", label: "Open requests", value: openRequests.length, alert: slowRequests > 0 },
          { icon: "camera", label: "Last photos", value: photos?.words ?? "None", alert: photosLate },
        ]}
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          <section className="grid gap-2" aria-labelledby={tasksId}>
            <div className="glass px-2 py-1 sm:px-3">
              <PanelHead id={tasksId} title={me.senior ? stage.name : "My tasks"} icon="calendar" count={shown.length}>
                <Link
                  href="/staff/site/tasks"
                  className="link inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-15 text-ink"
                >
                  All
                </Link>
              </PanelHead>
            </div>
            {shown.length === 0 ? (
              <p className="glass px-4 py-3 text-15 text-ink">Nothing assigned</p>
            ) : (
              <div className="grid gap-2">
                {shown.map((t) => (
                  <TaskCard key={t.id} task={t} person={me.id} />
                ))}
              </div>
            )}
          </section>
          <NextMilestone stage={stage} person={me.id} hide={shown.map((t) => t.id)} />
        </div>

        <div className="grid gap-4">
          <NeedsYou items={turns} person={me.id} />
          <AwaitedPanel projectId={projectId} />
          <SideRequests projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
