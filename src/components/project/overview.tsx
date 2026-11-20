/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { dayWords, stageChip } from "@/components/admin/admin-data";
import { Count, Empty, Icon, Initials, inrShort, Panel, StatCard } from "@/components/admin/glass-kit";
import { StatusChip } from "@/components/register/status-chip";
import { ThumbnailUpload } from "@/components/shared/thumbnail-upload";
import { useFirm } from "@/lib/demo-store";
import type { FeeView } from "@/lib/fees";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { datePart, formatShortDate, hours, inr, listWords } from "@/lib/format";
import type { Tone } from "@/lib/portal";
import { currentStage, Fact, StageStrip, Stats } from "./record-kit";
import { requestTitle } from "./requests";
import { InviteCard } from "./team";
import { useProjectViewer } from "./viewer";

// The project at a glance: three figures, the contract as a list of facts, the team as rows, the
// hand-off note, the payment stages as one strip with the stage that matters now, the client's
// latest score (0 to 10; the NPS counts each client's latest answer, so a project shows that
// score, not an NPS of its own), the architect fees, and (for the Project Head and the admin)
// the project's picture.

type Member = { id: PersonId; role: string };

const BAND: Record<"promoter" | "passive" | "detractor", { words: string; tone: Tone }> = {
  promoter: { words: "Promoter", tone: "done" },
  passive: { words: "Passive", tone: "waiting" },
  detractor: { words: "Detractor", tone: "late" },
};

const FEE_CHIP: Record<FeeView["state"], { words: string; tone: Tone }> = {
  "with-client": { words: "With client", tone: "waiting" },
  approved: { words: "To bill", tone: "progress" },
  declined: { words: "Declined", tone: "locked" },
  billed: { words: "Billed", tone: "progress" },
  paid: { words: "Paid", tone: "done" },
  waived: { words: "Waived", tone: "done" },
};

export function ProjectOverview({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const viewer = useProjectViewer();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;

  const invite = firm.architectTeam(p.id).members.find((m) => m.personId === viewer.id && m.state === "invited");
  const nps = firm.npsForProject(p.id);
  const latest = nps.latest;
  const earlier = nps.answers.slice(1, 4);
  const fees = firm.feesFor(p.id);
  const mayPicture = viewer.admin || viewer.id === p.team.head;

  const stages = firm.payments(p.id);
  const now = currentStage(stages);
  const timeline = firm.timeline(p.id);
  const site = firm.siteStage(p.id);

  const team: Member[] = [];
  const add = (id: PersonId, role: string) => {
    const known = team.find((m) => m.id === id);
    if (known) known.role = `${known.role} · ${role}`;
    else team.push({ id, role });
  };
  add(p.team.head, "Project Head");
  add(firm.advisorOf(p.id), "Contact");
  p.team.architects.forEach((id) => add(id, "Architect"));
  p.team.engineers.forEach((id) => add(id, "Site"));
  p.team.procurement.forEach((id) => add(id, "Procurement"));
  const onboarder = firm.person(p.onboardedBy)?.name ?? p.onboardedBy;

  return (
    <div className="grid gap-5">
      {invite && <InviteCard projectId={p.id} invite={invite} />}

      <Stats cols={3} label="At a glance">
        <StatCard label="Contract" value={inrShort(p.contractValue)} sub="Before GST" icon="file" />
        <StatCard
          label="Site"
          value={site ? `${site.percent}%` : p.phase === "handed-over" ? "Done" : "–"}
          sub={site ? site.name : stageChip(p)}
          icon="hammer"
        />
        <StatCard
          label="Handover"
          value={timeline ? dayWords(timeline.handoverExpected) : "–"}
          sub={
            timeline && timeline.extraDays > 0 ? (
              <span className="late-text">+{timeline.extraDays} days</span>
            ) : timeline ? (
              "On plan"
            ) : undefined
          }
          icon="clock"
        />
      </Stats>

      {stages.length > 0 && (
        <Panel
          title="Instalments"
          aside={
            <Link
              href={`/staff/projects/${p.id}/programme`}
              className="link inline-flex min-h-11 items-center gap-1 text-15"
            >
              Programme <Icon name="arrow" />
            </Link>
          }
        >
          <div className="grid gap-4 px-1">
            <StageStrip stages={stages} />
            {now && (
              <div className="glass-inner flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3">
                <span className="grid min-w-0">
                  <span className="lettering text-ink-soft">{now.instalmentLabel}</span>
                  <span className="truncate text-15 font-semibold">{now.name}</span>
                </span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="figure text-17">{inr(now.total)}</span>
                  <StatusChip tone={now.tone}>{now.status}</StatusChip>
                </span>
              </div>
            )}
          </div>
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Contract">
          {/* Category and code are in the header above, so they are not said twice. */}
          <dl className="grid grid-cols-2 gap-x-6 px-1 [&>div:last-child]:border-b-0">
            <Fact label="Clients" wide>
              {listWords(p.clients)}
            </Fact>
            <Fact label="Signed">{p.signedOn ? dayWords(p.signedOn) : "–"}</Fact>
            <Fact label="Built-up">
              <span className="figure">{p.builtUpArea.toLocaleString("en-IN")}</span> sq ft
            </Fact>
            <Fact label="Rate">
              <span className="figure">{inr(p.ratePerSqFt)}</span> / sq ft
            </Fact>
            <Fact label="Perimeter">
              <span className="figure">{p.plotPerimeter}</span> ft
            </Fact>
            <Fact label="Address" wide>
              <span className="block">
                Layout <span className="figure">{p.layout}</span> · Plot <span className="figure">{p.plotNo}</span>
              </span>
              {p.address}
            </Fact>
          </dl>
        </Panel>

        <Panel
          title="Team"
          aside={
            <Link href={`/staff/projects/${p.id}/team`} className="link inline-flex min-h-11 items-center gap-1 text-15">
              Architects <Icon name="arrow" />
            </Link>
          }
        >
          <ul className="grid gap-1">
            {team.map((m) => {
              const person = firm.person(m.id);
              return (
                <li key={m.id} className="glass-row flex items-center gap-3 px-3 py-2">
                  <Initials name={person?.name ?? m.id} />
                  <span className="min-w-0 flex-1 truncate text-15 font-semibold">{person?.name ?? m.id}</span>
                  <span className="glass-chip shrink-0">{m.role}</span>
                </li>
              );
            })}
          </ul>
          {p.handoff && (
            <figure className="glass-inner mt-3 grid gap-1.5 px-3 py-3">
              <blockquote className="text-15">&ldquo;{p.handoff}&rdquo;</blockquote>
              <figcaption className="lettering text-ink-soft">
                {onboarder}
                {p.onboardedOn ? ` · ${dayWords(p.onboardedOn)}` : ""}
              </figcaption>
            </figure>
          )}
        </Panel>
      </div>

      <div className={`grid items-start gap-5 md:grid-cols-2 ${mayPicture ? "xl:grid-cols-3" : ""}`}>
        <Panel title="Client score" aside={latest ? <span className="glass-chip">{latest.point}</span> : undefined}>
          {latest ? (
            <div className="grid gap-3 px-1">
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className={`figure text-32 leading-none ${latest.band === "detractor" ? "late-text" : "text-ink"}`}>{latest.score}</span>
                <span className="text-13 text-ink-soft">/ 10</span>
                <StatusChip tone={BAND[latest.band].tone}>{BAND[latest.band].words}</StatusChip>
              </p>
              {latest.comment && (
                <blockquote className="glass-inner px-3 py-2.5 text-15">&ldquo;{latest.comment}&rdquo;</blockquote>
              )}
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-13 text-ink-soft">
                <span>{formatShortDate(datePart(latest.at))}</span>
                {earlier.length > 0 && (
                  <span>
                    · Before <span className="figure text-ink">{earlier.map((a) => a.score).join(", ")}</span>
                  </span>
                )}
                <span>· {nps.answers.length === 1 ? "1 answer" : `${nps.answers.length} answers`}</span>
              </p>
            </div>
          ) : (
            <Empty>No score yet</Empty>
          )}
        </Panel>

        <Panel title="Fees" aside={<Count n={fees.length} />}>
          {fees.length === 0 ? (
            <Empty>No fees</Empty>
          ) : (
            <ul className="grid gap-1">
              {fees.map((f) => {
                const r = firm.clientRequest(f.requestId);
                const chip = FEE_CHIP[f.state];
                return (
                  <li key={f.requestId} className="glass-row flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5">
                    <span className="grid min-w-0 flex-[1_1_9rem]">
                      <span className="truncate text-15 font-semibold">{r ? requestTitle(r) : f.requestId}</span>
                      <span className="truncate text-13 text-ink-soft">
                        {[hours(f.hours), f.invoiceNo ?? formatShortDate(datePart(f.generatedAt))].join(" · ")}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`figure text-15 ${f.state === "waived" ? "text-ink-soft line-through" : ""}`}>{inr(f.total)}</span>
                      <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {mayPicture && (
          <Panel title="Picture">
            <ThumbnailUpload projectId={p.id} by={viewer.admin ? "shalini" : viewer.id} className="px-1" />
          </Panel>
        )}
      </div>
    </div>
  );
}
