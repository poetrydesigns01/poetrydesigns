"use client";

import { useScope } from "@/components/register/project-switch";
import { Register } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { useFirm, useViewer } from "@/lib/demo-store";
import type { BillView, ProjectView } from "@/lib/firm";
import { formatShortDate, inr } from "@/lib/format";
import { BillForm } from "./bill-form";
import { SeeAsLine } from "./mark-seen";
import { BillTurnRow, ProjectLink, usePanel } from "./rows";
import { hasFinance } from "./shared";

// Money out: the vendors' bills, per project and per milestone, before GST with the GST
// beside it. A PO counts as a cost the day it is linked ("on order") and moves to spent
// when its bill is entered. Bills that have reached the office wait at the top.

function milestoneWords(n: number): string {
  return n === 0 ? "Sign-up" : `Milestone ${n}`;
}

function Ledger({ project, bills, open }: { project: ProjectView; bills: BillView[]; open: boolean }) {
  const firm = useFirm();
  const onOrder = firm.pos.filter((po) => po.projectId === project.id && !po.billed);
  const groups = [...new Set(bills.map((b) => b.n))].sort((a, b) => a - b);
  const cell = "hidden py-2 align-top sm:table-cell";
  const right = `${cell} pl-3 text-right whitespace-nowrap`;

  return (
    <details open={open} className="border-t border-sand first:border-t-0">
      <summary className="flex min-h-14 cursor-pointer flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
        <span className="text-17 font-semibold lg:text-22">{project.name}</span>
        <span className="text-15">
          Spent <span className="figure text-17">{inr(project.spent)}</span>
          {project.committed > 0 && (
            <>
              , on order <span className="figure text-17">{inr(project.committed)}</span>
            </>
          )}
        </span>
      </summary>
      <div className="grid gap-6 pb-6">
        <p className="text-15">
          <ProjectLink id={project.id} name={`Open the ${project.name} record`} className="inline-flex min-h-11 items-center" />
        </p>
        <table className="w-full border-collapse text-15">
          <caption className="sr-only">Bills for {project.name}, by milestone</caption>
          <thead className="hidden sm:table-header-group">
            <tr className="border-b border-sand text-left">
              <th scope="col" className="py-2 font-semibold">
                Bill
              </th>
              <th scope="col" className="py-2 pl-3 font-semibold">
                Vendor
              </th>
              <th scope="col" className="py-2 pl-3 font-semibold">
                PO
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold">
                Before GST
              </th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold">
                GST
              </th>
            </tr>
          </thead>
          {groups.map((n) => {
            const mine = bills.filter((b) => b.n === n);
            const subtotal = mine.reduce((t, b) => t + b.amount, 0);
            return (
              <tbody key={n}>
                <tr>
                  <th scope="colgroup" colSpan={5} className="pt-4 pb-1 text-left text-15 font-semibold">
                    {milestoneWords(n)}
                  </th>
                </tr>
                {mine.map((b) => (
                  <tr key={b.id} className="block border-t border-sand py-2 sm:table-row sm:py-0">
                    <td className="block py-0 align-top sm:table-cell sm:py-2">
                      <span className="block">{b.earlier ? b.label : b.billNo}</span>
                      <span className="block text-ink-soft sm:hidden">
                        {b.earlier ? "" : `${b.vendor}${b.poNo ? `, ${b.poNo}` : ""}. `}
                        {inr(b.amount)} before GST, GST {inr(b.gst)}.
                      </span>
                      {!b.earlier && <span className="lettering block text-ink-soft">{formatShortDate(b.on)}</span>}
                    </td>
                    <td className={`${cell} pl-3`}>{b.earlier ? "Several" : b.vendor}</td>
                    <td className={`${cell} pl-3`}>{b.poNo ?? ""}</td>
                    <td className={`${right} figure text-17`}>{inr(b.amount)}</td>
                    <td className={`${right} figure text-17`}>{inr(b.gst)}</td>
                  </tr>
                ))}
                {mine.length > 1 && (
                  <tr className="block border-t border-sand py-2 sm:table-row sm:py-0">
                    <td colSpan={3} className="block py-0 font-semibold sm:table-cell sm:py-2">
                      {milestoneWords(n)} subtotal<span className="sm:hidden">, {inr(subtotal)} before GST</span>
                    </td>
                    <td className={`${right} figure text-17 font-semibold`}>{inr(subtotal)}</td>
                    <td className={cell} />
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
        {groups.length === 0 && <p className="text-15 text-ink-soft">No bills entered yet.</p>}

        {onOrder.length > 0 && (
          <div>
            <h3 className="text-17 font-semibold">On order, not billed yet</h3>
            <ul className="sheet-rows ruled mt-1 text-15">
              {onOrder.map((po) => (
                <li key={po.no} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2">
                  <span>
                    {po.no}, {po.vendor}, {milestoneWords(po.n).toLowerCase()}
                  </span>
                  <span className="figure text-17">{inr(po.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

export function MoneyOut() {
  const firm = useFirm();
  const me = useViewer("finance");
  const scope = useScope("finance");
  const panel = usePanel();
  const finance = hasFinance(me);
  const accountant = firm.people.find((p) => p.role === "finance" && hasFinance(p));
  const reader = finance ? me : accountant;
  const billTurns = reader ? firm.turns(reader.id, scope).filter((t) => t.id.startsWith("bill:")) : [];
  const n = billTurns.length;

  const projects = firm.projects.filter(
    (p) =>
      p.phase !== "draft" &&
      (scope === "all" || p.id === scope) &&
      (firm.bills.some((b) => b.projectId === p.id) || firm.pos.some((po) => po.projectId === p.id)),
  );

  return (
    <>
      <StaffBoard
        place="Money out"
        headline={n === 0 ? "Every bill is entered." : `${n} ${n === 1 ? "bill" : "bills"} to enter.`}
        state="Every figure here is before GST unless it says with GST."
      />

      {!finance && accountant && (accountant.id === "divya" || accountant.id === "prakash") && (
        <div className="mt-6">
          <SeeAsLine words={`${accountant.name} enters the bills.`} person={{ id: accountant.id, first: accountant.first }} />
        </div>
      )}

      <div className="mt-10 grid gap-10">
        <Register title="Bills to enter" empty="No bills are waiting to be entered.">
          {billTurns.map((item) => {
            const po = firm.pos.find((x) => `bill:${x.no}` === item.id);
            return po ? (
              <BillTurnRow
                key={item.id}
                item={item}
                po={po}
                person={me.id}
                canEnter={finance}
                panel={panel}
                withWho={accountant?.first}
              />
            ) : null;
          })}
        </Register>

        {finance && panel.open === null && (
          <section className="register" aria-label="Enter a bill">
            <h2 className="register-title">Enter a bill</h2>
            <div className="pt-4">
              <BillForm person={me.id} projectId={scope === "all" ? "" : scope} />
            </div>
          </section>
        )}

        <section aria-label="Bills by project">
          <h2 className="register-title">Bills by project and milestone</h2>
          <div className="mt-2">
            {projects.map((p, i) => (
              <Ledger
                key={p.id}
                project={p}
                bills={firm.bills.filter((b) => b.projectId === p.id)}
                open={scope !== "all" || i === 0}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
