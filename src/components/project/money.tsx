"use client";

import { dayWords, joiningSentence } from "@/components/admin/admin-data";
import { CourseTrench, trenchWords } from "@/components/admin/course-trench";
import { StruckNote, TwoStepDelete } from "@/components/admin/two-step-delete";
import { SampleTag } from "@/components/register/sample-tag";
import { useStaffRole } from "@/components/register/staff-shell";
import { StatusWord } from "@/components/register/status-word";
import { useFirm } from "@/lib/demo-store";
import type { BillView, MilestoneView } from "@/lib/firm";
import type { ProjectId } from "@/lib/firm-data";
import { formatStampShort, inr, inrDelta, inrSigned, percent } from "@/lib/format";
import { NotForRole, seesMoney } from "./project-frame";

// A project's money for finance and the admin: the course and trench, the margin so far
// and the cash position side by side, the contract value's history, and money in and money
// out by milestone. One sentence joins them. The admin alone can delete a bill, in two
// steps with a reason; the bill stays as a struck line and leaves the figures.

const STATE: Record<MilestoneView["state"], string> = {
  paid: "Paid",
  "part-paid": "Part paid",
  approved: "Approved, waiting for the bank",
  raised: "Raised",
  done: "Built",
  "under-way": "Under way",
  "to-come": "To come",
};

/** The words for a deleted bill in the record: "bill BCT/1126 from Bharat Cement Traders on Iyer Residence, ₹46,800 before GST". */
function billWhat(bill: BillView, projectName: string): string {
  return `bill ${bill.billNo} from ${bill.vendor} on ${projectName}, ${inr(bill.amount)} before GST`;
}

export function ProjectMoney({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const role = useStaffRole();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  if (!seesMoney(role)) return <NotForRole>Money is for finance and admin.</NotForRole>;

  // The firm's own figures: a deleted bill is already out of them, and its order is back
  // among those not billed, so the sentence and the list below always agree.
  const money = p;
  const bills = firm.bills.filter((b) => b.projectId === projectId);
  const committed = firm.pos.filter((po) => po.projectId === projectId && !po.billed);
  const billsFor = (n: number) =>
    bills.filter((b) => b.n === n && !b.deleted).reduce((sum, b) => sum + b.amount, 0);
  const admin = role === "admin";
  const earlier = bills.filter((b) => b.earlier);
  const itemised = bills.filter((b) => !b.earlier);

  return (
    <div className="grid gap-12">
      <section
        aria-label="Margin and cash"
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-end"
      >
        <figure className="grid gap-2">
          <CourseTrench
            margin={money.margin}
            cash={money.cash}
            inDesign={money.margin === null}
            width={480}
            height={180}
          />
          <figcaption className="lettering text-ink-soft">
            The course at the left is the margin so far; at the right,{" "}
            {money.cash < 0 ? "the trench is the cash short" : "the cash in hand"}.
          </figcaption>
        </figure>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid content-start gap-1">
            <p className="flex flex-wrap items-baseline gap-x-2 text-15 font-semibold">
              <span>Margin so far</span>
              <SampleTag>Definition to confirm with Poetry</SampleTag>
            </p>
            <p className="display text-32">{money.margin === null ? "In design" : inrSigned(money.margin)}</p>
            <p className="text-15 text-ink-soft">
              {money.margin === null
                ? "The margin is worked out once building starts."
                : p.phase === "handed-over"
                  ? `${percent(money.marginPercent ?? 0)} of the whole contract. Before GST.`
                  : `${percent(money.marginPercent ?? 0)}, worked out on the work done so far (${p.workDonePercent}% of the house). Before GST.`}
            </p>
          </div>
          <div className="grid content-start gap-1">
            <p className="text-15 font-semibold">Cash position</p>
            <p className="figure text-22">{inrSigned(money.cash)}</p>
            <p className="text-15 text-ink-soft">
              {inr(money.received)} received less {inr(money.spent)} spent. Before GST.
            </p>
          </div>
        </div>
        <p className="max-w-[60ch] text-balance text-17 font-semibold lg:col-span-2">{joiningSentence(p, money, firm)}</p>
        <p className="sr-only">{trenchWords(money.margin, money.marginPercent, money.cash)}</p>
      </section>

      <div className="staff-columns">
        <section aria-label="Contract value" className="grid content-start gap-3">
          <h2 className="register-title">Contract value, {inr(p.contractValue)} before GST</h2>
          <ul className="sheet-rows ruled">
            {p.valueHistory.map((step, i) => (
              <li key={`${step.label}-${i}`} className="flex items-baseline justify-between gap-4">
                <span className="min-w-0">
                  <span className="block text-17">{step.label}</span>
                  {step.at && <span className="lettering text-ink-soft">{dayWords(step.at)}</span>}
                </span>
                <span className="figure whitespace-nowrap text-17">
                  {i === 0 ? inr(step.amount) : inrDelta(step.amount)}
                </span>
              </li>
            ))}
          </ul>
          <p className="max-w-[56ch] text-15 text-ink-soft">
            Work done {inr(money.workDone)}. Costs so far {inr(money.costs)}, of which {inr(money.committed)} is ordered
            and not yet billed.
          </p>
        </section>

        <section aria-label="Orders not yet billed" className="grid content-start gap-3">
          <h2 className="register-title">Ordered, not yet billed</h2>
          {committed.length === 0 ? (
            <p className="py-4 text-17 text-ink-soft">Every order on this project has its bill.</p>
          ) : (
            <ul className="sheet-rows ruled">
              {committed.map((po) => (
                <li key={po.no} className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-17">
                      {po.no}, {po.vendor}
                    </span>
                    <span className="lettering text-ink-soft">
                      Milestone {po.n}, {dayWords(po.at)}
                    </span>
                  </span>
                  <span className="figure whitespace-nowrap text-17">{inr(po.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-label="By milestone" className="grid gap-3">
        <h2 className="register-title">Money in and money out, by milestone</h2>
        <table className="hidden w-full border-collapse sm:table">
          <thead>
            <tr className="border-b border-sand text-15">
              <th scope="col" className="py-2 pr-3 text-left font-semibold">
                Milestone
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                Billed to the client, with GST
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                Received, with GST
              </th>
              <th scope="col" className="py-2 pl-2 text-right font-semibold">
                Bills, before GST
              </th>
            </tr>
          </thead>
          <tbody>
            {p.milestones.map((m) => (
              <tr key={m.n} className="border-b border-sand">
                <th scope="row" className="py-2.5 pr-3 text-left align-top font-normal">
                  <span className="block text-17">{m.n === 0 ? "Sign-up" : `${m.n}. ${m.name}`}</span>
                  <span className="text-15">
                    <StatusWord>{STATE[m.state]}</StatusWord>
                  </span>
                </th>
                <td className="figure px-2 py-2.5 text-right align-top text-17">{inr(m.total)}</td>
                <td className="figure px-2 py-2.5 text-right align-top text-17">
                  {m.received > 0 ? inr(m.received) : ""}
                </td>
                <td className="figure py-2.5 pl-2 text-right align-top text-17">
                  {billsFor(m.n) > 0 ? inr(billsFor(m.n)) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="sheet-rows ruled sm:hidden">
          {p.milestones.map((m) => (
            <li key={m.n} className="grid gap-0.5">
              <p className="text-17">
                {m.n === 0 ? "Sign-up" : `${m.n}. ${m.name}`}, <StatusWord>{STATE[m.state]}</StatusWord>
              </p>
              <p className="text-15 text-ink-soft">
                {inr(m.total)} with GST{m.received > 0 ? `, ${inr(m.received)} received` : ""}.
                {billsFor(m.n) > 0 ? ` Bills ${inr(billsFor(m.n))} before GST.` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Bills" className="grid gap-3">
        <h2 className="register-title">Bills, before GST</h2>
        {bills.length === 0 ? (
          <p className="py-4 text-17 text-ink-soft">No bills have been entered on this project.</p>
        ) : (
          <ul className="sheet-rows ruled">
            {earlier.length > 0 && (
              <li className="flex items-baseline justify-between gap-4">
                <span className="min-w-0">
                  <span className="block text-17">{earlier[0].label}</span>
                  <span className="lettering text-ink-soft">
                    Several vendors, by milestone in the table above. Entered before the portal.
                  </span>
                </span>
                <span className="figure whitespace-nowrap text-17">
                  {inr(earlier.reduce((sum, b) => sum + b.amount, 0))}
                </span>
              </li>
            )}
            {itemised.map((b) => {
              const gone = b.earlier ? undefined : b.deleted;
              return (
                <li key={b.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-4 text-17">
                      <span className={gone ? "text-ink-soft" : ""}>
                        {gone ? (
                          <s>{b.earlier ? `${b.label}, milestone ${b.n}` : b.label}</s>
                        ) : b.earlier ? (
                          `${b.label}, milestone ${b.n}`
                        ) : (
                          b.label
                        )}
                      </span>
                      <span className="figure whitespace-nowrap">{gone ? <s>{inr(b.amount)}</s> : inr(b.amount)}</span>
                    </p>
                    <p className="max-w-[56ch] text-15 text-ink-soft">
                      {b.earlier
                        ? "Several vendors, entered before the portal."
                        : `Bill ${b.billNo}, milestone ${b.n}${b.poNo ? `, ${b.poNo}` : ""}, billed ${dayWords(b.on)}. GST ${inr(b.gst)}.${
                            b.enteredBy ? ` Entered by ${firm.person(b.enteredBy)?.name ?? b.enteredBy}.` : ""
                          }`}
                    </p>
                    {gone && (
                      <StruckNote
                        by={firm.person(gone.by)?.name ?? gone.by}
                        at={formatStampShort(gone.at)}
                        reason={gone.reason}
                      />
                    )}
                  </div>
                  {admin && !b.earlier && !gone && (
                    <TwoStepDelete
                      question={`Delete bill ${b.billNo} for ${inr(b.amount)}?`}
                      what={billWhat(b, p.name)}
                      target={{ kind: "bill", billId: b.id }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
