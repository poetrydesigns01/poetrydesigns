/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useScope } from "@/components/register/project-switch";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { Firm, ProjectView, TurnItem } from "@/lib/firm";
import { formatShortDate, percent, weekdayDate } from "@/lib/format";
import { milestoneStage } from "@/lib/workflow-template";
import type { PaymentStageView, Tone } from "@/lib/portal";
import { exceptionRow } from "./admin-data";
import { Count, GlassTable, Icon, inrShort, Panel, Segments, StatCard, StatRow, WaitChip } from "./glass-kit";
import { healthOf, portfolio } from "./portfolio";

// Shalini's Today: the portfolio in five figures, what needs her, and every project with
// its code, the milestone in hand, the next instalment's week, margin and cash, a loss in
// brick. Each row opens the project's programme.

type Sort = "listed" | "margin" | "cash"; // "listed" is A to Z by name

/** A short label for an exception, by its kind. */
function exceptionWords(item: TurnItem): { words: string; tone: Tone } {
  const [, kind, sub] = item.id.split(":");
  if (kind === "cash") return { words: "Short of cash", tone: "late" };
  if (kind === "margin") return { words: "Losing money", tone: "late" };
  if (kind === "letter") return { words: "Payment overdue", tone: "late" };
  if (kind === "unseen") return { words: "Request not seen", tone: "waiting" };
  if (kind === "client" && sub === "pay") return { words: "Payment with client", tone: "waiting" };
  if (kind === "client" && sub === "rev") return { words: "Held price passed", tone: "waiting" };
  if (kind === "client") return { words: "Design with client", tone: "waiting" };
  if (kind === "split") return { words: "Split asked", tone: "waiting" };
  return { words: "Look", tone: "progress" };
}

/**
 * An overdue-letter exception read against the payment stage as it stands now: the client
 * may already have marked it paid, so the chip and the spoken title follow the stage.
 */
function letterStage(item: TurnItem, firm: Firm): PaymentStageView | undefined {
  const [, kind, projectId, n] = item.id.split(":");
  if (kind !== "letter" || !projectId) return undefined;
  return firm.payments(projectId as ProjectView["id"]).find((s) => String(s.n) === n);
}

function letterTitle(name: string, s: PaymentStageView): string {
  if (s.state === "client-paid")
    return `${name}, ${s.instalmentLabel}: payment made${s.clientPaidAt ? ` ${formatShortDate(s.clientPaidAt)}` : ""}, to confirm in the bank.`;
  return `${name}, ${s.instalmentLabel}: ${s.status.toLowerCase()}.`;
}

function sorted(rows: ProjectView[], sort: Sort) {
  if (sort === "listed") return [...rows].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const key = (p: ProjectView) => (sort === "margin" ? (p.marginPercent ?? Number.POSITIVE_INFINITY) : p.cash);
  return [...rows].sort((a, b) => key(a) - key(b));
}

export function AdminToday() {
  const demo = useDemo();
  const firm = useFirm();
  const scope = useScope("admin");
  const [sort, setSort] = useState<Sort>("listed");

  const live = firm.projects.filter((p) => p.phase !== "draft" && (scope === "all" || p.id === scope));
  const sum = portfolio(live, firm);
  const exceptions = firm.exceptions.filter((item) => scope === "all" || item.projectId === scope);
  const month = weekdayDate(TODAY).split(" ").pop() ?? "";
  const onboarded = firm.onboardedIn(TODAY.slice(0, 7)).filter((p) => scope === "all" || p.id === scope);
  // An opened project with no plan yet: the admin's turn to generate one.
  const noPlan = live.filter((p) => firm.plan(p.id) === null);
  const n = noPlan.length + exceptions.length;

  return (
    <>
      <StaffBoard place="Today" headline={n === 0 ? "All clear, Shalini" : `${n} need you, Shalini`} />

      <div className="mt-6 grid gap-5">
        {/* On a phone the list that needs her comes first; the figures follow it. */}
        <div className="order-2 sm:order-none">
          <StatRow cols={5} label="Portfolio">
            <StatCard label="Contract value" value={inrShort(sum.contract)} sub={`${live.length} projects`} icon="file" />
            <StatCard label="Received" value={inrShort(sum.received)} sub="Before GST" icon="rupee" />
            <StatCard
              label="Outstanding"
              value={inrShort(sum.outstanding)}
              sub={`${sum.dueStages} due`}
              icon="clock"
              tone={sum.overdue > 0 ? "late" : undefined}
            />
            <StatCard
              label="Margin so far"
              value={sum.marginPercent === null ? "–" : percent(sum.marginPercent)}
              sub={inrShort(sum.margin)}
              icon="chart"
              tone={sum.margin < 0 ? "late" : undefined}
            />
            <StatCard label="Cash" value={inrShort(sum.cash)} sub="Received less spent" icon="rupee" tone={sum.cash < 0 ? "late" : undefined} />
          </StatRow>
        </div>

        <div className="order-1 grid items-start gap-5 sm:order-none xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Panel title="Needs you" aside={<Count n={n} tone={n > 0 ? "late" : undefined} />} strong>
            {n === 0 ? (
              <p className="px-1 py-3 text-15 text-ink-soft">Nothing today.</p>
            ) : (
              <ul className="grid gap-1">
                {noPlan.map((p) => (
                  <li key={`no-plan:${p.id}`}>
                    <Link
                      href={`/staff/projects/${p.id}/programme`}
                      className="glass-row grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5"
                      title={`${p.name}: no plan yet`}
                    >
                      <span className="grid min-w-0">
                        <span className="truncate text-15 font-semibold">{p.name}</span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <StatusChip tone="waiting">No plan</StatusChip>
                        </span>
                      </span>
                      <Icon name="arrow" className="size-4 text-ink-soft" />
                      <span className="sr-only">{p.name}: no plan yet, generate it</span>
                    </Link>
                  </li>
                ))}
                {exceptions.slice(0, 8).map((item) => {
                  const row = exceptionRow(item, firm);
                  const p = item.projectId ? firm.project(item.projectId) : undefined;
                  const letter = letterStage(item, firm);
                  const { words, tone } = letter ? { words: letter.status, tone: letter.tone } : exceptionWords(item);
                  const title = letter ? letterTitle(p?.name ?? "Project", letter) : item.title;
                  return (
                    <li key={item.id}>
                      <Link
                        href={row.href}
                        onClick={() => {
                          if (row.focus) demo.setFocusRow({ href: row.href, id: row.focus });
                        }}
                        className="glass-row grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5"
                        title={title}
                      >
                        <span className="grid min-w-0">
                          <span className="truncate text-15 font-semibold">{p?.name ?? "Firm"}</span>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <StatusChip tone={tone}>{words}</StatusChip>
                            {letter ? (
                              letter.state === "client-paid" &&
                              letter.clientPaidAt && <span className="glass-chip">Paid {formatShortDate(letter.clientPaidAt)}</span>
                            ) : item.id.startsWith("ex:cash:") && item.figure ? (
                              // Short of cash: the shortfall, not the age of the letter behind it.
                              <span className="glass-chip figure">{item.figure}</span>
                            ) : (
                              item.days > 0 && <WaitChip days={item.days} />
                            )}
                          </span>
                        </span>
                        <Icon name="arrow" className="size-4 text-ink-soft" />
                        <span className="sr-only">{title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Queues">
            <div className="grid grid-cols-2 gap-2">
              <Queue label="Client approvals" n={sum.approvals} icon="check" />
              <Queue label="Open requests" n={sum.openRequests} sub={sum.lateRequests > 0 ? `${sum.lateRequests} late` : undefined} icon="box" />
              <Queue label="Payments due" n={sum.dueStages} sub={sum.overdue > 0 ? `${sum.overdue} overdue` : undefined} icon="rupee" />
              <Queue label={`Onboarded, ${month.slice(0, 3)}`} n={onboarded.length} icon="users" />
            </div>
          </Panel>
        </div>

        {/* One section pattern on the page: the title, and its sort, inside the panel. */}
        <div className="order-3 sm:order-none">
          <ProjectTable
            projects={sorted(live, sort)}
            firm={firm}
            aside={
              <Segments<Sort>
                label="Sort projects"
                value={sort}
                onChange={setSort}
                options={[
                  { id: "listed", label: "A to Z" },
                  { id: "margin", label: "Margin" },
                  { id: "cash", label: "Cash" },
                ]}
              />
            }
          />
        </div>
      </div>
    </>
  );
}

function Queue({ label, n, sub, icon }: { label: string; n: number; sub?: string; icon: "check" | "box" | "rupee" | "users" }) {
  return (
    <div className="glass-inner grid content-start gap-0.5 p-3">
      <p className="lettering flex items-center gap-1.5 text-ink-soft">
        <Icon name={icon} className="size-3.5" />
        {label}
      </p>
      <p className="figure text-22">{n}</p>
      {sub && <p className="text-13 late-text">{sub}</p>}
    </div>
  );
}

/** Every project: code, milestone in hand, next instalment's week, margin and cash, a loss in brick. */
export function ProjectTable({ projects, firm, aside }: { projects: ProjectView[]; firm: Firm; aside?: ReactNode }) {
  return (
    <Panel title="Projects" aside={aside} strong>
      <GlassTable<ProjectView>
        caption="Projects"
        rows={projects}
        rowKey={(p) => p.id}
        wide="lg"
        chip={(p) => {
          const h = healthOf(p);
          return <StatusChip tone={h.tone}>{h.words}</StatusChip>;
        }}
        columns={[
          {
            label: "Project",
            cell: (p) => (
              <span className="grid min-w-0">
                <Link href={`/staff/projects/${p.id}/programme`} className="link -my-3 inline-flex min-h-11 items-center">
                  {p.name}
                </Link>
                <span className="figure text-13 font-normal text-ink-soft">{p.code || "–"}</span>
              </span>
            ),
          },
          {
            label: "Milestone",
            cell: (p) => {
              const m = milestoneWords(p);
              return (
                <span className="grid min-w-0">
                  <span className="figure font-semibold">{m.tag}</span>
                  <span className="truncate text-13 font-normal text-ink-soft">{m.words}</span>
                </span>
              );
            },
          },
          {
            label: "Next instalment",
            cell: (p) => {
              const s = nextInstalment(p, firm);
              if (!s) return <span className="text-ink-soft">–</span>;
              return (
                <span className="grid min-w-0 justify-items-start">
                  <span className={`figure ${s.overdueDays > 0 ? "late-text" : "font-semibold"}`}>
                    {s.n === 0 ? "Sign-up" : `No. ${s.n}`} · {s.dueWeekLabel}
                  </span>
                  <span className={`text-13 font-normal ${s.overdueDays > 0 ? "late-text" : "text-ink-soft"}`}>{s.status}</span>
                </span>
              );
            },
          },
          {
            label: "Margin",
            align: "right",
            cell: (p) =>
              p.margin === null ? (
                <span className="text-ink-soft">–</span>
              ) : (
                <span className={`figure ${p.margin < 0 ? "late-text" : ""}`}>{percent(p.marginPercent ?? 0)}</span>
              ),
          },
          {
            label: "Cash",
            align: "right",
            cell: (p) => <span className={`figure whitespace-nowrap ${p.cash < 0 ? "late-text" : ""}`}>{inrShort(p.cash)}</span>,
          },
          {
            label: "Health",
            phone: false,
            width: "w-36",
            cell: (p) => {
              const h = healthOf(p);
              return <StatusChip tone={h.tone}>{h.words}</StatusChip>;
            },
          },
        ]}
      />
    </Panel>
  );
}

/** "M4" and its work, or the stage in hand before construction. */
function milestoneWords(p: ProjectView): { tag: string; words: string } {
  if (p.phase === "handed-over") return { tag: "Done", words: "Handed over" };
  if (p.currentMilestone !== null) return { tag: `M${p.currentMilestone}`, words: milestoneStage(p.currentMilestone)?.short ?? "" };
  const stage = p.plan?.stages.find((s) => s.id === p.plan?.currentStage);
  return stage ? { tag: "Pre", words: stage.short } : { tag: "–", words: "No plan" };
}

/** The first instalment not yet received. */
function nextInstalment(p: ProjectView, firm: Firm): PaymentStageView | undefined {
  if (p.phase === "handed-over") return undefined;
  return firm.payments(p.id).find((s) => s.state !== "paid");
}
