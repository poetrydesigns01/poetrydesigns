"use client";

import Link from "next/link";
import { dayWords, stageChip } from "@/components/admin/admin-data";
import { Icon, Initials, inrShort, Panel, StatCard } from "@/components/admin/glass-kit";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import { templateOf, type PersonId, type ProjectId } from "@/lib/firm-data";
import { inr, listWords } from "@/lib/format";
import { currentStage, Fact, StageStrip, Stats } from "./record-kit";

// The project at a glance: four figures, the contract and the team as tiles and rows, the
// hand-off note, and the payment stages as one strip with the stage that matters now.

type Member = { id: PersonId; role: string };

export function ProjectOverview({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;

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
  add(p.team.poc, "Contact");
  p.team.architects.forEach((id) => add(id, "Architect"));
  p.team.engineers.forEach((id) => add(id, "Site"));
  p.team.procurement.forEach((id) => add(id, "Procurement"));
  const onboarder = firm.person(p.onboardedBy)?.name ?? p.onboardedBy;

  return (
    <div className="grid gap-5">
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
          <dl className="grid grid-cols-2 gap-2">
            <Fact label="Clients" wide>
              {listWords(p.clients)}
            </Fact>
            <Fact label="Category">{templateOf(p.category).name}</Fact>
            <Fact label="Signed">{p.signedOn ? dayWords(p.signedOn) : "–"}</Fact>
            <Fact label="Built-up">
              <span className="figure">{p.builtUpArea.toLocaleString("en-IN")}</span> sq ft
            </Fact>
            <Fact label="Rate">
              <span className="figure">{inr(p.ratePerSqFt)}</span> / sq ft
            </Fact>
            <Fact label="Plot">
              <span className="figure">{p.plotPerimeter}</span> ft around
            </Fact>
            <Fact label="Code">{p.code || "–"}</Fact>
            <Fact label="Address" wide>
              {p.address}
            </Fact>
          </dl>
        </Panel>

        <Panel title="Team" aside={<span className="figure text-15 text-ink-soft">{team.length}</span>}>
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
    </div>
  );
}
