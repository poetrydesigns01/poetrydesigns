/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { Count, GlassTable, Icon, inrShort, Panel } from "@/components/admin/glass-kit";
import { useScope } from "@/components/register/project-switch";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { Segmented, StatStrip } from "@/components/site/site-kit";
import { useFirm, useViewer } from "@/lib/demo-store";
import type { BillView, PoView } from "@/lib/firm";
import type { ProjectId } from "@/lib/firm-data";
import { formatShortDate, inr } from "@/lib/format";
import { BillForm } from "./bill-form";
import { SeeAsLine } from "./mark-seen";
import { usePanel } from "./rows";
import { hasFinance } from "./shared";

// Money out: the vendors' bills as one table, by project and stage, before GST with the GST
// beside it. A PO counts as a cost the day it is linked ("on order") and moves to spent
// when its bill is entered. Bills that have reached the office wait at the top.

function stageWords(n: number): string {
  return n === 0 ? "Sign-up" : `Milestone ${n}`;
}

/** Bills shown before "Show all": the latest few. */
const LATEST = 8;

export function MoneyOut() {
  const firm = useFirm();
  const me = useViewer("finance");
  const scope = useScope("finance");
  const panel = usePanel();
  const finance = hasFinance(me);
  const accountant = firm.people.find((p) => p.role === "finance" && hasFinance(p));
  const reader = finance ? me : accountant;
  const billTurns = reader ? firm.turns(reader.id, scope).filter((t) => t.id.startsWith("bill:")) : [];
  const waiting = billTurns
    .map((t) => firm.pos.find((po) => `bill:${po.no}` === t.id))
    .filter((po): po is PoView => !!po);
  const [chosen, setChosen] = useState<ProjectId | "all">("all");
  const [entering, setEntering] = useState(false);
  const [allBills, setAllBills] = useState(false);

  const projects = firm.projects.filter(
    (p) =>
      p.phase !== "draft" &&
      (scope === "all" || p.id === scope) &&
      (firm.bills.some((b) => b.projectId === p.id) || firm.pos.some((po) => po.projectId === p.id)),
  );
  const project: ProjectId | "all" = scope !== "all" ? scope : chosen;
  const inView = <T extends { projectId: ProjectId }>(list: T[]) =>
    list.filter((x) => (project === "all" ? projects.some((p) => p.id === x.projectId) : x.projectId === project));
  const bills = inView(firm.bills)
    .filter((b) => !b.deleted)
    .sort((a, b) => (b.earlier ? "" : b.on).localeCompare(a.earlier ? "" : a.on));
  const onOrder = inView(firm.pos).filter((po) => !po.billed);
  const shownProjects = projects.filter((p) => project === "all" || p.id === project);
  const spent = shownProjects.reduce((t, p) => t + p.spent, 0);
  const committed = shownProjects.reduce((t, p) => t + p.committed, 0);
  const n = waiting.length;

  return (
    <>
      <StaffBoard place="Money out" headline={n === 0 ? "Every bill is entered" : `${n} ${n === 1 ? "bill" : "bills"} to enter`} />

      <div className="mt-6 grid gap-5">
        <StatStrip
          label="Money out"
          items={[
            { icon: "rupee", label: "Spent, before GST", value: inrShort(spent) },
            { icon: "truck", label: `On order · ${onOrder.length} not billed`, value: inrShort(committed) },
            { icon: "sheet", label: "Bills to enter", value: n, alert: n > 0 },
          ]}
        />

        {!finance && accountant && (accountant.id === "divya" || accountant.id === "prakash") && (
          <div className="glass px-4 py-2">
            <SeeAsLine words={`${accountant.name} enters bills.`} person={{ id: accountant.id, first: accountant.first }} />
          </div>
        )}

        <Panel
          title="Bills to enter"
          aside={
            finance ? (
              <button
                type="button"
                className="btn btn-glass min-h-11 gap-2 px-4 text-15"
                aria-expanded={entering}
                onClick={() => setEntering((e) => !e)}
              >
                {!entering && <Icon name="plus" />}
                {entering ? "Close" : "Other bill"}
              </button>
            ) : (
              <Count n={n} tone={n > 0 ? "waiting" : undefined} />
            )
          }
          strong
        >
          {entering && finance && (
            <div className="glass-inner mb-3 p-4">
              <BillForm
                person={me.id}
                projectId={scope === "all" ? "" : scope}
                onDone={() => setEntering(false)}
              />
            </div>
          )}
          {waiting.length === 0 ? (
            <p className="px-1 py-3 text-15 text-ink-soft">No bills waiting.</p>
          ) : (
            <ul className="grid gap-1">
              {waiting.map((po) => {
                const id = `bill:${po.no}`;
                const open = panel.isOpen(id);
                return (
                  <li key={po.no} className="glass-row grid gap-3 px-3 py-3" data-row-id={id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="grid min-w-0">
                        <span className="text-15 font-semibold">
                          {po.no} · {po.vendor}
                        </span>
                        <span className="text-13 text-ink-soft">
                          {firm.project(po.projectId)?.name} · {stageWords(po.n)}
                          {po.billIn ? ` · in ${formatShortDate(po.billIn)}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="figure text-17">{inr(po.amount)}</span>
                        {finance ? (
                          <button
                            type="button"
                            className="btn btn-glass min-h-11 px-4 text-15"
                            aria-expanded={open}
                            onClick={(event) => panel.toggle(id, event.currentTarget)}
                          >
                            {open ? "Close" : "Enter bill"}
                          </button>
                        ) : (
                          <StatusChip tone="waiting">With {accountant?.first ?? "accounts"}</StatusChip>
                        )}
                      </div>
                    </div>
                    {open && finance && (
                      <div className="glass-inner p-4">
                        <BillForm person={me.id} preset={po} onDone={panel.close} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {scope === "all" && projects.length > 1 && (
          <Segmented<ProjectId | "all">
            label="Project"
            value={chosen}
            onChange={setChosen}
            options={[{ id: "all", label: "All" }, ...projects.map((p) => ({ id: p.id, label: p.name }))]}
          />
        )}

        <Panel
          title="Bills"
          aside={<span className="figure text-15">{inr(bills.reduce((t, b) => t + b.amount, 0))}</span>}
          strong
        >
          <GlassTable<BillView>
            caption="Bills, before GST"
            rows={allBills ? bills : bills.slice(0, LATEST)}
            rowKey={(b) => b.id}
            wide="lg"
            empty="No bills entered yet."
            chip={(b) => <span className="figure text-15">{inr(b.amount)}</span>}
            lead={(b) => <BillName b={b} vendor />}
            columns={[
              { label: "Bill", cell: (b) => <BillName b={b} /> },
              ...(project === "all"
                ? [
                    {
                      label: "Project",
                      phone: false as const,
                      cell: (b: BillView) => (
                        <Link href={`/staff/projects/${b.projectId}/money`} className="link -my-3 inline-flex min-h-11 items-center font-normal">
                          {firm.project(b.projectId)?.name}
                        </Link>
                      ),
                    },
                  ]
                : []),
              {
                label: "Milestone",
                width: "w-28",
                phone: false,
                cell: (b) => <span className="whitespace-nowrap font-normal">{stageWords(b.n)}</span>,
              },
              { label: "Vendor", phone: false, cell: (b) => <span className="font-normal">{b.earlier ? "Several" : b.vendor}</span> },
              {
                label: "PO",
                width: "w-36",
                phone: false,
                cell: (b) => <span className="whitespace-nowrap text-13 font-normal">{b.poNo ?? "–"}</span>,
              },
              {
                label: "Before GST",
                align: "right",
                phone: false,
                cell: (b) => <span className="figure">{inr(b.amount)}</span>,
              },
              { label: "GST", align: "right", phone: false, cell: (b) => <span className="figure font-normal">{inr(b.gst)}</span> },
            ]}
          />
          {bills.length > LATEST && (
            <div className="px-1 pt-3">
              <button
                type="button"
                className="btn btn-glass min-h-11 px-4 text-15"
                aria-expanded={allBills}
                onClick={() => setAllBills((all) => !all)}
              >
                {allBills ? "Show latest" : `Show all (${bills.length})`}
              </button>
            </div>
          )}
        </Panel>

        {onOrder.length > 0 && (
          <Panel title="On order, not billed" aside={<span className="figure text-15">{inr(committed)}</span>}>
            <GlassTable<PoView>
              caption="On order, not billed"
              rows={onOrder}
              rowKey={(po) => po.no}
              chip={(po) => <span className="figure text-15">{inr(po.amount)}</span>}
              columns={[
                { label: "PO", cell: (po) => po.no },
                { label: "Vendor", cell: (po) => <span className="font-normal">{po.vendor}</span> },
                {
                  label: "Project",
                  cell: (po) => (
                    <span className="font-normal">
                      {firm.project(po.projectId)?.name} · {stageWords(po.n)}
                    </span>
                  ),
                },
                { label: "Before GST", align: "right", phone: false, cell: (po) => <span className="figure">{inr(po.amount)}</span> },
              ]}
            />
          </Panel>
        )}
      </div>
    </>
  );
}

/** The bill number over its date; on a phone card the vendor joins the date. */
function BillName({ b, vendor = false }: { b: BillView; vendor?: boolean }) {
  return (
    <span className="grid min-w-0">
      <span>{b.billNo}</span>
      <span className="text-13 font-normal text-ink-soft">
        {b.earlier ? "Before the portal" : formatShortDate(b.on)}
        {vendor && ` · ${b.earlier ? "Several" : b.vendor}`}
      </span>
    </span>
  );
}
