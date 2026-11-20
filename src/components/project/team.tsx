/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { Count, Empty, Initials, Panel } from "@/components/admin/glass-kit";
import { usePause } from "@/components/register/recording-pause";
import { StatusChip } from "@/components/register/status-chip";
import type { ArchitectMember, ArchitectStrengths, ArchitectSuggestion } from "@/lib/desk";
import { useDemo, useFirm } from "@/lib/demo-store";
import { templateOf, type PersonId, type ProjectId } from "@/lib/firm-data";
import { datePart, formatShortDate } from "@/lib/format";
import { useProjectViewer } from "./viewer";

// The architects on one project: the Project Head, the juniors assigned or invited, and (for
// the head and the admin) the juniors who fit this project best, ranked on the kind of house
// they have worked on, how often their drawings pass first time and how fast they turn work
// round. Invite asks the junior first; Assign puts them on at once. The studio's Team page
// stays the place to watch each person's work.

/** Two or three facts that say why someone fits: "4 city villas · 3.2 d turnaround · 80% first time". */
export function fitFacts(s: ArchitectStrengths, suggestion?: ArchitectSuggestion): string[] {
  const kind = suggestion?.reasons.find((r) => !/%| live$/.test(r));
  const facts = [
    kind,
    s.avgTurnaroundDays !== null ? `${s.avgTurnaroundDays.toFixed(1)} d turnaround` : null,
    s.firstTimePercent !== null ? `${s.firstTimePercent}% first time` : s.onTimePercent !== null ? `${s.onTimePercent}% on time` : null,
    `${s.liveProjects} live`,
  ].filter((f): f is string => Boolean(f));
  return facts.slice(0, 3);
}

function since(at: string): string {
  return formatShortDate(datePart(at));
}

export function ProjectTeam({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const viewer = useProjectViewer();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;

  const team = firm.architectTeam(projectId);
  const head = firm.person(team.head);
  const canManage = viewer.id === team.head || viewer.admin;
  const by: PersonId = viewer.admin ? "shalini" : viewer.id;
  const ranked = firm.suggestArchitects(projectId);
  const suggestions = canManage && p.phase !== "handed-over" ? ranked : [];
  const mine = team.members.find((m) => m.personId === viewer.id && m.state === "invited");
  const kind = templateOf(p.category).name;
  const firstOf = (id: PersonId) => firm.person(id)?.first ?? id;

  const act = (what: string, origin: HTMLElement, commit: () => void) => {
    if (pause.pending !== null) return;
    pause.start({ what, origin, commit });
  };

  const memberRow = (m: ArchitectMember) => {
    const person = firm.person(m.personId);
    const facts = fitFacts(
      firm.architectStrengths(m.personId),
      ranked.find((s) => s.personId === m.personId),
    );
    const name = person?.name ?? m.personId;
    return (
      <li key={m.personId} className="glass-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5">
        <Initials name={name} />
        <span className="grid min-w-0 justify-items-start gap-1">
          <span className="max-w-full truncate text-15 font-semibold">{name}</span>
          <span className="max-w-full text-13 text-ink-soft">
            {m.state === "invited" ? `${since(m.since)} · ${firstOf(m.by)}` : facts.join(" · ")}
          </span>
          <StatusChip tone={m.state === "invited" ? "waiting" : "done"}>{m.state === "invited" ? "Invited" : "Assigned"}</StatusChip>
        </span>
        {canManage && (
          <button
            type="button"
            className="btn btn-glass min-h-11 px-4 text-15"
            aria-disabled={pause.pending !== null || undefined}
            aria-label={`${m.state === "invited" ? "Withdraw the invitation to" : "Remove"} ${name}`}
            onClick={(e) =>
              act(
                `${name} ${m.state === "invited" ? "invitation withdrawn" : `taken off ${p.name}`}`,
                e.currentTarget,
                () => demo.removeArchitect(projectId, m.personId, by, m.state === "invited" ? "Invitation withdrawn" : undefined),
              )
            }
          >
            {m.state === "invited" ? "Withdraw" : "Remove"}
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="grid gap-5">
      {mine && <InviteCard projectId={projectId} invite={mine} />}

      <div className={`grid items-start gap-5 ${suggestions.length > 0 ? "lg:grid-cols-2" : ""}`}>
        <Panel title="Architects" aside={<span className="glass-chip">{kind}</span>}>
          <ul className="grid gap-1">
            <li className="glass-row flex items-center gap-3 px-3 py-2.5">
              <Initials name={head?.name ?? team.head} />
              <span className="min-w-0 flex-1 truncate text-15 font-semibold">{head?.name ?? team.head}</span>
              <span className="glass-chip shrink-0">Project Head</span>
            </li>
            {team.members.map(memberRow)}
          </ul>
          {team.members.length === 0 && <Empty>No juniors yet</Empty>}
        </Panel>

        {suggestions.length > 0 && (
          <Panel title="Best fit" aside={<Count n={suggestions.filter((s) => !s.state).length} />}>
            <ol className="grid gap-1">
              {suggestions.map((s, i) => {
                const facts = fitFacts(firm.architectStrengths(s.personId), s);
                return (
                  <li key={s.personId} className="glass-row flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
                    <span className="figure w-5 shrink-0 text-17 text-ink-soft" aria-label={`Rank ${i + 1}`}>
                      {i + 1}
                    </span>
                    <span className="grid min-w-0 flex-[1_1_12rem] gap-0.5">
                      <span className="truncate text-15 font-semibold">{s.name}</span>
                      <span className="text-13 text-ink-soft">{facts.join(" · ")}</span>
                    </span>
                    {s.state ? (
                      <StatusChip tone={s.state === "invited" ? "waiting" : "done"}>
                        {s.state === "invited" ? "Invited" : "On project"}
                      </StatusChip>
                    ) : (
                      <span className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-glass min-h-11 px-4 text-15"
                          aria-disabled={pause.pending !== null || undefined}
                          aria-label={`Invite ${s.name}`}
                          onClick={(e) =>
                            act(`${s.name} invited to ${p.name}`, e.currentTarget, () => demo.inviteArchitect(projectId, s.personId, by))
                          }
                        >
                          Invite
                        </button>
                        <button
                          type="button"
                          className="btn btn-glass min-h-11 px-4 text-15"
                          aria-disabled={pause.pending !== null || undefined}
                          aria-label={`Assign ${s.name}`}
                          onClick={(e) =>
                            act(`${s.name} assigned to ${p.name}`, e.currentTarget, () => demo.assignArchitect(projectId, s.personId, by))
                          }
                        >
                          Assign
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </Panel>
        )}
      </div>
    </div>
  );
}

/** The invitee's answer: join the project or decline. One per screen, on rosewood glass. */
export function InviteCard({ projectId, invite }: { projectId: ProjectId; invite: ArchitectMember }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const viewer = useProjectViewer();
  const p = firm.project(projectId);
  const from = firm.person(invite.by);
  if (!p) return null;
  const answer = (join: boolean, origin: HTMLElement) => {
    if (pause.pending !== null) return;
    pause.start({
      what: join ? `Joined ${p.name}` : `Invitation to ${p.name} declined`,
      origin,
      commit: () =>
        join
          ? demo.assignArchitect(projectId, viewer.id, viewer.id)
          : demo.removeArchitect(projectId, viewer.id, viewer.id, "Declined"),
    });
  };
  return (
    <section aria-label="Invitation" className="glass-dark flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
      <div className="grid min-w-0 gap-1">
        <p className="lettering text-lime/75">Invited · {since(invite.since)}</p>
        <p className="text-17 font-semibold">From {from?.name ?? invite.by}</p>
        {invite.note && <p className="text-15 text-lime/75">{invite.note}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary min-h-12 px-5"
          aria-disabled={pause.pending !== null || undefined}
          onClick={(e) => answer(true, e.currentTarget)}
        >
          Join {p.name}
        </button>
        <button
          type="button"
          className="btn btn-glass min-h-12 px-5"
          aria-disabled={pause.pending !== null || undefined}
          onClick={(e) => answer(false, e.currentTarget)}
        >
          Decline
        </button>
      </div>
    </section>
  );
}
