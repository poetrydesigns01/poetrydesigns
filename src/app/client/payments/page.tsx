"use client";

import Link from "next/link";
import { useState } from "react";
import { PageBand, Section, Status } from "@/components/page-band";
import { milestones, TODAY, withGst, type Milestone } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";
import { formatDate, inr } from "@/lib/format";

export default function PaymentsPage() {
  const { paymentApproved, approvePayment } = useDemo();
  const [confirming, setConfirming] = useState(false);

  const due = milestones.find((m) => m.status === "awaiting-approval")!;
  const dueMoney = withGst(due.amount);
  const paid = milestones.filter((m) => m.status === "paid").reduce((sum, m) => sum + withGst(m.amount).total, 0);
  const total = milestones.reduce((sum, m) => sum + withGst(m.amount).total, 0);

  return (
    <>
      <PageBand
        title="Payments"
        lede="Your home is paid for in a sign-up advance and ten milestones. Each milestone is tied to finished work, and nothing is requested until you approve it."
      >
        <dl className="mt-8 grid max-w-3xl gap-x-12 gap-y-5 border-t border-lime/30 pt-6 sm:grid-cols-3">
          <div>
            <dt className="text-lime/75">Paid so far</dt>
            <dd className="figure text-[1.75rem]">{inr(paid)}</dd>
          </div>
          <div>
            <dt className="text-lime/75">Still to pay</dt>
            <dd className="figure text-[1.75rem]">{inr(total - paid)}</dd>
          </div>
          <div>
            <dt className="text-lime/75">Total with GST</dt>
            <dd className="figure text-[1.75rem]">{inr(total)}</dd>
          </div>
        </dl>
      </PageBand>

      <Section title={paymentApproved ? "Your demand letter is ready" : "Ready for your approval"}>
        <div className="grid gap-x-12 gap-y-6 border-t border-ink pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div>
            <h3 className="text-[1.375rem] font-semibold leading-snug">
              Milestone {due.id}: {due.name}
            </h3>
            <p className="mt-2 max-w-xl">{due.covers}</p>
            <p className="mt-2 text-ink-soft">
              The site engineer marked this work finished on {formatDate(due.workCompletedOn!)}.
            </p>

            {!paymentApproved && !confirming && (
              <button type="button" className="btn btn-primary mt-6" onClick={() => setConfirming(true)}>
                Approve this payment
              </button>
            )}

            {!paymentApproved && confirming && (
              <div className="reveal mt-6 bg-sand-2 p-5">
                <p className="text-[1.125rem] font-semibold">
                  Approve {inr(dueMoney.total)} for {due.name.toLowerCase()}?
                </p>
                <p className="mt-2 text-ink-soft">
                  Approving creates a demand letter that you can send to your bank. It does not move any money, and it
                  is recorded with your name, the date and the time.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      approvePayment();
                      setConfirming(false);
                    }}
                  >
                    Confirm approval
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={() => setConfirming(false)}>
                    Go back
                  </button>
                </div>
              </div>
            )}

            {paymentApproved && (
              <div className="reveal mt-6 bg-sand-2 p-5">
                <p className="text-[1.125rem]">
                  <Status tone="done">Approved</Status> on {formatDate(TODAY)}
                </p>
                <p className="mt-2 text-ink-soft">
                  Demand letter {due.letterNo} has been created. Send it to your bank to release this payment.
                </p>
                <Link href={`/client/payments/letter/${due.id}`} className="btn btn-primary mt-5">
                  Open demand letter
                </Link>
              </div>
            )}
          </div>

          <dl className="self-start border-t border-sand lg:border-t-0">
            <MoneyRow term={`${due.percent}% of the approved value`} value={inr(dueMoney.amount)} />
            <MoneyRow term="GST at 18%" value={inr(dueMoney.gst)} />
            <div className="flex items-baseline justify-between gap-6 border-t border-ink py-4">
              <dt className="font-semibold">Amount for this milestone</dt>
              <dd className="figure text-[1.75rem]">{inr(dueMoney.total)}</dd>
            </div>
          </dl>
        </div>
      </Section>

      <div className="bg-sand-2">
        <Section title="The full schedule" intro="Dates for work that has not started are our current forecast and can move.">
          <ol className="border-t border-ink">
            {milestones.map((milestone) => (
              <ScheduleRow key={milestone.id} milestone={milestone} approvedNow={paymentApproved && milestone.id === due.id} />
            ))}
          </ol>
        </Section>
      </div>
    </>
  );
}

function MoneyRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-sand py-3">
      <dt className="text-ink-soft">{term}</dt>
      <dd className="figure text-[1.125rem]">{value}</dd>
    </div>
  );
}

function ScheduleRow({ milestone, approvedNow }: { milestone: Milestone; approvedNow: boolean }) {
  const money = withGst(milestone.amount);

  return (
    <li className="grid gap-x-8 gap-y-2 border-b border-sand py-5 md:grid-cols-[3rem_minmax(0,1fr)_15rem_9rem] md:items-baseline">
      <p className="figure text-[1.5rem] text-ink-soft">{milestone.id === 0 ? "" : milestone.id}</p>
      <div>
        <h3 className="text-[1.125rem] font-semibold">{milestone.name}</h3>
        <p className="text-ink-soft">{milestone.covers}</p>
      </div>
      <p>
        {milestone.status === "paid" && (
          <>
            <Status tone="done">Paid</Status>
            <span className="text-ink-soft"> on {formatDate(milestone.paidOn!)}</span>
            {milestone.letterNo && (
              <>
                <br />
                <Link href={`/client/payments/letter/${milestone.id}`} className="link">
                  Demand letter
                </Link>
              </>
            )}
          </>
        )}
        {milestone.status === "awaiting-approval" &&
          (approvedNow ? (
            <>
              <Status tone="due">Approved, waiting for payment</Status>
              <br />
              <Link href={`/client/payments/letter/${milestone.id}`} className="link">
                Demand letter
              </Link>
            </>
          ) : (
            <Status tone="due">Waiting for your approval</Status>
          ))}
        {milestone.status === "in-progress" && (
          <>
            <Status tone="quiet">Work under way</Status>
            <span className="text-ink-soft">, expected {milestone.expected}</span>
          </>
        )}
        {milestone.status === "upcoming" && <span className="text-ink-soft">Expected {milestone.expected}</span>}
      </p>
      <p className="md:text-right">
        <span className="figure text-[1.25rem]">{inr(money.total)}</span>
        <br />
        <span className="text-ink-soft">{milestone.percent}% with GST</span>
      </p>
    </li>
  );
}
