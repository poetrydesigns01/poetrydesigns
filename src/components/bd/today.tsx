/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { usePause } from "@/components/register/recording-pause";
import { Empty, IconArrow, Panel, rowBtn, Stat, Stats } from "@/components/architect/glass-ui";
import { useScope } from "@/components/register/project-switch";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { AttentionList } from "@/components/shared/attention-list";
import { taskActionFor } from "@/components/shared/task-action";
import { NpsScore } from "@/components/shared/nps-score";
import { ProjectTile } from "@/components/shared/project-tile";
import { TODAY } from "@/lib/demo-data";
import { DESK_HREF, replyWords, type AttentionItem } from "@/lib/desk";
import { useDemo, useFirm } from "@/lib/demo-store";
import { addDays } from "@/lib/format";
import { UNDER_DISCUSSION } from "@/lib/prospects";
import { todayItems } from "@/lib/today-count";
import { ME } from "./prospect-bits";
import { BdTaskRow, bdTasksOf } from "./plan-panel";

// Rohan's Today: everything waiting on him, urgent first and marked in brick, with how long
// each has waited; the projects that need him; and how his clients feel (NPS, with its count,
// and how fast he answers them).

/** "Resend" on a client's invitation not taken up: one press, then the pause. */
function ResendInvite({ item }: { item: AttentionItem }) {
  const demo = useDemo();
  const pause = usePause();
  const projectId = item.projectId;
  if (!projectId) return null;
  return (
    <button
      type="button"
      className="btn btn-glass btn-sm"
      aria-disabled={pause.pending !== null ? true : undefined}
      onClick={(event) => {
        if (pause.pending !== null) return;
        const { record } = demo;
        pause.start({
          what: `Invite for ${item.projectName ?? "the client"}, sent again`,
          origin: event.currentTarget,
          commit: () => record({ kind: "invite.resent", projectId, by: ME }),
        });
      }}
    >
      Resend
    </button>
  );
}

export function BdToday() {
  const firm = useFirm();
  const scope = useScope("bd");
  const me = firm.person(ME);
  const first = me?.first ?? "Rohan";
  const inScope = (projectId?: string) => scope === "all" || projectId === scope;

  // The rows the rail's Today figure counts: a lead has no project, so it shows under all projects only.
  const items = todayItems(firm, "bd", ME, scope);
  const urgent = items.filter((x) => x.tier === "urgent").length;
  const projects = firm.projectsNeedingAttention(ME).filter((x) => inScope(x.projectId));
  const nps = firm.npsForPerson(ME);
  const engagement = firm.engagement(ME);

  const prospects = firm.prospectsFor(ME).filter((p) => p.status === "active");
  const followUps = prospects.filter((p) => p.followUpDue).length;
  const setting = firm.drafts.filter((d) => d.by === ME && !d.opened && (d.stepsDone > 0 || d.fromProspect)).length;
  const escalations = firm.escalationsFor(ME).filter((r) => r.escalation?.open && inScope(r.projectId)).length;

  // Plan tasks the business team supports (sign-up, design brief, approvals), open and
  // started or starting within two weeks, on the clients Rohan holds.
  const soon = addDays(TODAY, 14);
  const bdTasks = firm.projects
    .filter((p) => p.phase !== "draft" && firm.advisorOf(p.id) === ME && inScope(p.id))
    .flatMap((p) => bdTasksOf(firm, p.id).map((task) => ({ ...task, project: p.name })))
    .filter((x) => x.t.state !== "done" && x.t.plannedStart <= soon)
    .sort((a, b) => b.t.daysLate - a.t.daysLate || a.t.plannedStart.localeCompare(b.t.plannedStart));

  // The same figure as the rail's Today; the urgent ones are the state line.
  const headline = items.length > 0 ? `${items.length} waiting on you, ${first}` : `All clear, ${first}`;

  return (
    <>
      <StaffBoard
        place="Today"
        headline={headline}
        state={urgent > 0 ? `${urgent} urgent` : undefined}
        primary={{ label: "New enquiry", href: `${DESK_HREF.prospects}/new` }}
      />
      <div className="mt-6 grid gap-4 lg:mt-8">
        <Stats label="At a glance">
          <Stat label={UNDER_DISCUSSION} value={prospects.length} href={DESK_HREF.prospects} />
          <Stat label="Follow-ups due" value={followUps} tone={followUps > 0 ? "late" : undefined} href={DESK_HREF.prospects} />
          <Stat label="Onboarding" value={setting} href="/staff/bd/onboard" />
          <Stat label="Escalations" value={escalations} tone={escalations > 0 ? "late" : undefined} href={DESK_HREF.escalations} />
        </Stats>

        <div className="grid items-start gap-4 min-[1200px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="grid min-w-0 gap-4">
            <section className="grid gap-2" aria-labelledby="bd-waiting">
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 id="bd-waiting" className="text-17 font-semibold text-ink">
                  Waiting on you
                </h2>
                {urgent > 0 && <span className="glass-chip chip-late">{urgent} urgent</span>}
              </div>
              <AttentionList
                items={items}
                label="Waiting on you"
                empty="Nothing waiting"
                action={(item) => (item.id.startsWith("invite:") ? <ResendInvite item={item} /> : taskActionFor(firm, item.id, ME))}
              />
            </section>

            {bdTasks.length > 0 && (
              <Panel title="Business team">
                <ul className="grid grid-cols-1 gap-1">
                  {bdTasks.slice(0, 5).map((task) => (
                    <BdTaskRow key={task.t.id} task={task} project={task.project} />
                  ))}
                </ul>
              </Panel>
            )}
          </div>

          <div className="grid min-w-0 gap-4">
            <section className="glass-dark grid gap-4 p-5" aria-label="Relationships">
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="lettering text-lime/75">Client score</p>
                  <NpsScore
                    value={nps.nps}
                    count={nps.count}
                    promoters={nps.promoters}
                    passives={nps.passives}
                    detractors={nps.detractors}
                    size="lg"
                    dark
                  />
                </div>
                <span className="text-13 text-lime/75">{engagement.clients} clients</span>
              </div>
              <dl className="grid grid-cols-3 gap-2 border-t border-lime/15 pt-3">
                <div className="grid gap-0.5">
                  <dt className="lettering text-lime/75">Reply</dt>
                  <dd className="figure text-17">{replyWords(engagement.medianReplyHours)}</dd>
                </div>
                <div className="grid gap-0.5">
                  <dt className="lettering text-lime/75">Unanswered</dt>
                  <dd className={`figure text-17 ${engagement.unanswered > 0 ? "late-text" : ""}`}>{engagement.unanswered}</dd>
                </div>
                <div className="grid gap-0.5">
                  <dt className="lettering text-lime/75">Escalated</dt>
                  <dd className={`figure text-17 ${engagement.escalationsOpen > 0 ? "late-text" : ""}`}>{engagement.escalationsOpen}</dd>
                </div>
              </dl>
            </section>

            <Panel
              title="Needs attention"
              aside={
                <Link href="/staff/bd/projects" className={rowBtn}>
                  Projects <IconArrow />
                </Link>
              }
            >
              {projects.length === 0 ? (
                <Empty>All on track</Empty>
              ) : (
                <ul className="grid grid-cols-1 gap-1">
                  {projects.slice(0, 5).map((x) => (
                    <li key={x.projectId}>
                      <ProjectTile
                        project={x.project}
                        size="row"
                        className={x.tier === "urgent" ? "shadow-[inset_3px_0_0_var(--color-brick)]" : ""}
                        showStage={!x.reasons.some((r) => r.kind === "held")}
                        badge={x.reasons.slice(0, 2).map((r) => (
                          <StatusChip key={r.kind + r.words} tone={r.tone}>
                            {r.words}
                          </StatusChip>
                        ))}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
