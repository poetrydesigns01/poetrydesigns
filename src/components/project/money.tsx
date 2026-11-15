/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { dayWords } from "@/components/admin/admin-data";
import { Count, Empty, GlassTable, inrShort, Panel, StatCard } from "@/components/admin/glass-kit";
import { StruckNote, TwoStepDelete } from "@/components/admin/two-step-delete";
import { useStaffRole } from "@/components/register/staff-shell";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import type { BillView } from "@/lib/firm";
import type { ProjectId } from "@/lib/firm-data";
import { formatStampShort, inr, inrDelta, inrSigned, percent } from "@/lib/format";
import type { PaymentStageView } from "@/lib/portal";
import { NotForRole, seesMoney } from "./project-frame";
import { milestoneTag, Stats } from "./record-kit";

// A project's money for finance and the admin: five figures (a loss or a cash shortfall in
// brick), the instalments with money in and bills against each, the contract value's
// history, orders not yet billed, and the bills. The admin alone deletes a bill, in two
// steps with a reason; it stays as a struck line and leaves the figures.

function billWhat(bill: BillView, projectName: string): string {
  return `bill ${bill.billNo} from ${bill.vendor} on ${projectName}, ${inr(bill.amount)} before GST`;
}

export function ProjectMoney({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const role = useStaffRole();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  if (!seesMoney(role)) return <NotForRole>Finance and admin only</NotForRole>;

  const stages = firm.payments(p.id);
  const bills = firm.bills.filter((b) => b.projectId === projectId);
  const committed = firm.pos.filter((po) => po.projectId === projectId && !po.billed);
  const billsFor = (n: number) => bills.filter((b) => b.n === n && !b.deleted).reduce((sum, b) => sum + b.amount, 0);
  const admin = role === "admin";
  const earlier = bills.filter((b) => b.earlier);
  const itemised = bills.filter((b) => !b.earlier);
  const losing = p.margin !== null && p.margin < 0;

  return (
    <div className="grid gap-5">
      <Stats cols={5} label="Money, before GST">
        <StatCard label="Contract" value={inrShort(p.contractValue)} icon="file" />
        <StatCard label="Received" value={inrShort(p.received)} icon="rupee" />
        <StatCard label="Spent" value={inrShort(p.spent)} sub={committed.length > 0 ? `${inrShort(p.committed)} on order` : undefined} icon="truck" />
        <StatCard
          label="Margin"
          value={p.margin === null ? "In design" : percent(p.marginPercent ?? 0)}
          sub={p.margin === null ? undefined : inrSigned(p.margin)}
          icon="chart"
          tone={losing ? "late" : undefined}
        />
        <StatCard label="Cash" value={inrShort(p.cash)} sub="Received less spent" icon="rupee" tone={p.cash < 0 ? "late" : undefined} />
      </Stats>

      <Panel title="Instalments" strong>
        <GlassTable<PaymentStageView>
          caption="Instalments, money in and bills"
          rows={stages}
          rowKey={(s) => String(s.n)}
          wide="lg"
          chip={(s) => <StatusChip tone={s.tone}>{s.status}</StatusChip>}
          columns={[
            {
              label: "Instalment",
              cell: (s) => (
                <span className="grid min-w-0">
                  <span>{s.instalmentLabel}</span>
                  {s.name !== s.instalmentLabel && <span className="truncate text-13 font-normal text-ink-soft">{s.name}</span>}
                </span>
              ),
            },
            { label: "With GST", align: "right", cell: (s) => <span className="figure">{inr(s.total)}</span> },
            {
              label: "Received",
              align: "right",
              cell: (s) => <span className="figure font-normal">{s.received > 0 ? inr(s.received) : "–"}</span>,
            },
            {
              label: "Bills",
              align: "right",
              cell: (s) => <span className="figure font-normal">{billsFor(s.n) > 0 ? inr(billsFor(s.n)) : "–"}</span>,
            },
            {
              label: "Status",
              phone: false,
              width: "w-48",
              cell: (s) => <StatusChip tone={s.tone}>{s.status}</StatusChip>,
            },
          ]}
        />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Contract value" aside={<span className="figure text-15">{inr(p.contractValue)}</span>}>
          <ul className="grid gap-1">
            {p.valueHistory.map((step, i) => (
              <li key={`${step.label}-${i}`} className="glass-row flex items-center justify-between gap-4 px-3 py-2.5">
                <span className="grid min-w-0">
                  <span className="truncate text-15 font-semibold">{step.label}</span>
                  {step.at && <span className="text-13 text-ink-soft">{dayWords(step.at)}</span>}
                </span>
                <span className="figure whitespace-nowrap text-15">{i === 0 ? inr(step.amount) : inrDelta(step.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="On order" aside={<Count n={committed.length} />}>
          {committed.length === 0 ? (
            <Empty>Every order is billed.</Empty>
          ) : (
            <ul className="grid gap-1">
              {committed.map((po) => (
                <li key={po.no} className="glass-row flex items-center justify-between gap-4 px-3 py-2.5">
                  <span className="grid min-w-0">
                    <span className="truncate text-15 font-semibold">{po.no}</span>
                    <span className="truncate text-13 text-ink-soft">
                      {po.vendor} · {milestoneTag(po.n)}
                    </span>
                  </span>
                  <span className="figure whitespace-nowrap text-15">{inr(po.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Bills"
        aside={<span className="figure text-15">{inr(bills.filter((b) => !b.deleted).reduce((t, b) => t + b.amount, 0))}</span>}
        strong
      >
        {bills.length === 0 ? (
          <Empty>No bills yet.</Empty>
        ) : (
          <ul className="grid gap-1">
            {earlier.length > 0 && (
              <li className="glass-row flex items-center justify-between gap-4 px-3 py-2.5">
                <span className="grid min-w-0">
                  <span className="truncate text-15 font-semibold">{earlier[0].label}</span>
                  <span className="text-13 text-ink-soft">Before the portal</span>
                </span>
                <span className="figure whitespace-nowrap text-15">{inr(earlier.reduce((t, b) => t + b.amount, 0))}</span>
              </li>
            )}
            {itemised.map((b) => {
              const gone = b.deleted;
              return (
                <li key={b.id} className="glass-row grid gap-2 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="grid min-w-0 flex-1 basis-40">
                      <span className={`text-15 font-semibold ${gone ? "text-ink-soft" : ""}`}>
                        {gone ? <s>{b.billNo}</s> : b.billNo} · {b.vendor}
                      </span>
                      <span className="text-13 text-ink-soft">
                        {milestoneTag(b.n)} · {dayWords(b.on)}
                        {b.poNo ? ` · ${b.poNo}` : ""}
                      </span>
                    </span>
                    {gone && <StatusChip tone="late">Deleted</StatusChip>}
                    <span className="grid text-right">
                      <span className="figure whitespace-nowrap text-15">{gone ? <s>{inr(b.amount)}</s> : inr(b.amount)}</span>
                      <span className="figure text-13 text-ink-soft">GST {inr(b.gst)}</span>
                    </span>
                    {admin && !gone && (
                      <TwoStepDelete
                        question={`Delete bill ${b.billNo}?`}
                        what={billWhat(b, p.name)}
                        target={{ kind: "bill", billId: b.id }}
                      />
                    )}
                  </div>
                  {gone && (
                    <StruckNote by={firm.person(gone.by)?.name ?? gone.by} at={formatStampShort(gone.at)} reason={gone.reason} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
