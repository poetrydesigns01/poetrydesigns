"use client";

import Link from "next/link";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import type { ProjectView } from "@/lib/firm";
import { inr, inrSigned, percent } from "@/lib/format";
import { worstFirst } from "./admin-data";
import { GlassTable, inrShort, StatCard, StatRow } from "./glass-kit";
import { healthOf, portfolio } from "./portfolio";

// The profit view: which projects lose money first, then the figures, all before GST:
// contract value, work done, costs so far, margin so far, received, spent and cash. A loss
// or a cash shortfall is written in brick. Each project opens its Money tab.

export function ProfitTable() {
  const firm = useFirm();
  const rows = worstFirst(firm.projects.filter((p) => p.phase !== "draft").map((p) => ({ p }))).map(({ p }) => p);
  const sum = portfolio(rows, firm);
  const losing = rows.filter((p) => healthOf(p).tone === "late").length;

  return (
    <>
      <StaffBoard place="Projects" headline={losing > 0 ? `${losing} need attention` : "Every project healthy"} chip={false} />

      <div className="mt-6 grid gap-5">
        <StatRow cols={5} label="Before GST">
          <StatCard label="Contract value" value={inrShort(sum.contract)} sub={`${rows.length} projects`} icon="file" />
          <StatCard label="Work done" value={inrShort(sum.workDone)} icon="hammer" />
          <StatCard label="Costs so far" value={inrShort(sum.costs)} icon="truck" />
          <StatCard
            label="Margin so far"
            value={sum.marginPercent === null ? "–" : percent(sum.marginPercent)}
            sub={inrShort(sum.margin)}
            icon="chart"
            tone={sum.margin < 0 ? "late" : undefined}
          />
          <StatCard label="Cash" value={inrShort(sum.cash)} sub="Received less spent" icon="rupee" tone={sum.cash < 0 ? "late" : undefined} />
        </StatRow>

        <section aria-label="Profit by project" className="glass-strong p-3 sm:p-5">
          <GlassTable<ProjectView>
            caption="Profit by project, before GST"
            rows={rows}
            rowKey={(p) => p.id}
            wide="xl"
            chip={(p) => {
              const h = healthOf(p);
              return <StatusChip tone={h.tone}>{h.words}</StatusChip>;
            }}
            lead={(p) => (
              <Link href={`/staff/projects/${p.id}/money`} className="link -my-3 inline-flex min-h-11 items-center">
                {p.name}
              </Link>
            )}
            columns={[
              {
                label: "Project",
                cell: (p) => {
                  const h = healthOf(p);
                  return (
                    <span className="grid justify-items-start gap-1">
                      <Link href={`/staff/projects/${p.id}/money`} className="link -my-3 inline-flex min-h-11 items-center whitespace-nowrap">
                        {p.name}
                      </Link>
                      <StatusChip tone={h.tone}>{h.words}</StatusChip>
                    </span>
                  );
                },
              },
              { label: "Contract", align: "right", cell: (p) => <Fig>{inr(p.contractValue)}</Fig> },
              {
                label: "Work done",
                align: "right",
                cell: (p) =>
                  p.margin === null ? (
                    <Dash />
                  ) : (
                    <span className="grid">
                      <Fig>{inr(p.workDone)}</Fig>
                      <span className="text-13 font-normal text-ink-soft">{p.workDonePercent}%</span>
                    </span>
                  ),
              },
              { label: "Costs", align: "right", cell: (p) => (p.margin === null ? <Dash /> : <Fig>{inr(p.costs)}</Fig>) },
              {
                label: "Margin",
                align: "right",
                cell: (p) =>
                  p.margin === null ? (
                    <Dash />
                  ) : (
                    <span className="grid">
                      <Fig late={p.margin < 0}>{inrSigned(p.margin)}</Fig>
                      <span className={`text-13 ${p.margin < 0 ? "late-text" : "font-normal text-ink-soft"}`}>
                        {percent(p.marginPercent ?? 0)}
                      </span>
                    </span>
                  ),
              },
              { label: "Received", align: "right", cell: (p) => <Fig>{inr(p.received)}</Fig> },
              { label: "Spent", align: "right", cell: (p) => <Fig>{inr(p.spent)}</Fig> },
              { label: "Cash", align: "right", cell: (p) => <Fig late={p.cash < 0}>{inrSigned(p.cash)}</Fig> },
            ]}
          />
        </section>
      </div>
    </>
  );
}

function Fig({ late = false, children }: { late?: boolean; children: string }) {
  return <span className={`figure whitespace-nowrap ${late ? "late-text" : "font-normal"}`}>{children}</span>;
}

function Dash() {
  return <span className="font-normal text-ink-soft">–</span>;
}
