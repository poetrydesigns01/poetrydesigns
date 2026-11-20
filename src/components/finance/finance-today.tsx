/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { GlassTable, Icon, inrShort, Panel } from "@/components/admin/glass-kit";
import { ProjectsAttention, WaitingPanel } from "@/components/admin/today-desk";
import { useScope } from "@/components/register/project-switch";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { taskActionFor } from "@/components/shared/task-action";
import { StatStrip, requestTitle, type StatItem } from "@/components/site/site-kit";
import { useFirm, useViewer } from "@/lib/demo-store";
import type { PoView, RequestView } from "@/lib/firm";
import { formatShortDate, inr } from "@/lib/format";
import type { PaymentStageView } from "@/lib/portal";
import { todayItems } from "@/lib/today-count";
import { instShort, weekLanes, weekShort } from "./instalment-weeks";
import { MarkSeen } from "./mark-seen";
import { requestTask, taskWords } from "./request-task";
import { WaitingChip, requestChip } from "./request-words";
import { hasFinance, inScope, procuresAny, procuresFor } from "./shared";

// Procurement and finance, Today: the queues at a glance. Prakash's day is requests,
// which are new and which are ageing without a PO, and crews to book. Divya's is money:
// the instalments whose week is this one (the Accounts & Finance weeks of each project's
// tracker), payments the clients say they have made, letters to raise, and bills to enter.

export function FinanceToday() {
  const firm = useFirm();
  const me = useViewer("finance");
  const scope = useScope("finance");
  const finance = hasFinance(me);
  const buyer = procuresAny(me.id, firm);

  const turns = firm.turns(me.id, scope);
  const open = inScope(
    firm.requests.filter((r) => !r.queued && (r.status === "New" || r.status === "Seen" || r.status === "PO in part")),
    scope,
  ).sort((a, b) => b.days - a.days);
  const fresh = open.filter((r) => r.status === "New");
  const late = open.filter((r) => r.late);
  const crews = inScope(firm.workOrders, scope).filter((w) => w.status === "requested");
  const stages = inScope(firm.paymentStages, scope);
  // The client says it is paid: finance confirms once it shows in the bank.
  const toConfirm = stages.filter((s) => s.state === "client-paid");
  const toRaise = stages.filter((s) => s.state === "work-done");
  // The instalments whose week is this one (or already gone): the Accounts & Finance week.
  const { overdue, lanes } = weekLanes(stages);
  const thisWeek = lanes[0];
  const weekRows = [...overdue.items, ...thisWeek.items, ...toConfirm, ...toRaise].filter(
    (s, i, list) => list.findIndex((x) => x.projectId === s.projectId && x.n === s.n) === i,
  );
  const bills = firm.pos.filter((po) => turns.some((t) => t.id === `bill:${po.no}`));
  const accountant = firm.people.find((p) => p.role === "finance" && hasFinance(p));
  const billsWaiting = finance
    ? bills
    : accountant
      ? firm.pos.filter((po) => firm.turns(accountant.id, scope).some((t) => t.id === `bill:${po.no}`))
      : [];

  // What waits on this person, urgent first, each with how long it has waited: the rows the
  // rail's Today figure counts.
  const waiting = todayItems(firm, "finance", me.id, scope);
  const urgent = waiting.filter((x) => x.tier === "urgent").length;
  const n = waiting.length;
  const headline = n === 0 ? `All clear, ${me.first}` : `${n} ${n === 1 ? "thing needs" : "need"} you, ${me.first}`;
  const oldest = fresh[0] ?? open[0];

  const requestsPanel = (
    <Panel
      title="Requests"
      aside={
        <Link href="/staff/finance/requests" className="link inline-flex min-h-11 items-center gap-1 text-15">
          All <Icon name="arrow" />
        </Link>
      }
      strong
    >
      <GlassTable<RequestView>
        caption="Open requests"
        rows={open.slice(0, 6)}
        rowKey={(r) => r.no}
        wide="md"
        empty="Every request has its PO."
        chip={(r) => requestChip(r, { late: false })}
        columns={[
          {
            label: "Request",
            cell: (r) => (
              <span className="grid min-w-0">
                <Link href={`/staff/finance/requests/${r.no}`} className="link -my-3 flex min-h-11 min-w-0 items-center">
                  <span className="truncate">{requestTitle(r, firm)}</span>
                </Link>
                <span className="max-w-80 truncate text-13 font-normal text-ink-soft" title={r.lineWords[0]}>
                  {r.no} · {r.projectName} · {taskWords(requestTask(r, firm))}
                </span>
              </span>
            ),
          },
          { label: "Waiting", width: "w-36", cell: (r) => <WaitingChip r={r} /> },
          { label: "Status", width: "w-40", phone: false, cell: (r) => requestChip(r, { late: false }) },
          {
            label: "Action",
            align: "right",
            width: "w-40",
            phone: false,
            cell: (r) =>
              r.status === "New" && procuresFor(me.id, firm.project(r.projectId)) ? (
                <MarkSeen no={r.no} person={me.id} className="min-h-11 min-w-32 justify-center whitespace-nowrap px-4 text-15" />
              ) : (
                <Link
                  href={`/staff/finance/requests/${r.no}`}
                  className="btn btn-glass min-h-11 min-w-32 justify-center whitespace-nowrap px-4 text-15"
                >
                  Open
                </Link>
              ),
          },
        ]}
      />
    </Panel>
  );

  const moneyPanel = (
    <Panel
      title="This week"
      aside={
        <Link href="/staff/finance/money" className="link inline-flex min-h-11 items-center gap-1 text-15">
          Money in <Icon name="arrow" />
        </Link>
      }
      strong
    >
      <GlassTable<PaymentStageView>
        caption="Instalments this week"
        rows={weekRows.slice(0, 6)}
        rowKey={(s) => `${s.projectId}:${s.n}`}
        wide="md"
        empty="Nothing due this week."
        chip={(s) => <StatusChip tone={s.tone}>{s.status}</StatusChip>}
        columns={[
          {
            label: "Instalment",
            cell: (s) => (
              <span className="grid min-w-0">
                <span>{firm.project(s.projectId)?.name}</span>
                <span className="text-13 font-normal text-ink-soft">
                  {instShort(s)} · {weekShort(s)}
                  {s.clientPaidAt ? ` · paid ${formatShortDate(s.clientPaidAt)}` : s.dueDate ? ` · due ${formatShortDate(s.dueDate)}` : ""}
                </span>
              </span>
            ),
          },
          {
            // The status sits under the amount in the table, so the stage keeps its room in a
            // half-width panel; on a phone card it is the chip at the top right.
            label: "Amount",
            align: "right",
            // As narrow as its figure and chip, so the stage takes the rest.
            width: "w-1",
            cell: (s) => (
              <span className="grid gap-1 md:justify-items-end">
                <span className="figure whitespace-nowrap">{inr(s.outstanding)}</span>
                <span className="hidden whitespace-nowrap md:inline-flex">
                  <StatusChip tone={s.tone}>{s.status}</StatusChip>
                </span>
              </span>
            ),
          },
        ]}
      />
    </Panel>
  );

  const billsPanel = (
    <Panel
      title="Bills to enter"
      aside={
        <Link href="/staff/finance/costs" className="link inline-flex min-h-11 items-center gap-1 text-15">
          Money out <Icon name="arrow" />
        </Link>
      }
    >
      <GlassTable<PoView>
        caption="Bills to enter"
        rows={billsWaiting.slice(0, 5)}
        rowKey={(po) => po.no}
        empty="Every bill is entered."
        chip={(po) => <span className="figure text-15">{inr(po.amount)}</span>}
        columns={[
          {
            label: "PO",
            cell: (po) => (
              <span className="grid min-w-0">
                <span>
                  {po.no} · {po.vendor}
                </span>
                <span className="text-13 font-normal text-ink-soft">{firm.project(po.projectId)?.name}</span>
              </span>
            ),
          },
          { label: "Before GST", align: "right", width: "w-32", phone: false, cell: (po) => <span className="figure">{inr(po.amount)}</span> },
        ]}
      />
    </Panel>
  );

  const stats: StatItem[] = buyer
    ? [
        { icon: "box", label: "New requests", value: fresh.length, alert: fresh.length > 0, href: "/staff/finance/requests" },
        { icon: "clock", label: "Waiting on PO", value: open.length, href: "/staff/finance/requests" },
        { icon: "alert", label: "Late for site", value: late.length, alert: late.length > 0 },
        { icon: "crew", label: "Crews to book", value: crews.length, href: "/staff/finance/requests" },
      ]
    : [
        { icon: "check", label: "To confirm", value: toConfirm.length, alert: toConfirm.length > 0, href: "/staff/finance/money" },
        { icon: "sheet", label: "Letters to raise", value: toRaise.length, alert: toRaise.length > 0, href: "/staff/finance/money" },
        {
          icon: "rupee",
          label: `This week · ${thisWeek.items.length} due`,
          value: inrShort(thisWeek.total),
          href: "/staff/finance/money",
        },
        { icon: "sheet", label: "Bills to enter", value: billsWaiting.length, href: "/staff/finance/costs" },
        // The accountant does not buy: the requests queue is one number that opens the list.
        { icon: "box", label: "Waiting on PO", value: open.length, href: "/staff/finance/requests" },
      ];

  return (
    <>
      <StaffBoard
        place="Today"
        headline={headline}
        state={urgent > 0 ? `${urgent} urgent` : overdue.items.length > 0 ? `${overdue.items.length} overdue` : undefined}
        primary={
          buyer && oldest
            ? { label: `Open ${oldest.no}`, href: `/staff/finance/requests/${oldest.no}` }
            : !buyer && toConfirm.length > 0
              ? { label: "Confirm payments", href: "/staff/finance/money" }
              : !buyer && toRaise.length > 0
                ? { label: "Raise letters", href: "/staff/finance/money" }
                : undefined
        }
      />
      <div className="mt-6 grid gap-5">
        <WaitingPanel
          items={waiting}
          action={(item) => taskActionFor(firm, item.id, me.id)}
        />
        <StatStrip label="Today at a glance" items={stats} />
        {buyer && requestsPanel}
        <div className="grid items-start gap-5 xl:grid-cols-2">
          {moneyPanel}
          {billsPanel}
        </div>
        <ProjectsAttention person={me.id} scope={scope} />
      </div>
    </>
  );
}
