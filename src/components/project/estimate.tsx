"use client";

import { dayWords } from "@/components/admin/admin-data";
import { Empty, Icon, inrShort, Panel, StatCard } from "@/components/admin/glass-kit";
import { useFirm } from "@/lib/demo-store";
import { estimate, estimateInputFor } from "@/lib/estimate";
import type { ProjectId } from "@/lib/firm-data";
import { inr, inrDelta } from "@/lib/format";
import { Stats } from "./record-kit";

// The agreement and the estimate, read only: the signed value and every addendum since,
// then the estimate in two parts (the house, the work around it) and the grand total.

type Line = { name: string; sub?: string; amount: number };

export function ProjectEstimate({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  const [signed, ...addenda] = p.valueHistory;
  const changes = addenda.reduce((t, a) => t + a.amount, 0);
  const input = estimateInputFor(projectId, firm);
  const result = input ? estimate(input) : null;

  return (
    <div className="grid gap-5">
      <Stats cols={3} label="Contract value, before GST">
        <StatCard label="Signed" value={inrShort(signed?.amount ?? p.originalValue)} sub={p.signedOn ? dayWords(p.signedOn) : "Not signed"} icon="file" />
        <StatCard label="Changes" value={addenda.length === 0 ? "–" : inrShort(changes)} sub={`${addenda.length} ${addenda.length === 1 ? "addendum" : "addenda"}`} icon="plus" />
        <StatCard label="Contract now" value={inrShort(p.contractValue)} sub="Before GST" icon="rupee" />
      </Stats>

      <Panel
        title="Agreement"
        aside={
          <span className="inline-flex items-center gap-1.5 text-13 text-ink-soft">
            <Icon name="file" className="size-3.5" />
            Signed agreement.pdf
          </span>
        }
      >
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

      {!input || !result ? (
        <Panel title="Estimate">
          <Empty>No estimate yet.</Empty>
        </Panel>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Part
              title="A. The house"
              lines={[
                {
                  name: "Built-up area",
                  sub: `${input.area.toLocaleString("en-IN")} sq ft × ${inr(input.rate)}`,
                  amount: result.partA.base,
                },
                ...input.addOns.map((a) => ({ name: a.name, amount: a.amount })),
              ]}
              amount={result.partA.amount}
              gst={result.partA.gst}
              total={result.partA.total}
            />
            <Part
              title="B. Around the house"
              lines={result.partB.items.map((item) => ({
                name: item.name,
                sub: item.formula === inr(item.amount) ? undefined : item.formula,
                amount: item.amount,
              }))}
              amount={result.partB.amount}
              gst={result.partB.gst}
              total={result.partB.total}
            />
          </div>

          <section aria-label="Grand total" className="glass-dark flex flex-wrap items-end justify-between gap-3 p-5 sm:p-6">
            <span className="grid gap-1">
              <span className="lettering text-lime/75">Grand total</span>
              <span className="text-15 text-lime/75">With GST</span>
            </span>
            <span className="figure text-32">{inr(result.grandTotal)}</span>
          </section>
        </>
      )}
    </div>
  );
}

function Part({ title, lines, amount, gst, total }: { title: string; lines: Line[]; amount: number; gst: number; total: number }) {
  return (
    <Panel title={title} strong>
      {lines.length === 0 ? (
        <Empty>Nothing in this part.</Empty>
      ) : (
        <ul className="grid gap-1">
          {lines.map((line) => (
            <li key={line.name} className="glass-row flex items-center justify-between gap-4 px-3 py-2.5">
              <span className="grid min-w-0">
                <span className="text-15 font-semibold">{line.name}</span>
                {line.sub && <span className="text-13 text-ink-soft">{line.sub}</span>}
              </span>
              <span className="figure whitespace-nowrap text-15">{inr(line.amount)}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-3 grid gap-2 min-[420px]:grid-cols-3">
        <Sum label="Before GST" value={inr(amount)} />
        <Sum label="GST" value={inr(gst)} />
        <Sum label="Total" value={inr(total)} strong />
      </dl>
    </Panel>
  );
}

function Sum({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="glass-inner min-w-0 px-3 py-2">
      <dt className="lettering text-ink-soft">{label}</dt>
      <dd className={`figure truncate text-15 ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
