"use client";

import Link from "next/link";
import { client, milestones, project, TODAY, withGst, type Milestone } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";
import { formatDate, inr } from "@/lib/format";

export function DemandLetter({ milestone }: { milestone: Milestone }) {
  const { paymentApproved } = useDemo();
  const issued = milestone.status === "paid" || paymentApproved;
  const issuedOn = milestone.letterIssuedOn ?? TODAY;
  const money = withGst(milestone.amount);
  const receivedBefore = milestones
    .filter((m) => m.id < milestone.id && m.status === "paid")
    .reduce((sum, m) => sum + withGst(m.amount).total, 0);

  if (!issued) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <h1 className="display display-lg">This letter does not exist yet</h1>
        <p className="mt-4 text-[1.125rem] text-ink-soft">
          The demand letter for {milestone.name.toLowerCase()} is created when you approve the payment.
        </p>
        <Link href="/client/payments" className="btn btn-primary mt-6">
          Go to payments
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/client/payments" className="link">
          Back to payments
        </Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Download letter
        </button>
      </div>

      <article className="letter-sheet border border-ink/25 bg-paper px-6 py-8 sm:px-12 sm:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-5">
          <div>
            <p className="display text-[1.75rem] leading-none">Poetry Designs</p>
            <p className="mt-2 text-[0.9375rem] text-ink-soft">Poetry Constructions, Bengaluru</p>
          </div>
          <p className="text-right text-[0.9375rem]">
            Letter no. {milestone.letterNo}
            <br />
            {formatDate(issuedOn)}
          </p>
        </header>

        <p className="mt-8">
          To
          <br />
          The Branch Manager
          <br />
          Home loan bank of {client.name} and {client.coOwner}
        </p>

        <h1 className="mt-8 text-[1.25rem] font-semibold leading-snug">
          Request for payment: milestone {milestone.id}, {milestone.name.toLowerCase()}
        </h1>

        <p className="mt-5">
          This is to confirm that the work described below has been completed at {project.name}, {project.address}{" "}
          (project {project.code}), under the construction agreement dated {formatDate(project.agreementSignedOn)} and
          Addendum 1. The owner approved this payment stage on {formatDate(issuedOn)}.
        </p>

        <dl className="mt-6 border-t border-ink">
          <LetterRow term="Work covered" value={milestone.covers} />
          <LetterRow term="Work completed on" value={formatDate(milestone.workCompletedOn!)} />
          <LetterRow term={`Milestone amount (${milestone.percent}%)`} value={inr(money.amount)} money />
          <LetterRow term="GST at 18%" value={inr(money.gst)} money />
          <LetterRow term="Received in earlier payments" value={inr(receivedBefore)} money />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-ink py-4">
            <dt className="font-semibold">Amount now payable</dt>
            <dd className="figure text-[1.75rem]">{inr(money.total)}</dd>
          </div>
        </dl>

        <p className="mt-6">
          Please release the amount payable to Poetry Constructions by bank transfer, quoting letter no.{" "}
          {milestone.letterNo}. Account details are printed on the agreement.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="display text-[1.375rem]">Vikram Desai</p>
            <p className="border-t border-ink pt-2">
              Project head, for Poetry Constructions
              <br />
              <span className="text-ink-soft">Authorised signatory</span>
            </p>
          </div>
          <div>
            <p className="display text-[1.375rem]">{client.name}</p>
            <p className="border-t border-ink pt-2">
              Owner
              <br />
              <span className="text-ink-soft">Approved in the portal on {formatDate(issuedOn)}</span>
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

function LetterRow({ term, value, money }: { term: string; value: string; money?: boolean }) {
  return (
    <div className="grid gap-x-6 border-b border-sand py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <dt className="text-ink-soft">{term}</dt>
      <dd className={money ? "figure text-[1.125rem] sm:text-right" : ""}>{value}</dd>
    </div>
  );
}
