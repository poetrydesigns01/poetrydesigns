/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { dayWords } from "@/components/admin/admin-data";
import { Count, GlassTable, inrShort, Panel, StatCard, StatRow, WaitChip } from "@/components/admin/glass-kit";
import { requestChip } from "@/components/finance/request-words";
import { useStaffRole } from "@/components/register/staff-shell";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import type { PoView, RequestView } from "@/lib/firm";
import type { ProjectId } from "@/lib/firm-data";
import { inr } from "@/lib/format";
import type { WorkOrderView } from "@/lib/portal";
import { milestoneTag } from "./record-kit";

// What the site has asked for on this project and how procurement answered: the material
// requests with their status and how long each has waited, the POs sent to vendors, and the
// work orders for labour and services.

export function ProjectMaterials({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const role = useStaffRole();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  const requests = firm.requests.filter((r) => r.projectId === projectId).sort((a, b) => b.at.localeCompare(a.at));
  const open = requests.filter((r) => !r.queued && (r.status === "New" || r.status === "Seen" || r.status === "PO in part"));
  const pos = firm.pos.filter((po) => po.projectId === projectId).sort((a, b) => b.at.localeCompare(a.at));
  const orders = firm.workOrders.filter((w) => w.projectId === projectId);
  const delivered = requests.filter((r) => r.status === "Delivered").length;
  const linkable = role === "finance";

  const requestName = (r: RequestView) => {
    const more = r.lines.length > 1 ? ` +${r.lines.length - 1}` : "";
    return (
      <span className="grid min-w-0">
        {linkable && !r.queued ? (
          <Link href={`/staff/finance/requests/${r.no}`} className="link -my-3 inline-flex min-h-11 items-center whitespace-nowrap">
            {r.no}
          </Link>
        ) : (
          <span className="whitespace-nowrap">{r.no}</span>
        )}
        <span className="max-w-64 truncate text-13 font-normal text-ink-soft">
          {r.lineWords[0]}
          {more}
        </span>
      </span>
    );
  };

  return (
    <div className="grid gap-5">
      <StatRow cols={4} label="Materials at a glance">
        <StatCard label="Requests" value={requests.length} icon="box" />
        <StatCard
          label="With procurement"
          value={open.length}
          sub={open.some((r) => r.late) ? <span className="late-text">{open.filter((r) => r.late).length} late</span> : undefined}
          icon="clock"
        />
        <StatCard label="Ordered" value={inrShort(pos.reduce((t, po) => t + po.amount, 0))} sub="Before GST" icon="truck" />
        <StatCard label="Delivered" value={delivered} icon="check" />
      </StatRow>

      <Panel title="Requests" aside={<Count n={open.length} tone={open.length > 0 ? "waiting" : undefined} />} strong>
        <GlassTable<RequestView>
          caption="Material requests"
          rows={requests}
          rowKey={(r) => r.no}
          wide="lg"
          empty="No requests yet."
          chip={(r) => (r.queued ? <StatusChip tone="locked">Not sent</StatusChip> : requestChip(r))}
          columns={[
            { label: "Request", cell: requestName },
            { label: "Milestone", width: "w-24", cell: (r) => <span className="figure font-normal">{milestoneTag(r.n)}</span> },
            { label: "Needed by", width: "w-28", cell: (r) => <span className="font-normal">{dayWords(r.neededBy)}</span> },
            {
              label: "Waiting",
              width: "w-28",
              cell: (r) =>
                r.status === "Delivered" || r.status === "PO uploaded" || r.queued ? (
                  <span className="font-normal text-ink-soft">–</span>
                ) : (
                  <WaitChip days={r.days} />
                ),
            },
            {
              label: "PO",
              cell: (r) =>
                r.pos.length === 0 ? (
                  <span className="font-normal text-ink-soft">–</span>
                ) : (
                  <span className="grid text-13 font-normal">
                    {r.pos.map((po) => (
                      <span key={po.no} className="whitespace-nowrap">
                        {po.no}
                      </span>
                    ))}
                  </span>
                ),
            },
            {
              label: "Status",
              width: "w-40",
              phone: false,
              cell: (r) => (r.queued ? <StatusChip tone="locked">Not sent</StatusChip> : requestChip(r)),
            },
          ]}
        />
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Purchase orders" aside={<Count n={pos.length} />}>
          <GlassTable<PoView>
            caption="Purchase orders"
            rows={pos}
            rowKey={(po) => po.no}
            wide="md"
            empty="No POs yet."
            chip={(po) => (po.billed ? <StatusChip tone="done">Billed</StatusChip> : <StatusChip tone="waiting">Not billed</StatusChip>)}
            columns={[
              {
                label: "PO",
                cell: (po) => (
                  <span className="grid min-w-0">
                    <span className="whitespace-nowrap">{po.no}</span>
                    <span className="truncate text-13 font-normal text-ink-soft">{po.vendor}</span>
                  </span>
                ),
              },
              { label: "Date", width: "w-24", cell: (po) => <span className="font-normal">{dayWords(po.at)}</span> },
              { label: "With GST", align: "right", cell: (po) => <span className="figure">{inr(po.total)}</span> },
              {
                label: "Bill",
                phone: false,
                width: "w-28",
                cell: (po) =>
                  po.billed ? <StatusChip tone="done">Billed</StatusChip> : <StatusChip tone="waiting">Not billed</StatusChip>,
              },
            ]}
          />
        </Panel>

        <Panel title="Work orders" aside={<Count n={orders.length} />}>
          <GlassTable<WorkOrderView>
            caption="Work orders"
            rows={orders}
            rowKey={(w) => w.id}
            wide="md"
            empty="No labour asked for."
            chip={(w) => <StatusChip tone={w.tone}>{w.statusWords}</StatusChip>}
            columns={[
              {
                label: "Labour",
                cell: (w) => (
                  <span className="grid min-w-0">
                    <span>{w.trade}</span>
                    <span className="truncate text-13 font-normal text-ink-soft">{w.crew ?? w.taskTitle}</span>
                  </span>
                ),
              },
              { label: "Start", width: "w-24", cell: (w) => <span className="font-normal">{dayWords(w.startOn)}</span> },
              { label: "Days", width: "w-16", align: "right", cell: (w) => <span className="figure font-normal">{w.days}</span> },
              {
                label: "Status",
                phone: false,
                width: "w-32",
                cell: (w) => <StatusChip tone={w.tone}>{w.statusWords}</StatusChip>,
              },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
