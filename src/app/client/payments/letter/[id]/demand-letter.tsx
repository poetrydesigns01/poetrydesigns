"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Seal } from "@/components/craft/seal";
import { HouseMark, markForStop } from "@/components/house/house-mark";
import { SamplePhoto } from "@/components/instruments/sample-photo";
import { MoneyRoute } from "@/components/payments/money-route";
import { SampleTag } from "@/components/register/sample-tag";
import { client, project, TODAY, type Milestone } from "@/lib/demo-data";
import { useDemo, useProjection } from "@/lib/demo-store";
import { projects } from "@/lib/firm-data";
import { datePart, formatDate, formatStamp, inr, listWords } from "@/lib/format";
import { STOREYS } from "@/lib/house-model";
import { personName } from "@/lib/projection";

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// Where the lines of the letter will go, once it is written.
const UNWRITTEN_LINES = ["w-2/5", "w-full", "w-full", "w-4/5", "w-full", "w-3/5"];

/** A time when one is known, a date when only that is. */
function when(at: string): string {
  return at.length > 10 ? formatStamp(at) : formatDate(at);
}

export function DemandLetter({ milestone }: { milestone: Milestone }) {
  const demo = useDemo();
  const projection = useProjection();
  const projected = projection.milestones.find((m) => m.id === milestone.id);
  const issued = projected?.money === "paid" || projected?.money === "approved";

  if (!issued || !projected || !projected.letterNo) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
        <Link href="/client/payments" className="link inline-flex min-h-11 items-center">
          Back to payments
        </Link>
        <div className="mt-4 border border-dashed border-ink/50 px-6 py-8 sm:px-12 sm:py-12">
          <h1 className="display display-lg">This letter has not been written yet</h1>
          <p className="mt-4 max-w-[58ch] text-17 text-ink-soft">
            It is written when you approve the payment for the {lowerFirst(milestone.name)}.
          </p>
          <Link href="/client/payments#due" className="btn btn-primary mt-6">
            Go to payments
          </Link>
          <div className="mt-10 space-y-6" aria-hidden="true">
            {UNWRITTEN_LINES.map((width, index) => (
              <div key={index} className={`border-t border-dashed border-ink/40 ${width}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const issuedOn = projected.letterIssuedOn ?? (projected.approvedAt ? datePart(projected.approvedAt) : TODAY);
  const approvedOn = projected.approvedAt ? datePart(projected.approvedAt) : issuedOn;
  const receivedBefore = projection.milestones
    .filter((m) => m.id < milestone.id && m.money === "paid")
    .reduce((sum, m) => sum + m.agreedTotal, 0);
  // What the work was done under: the agreement, and every addendum approved by the day of the letter.
  const addenda = projection.changes
    .filter((change) => change.status === "approved" && change.addendum)
    .filter((change) => (change.decidedOn ?? change.raisedOn) <= issuedOn)
    .map((change) => change.addendum as string)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const agreement = listWords([`the construction agreement dated ${formatDate(project.agreementSignedOn)}`, ...addenda]);
  // The part of the house this payment is for.
  const covered = STOREYS.filter((storey) => storey.milestoneId === milestone.id).map((storey) => storey.id);

  // The stage behind the letter: who marked it done and when, from this tab or the seed.
  const seed = projects.find((p) => p.id === "iyer")?.milestones.find((m) => m.n === milestone.id);
  const done = demo.events.find((e) => e.kind === "stage.done" && e.projectId === "iyer" && e.n === milestone.id);
  const doneAt = done?.at ?? seed?.doneOn ?? projected.workCompletedOn;
  const doneBy = done ? personName(done.by, demo.events) : seed?.doneBy ? personName(seed.doneBy) : "the site engineer";
  const photos = (done?.kind === "stage.done" ? done.photos : seed?.photos) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/client/payments" className="link inline-flex min-h-11 items-center">
          Back to payments
        </Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Download letter and stage proof
        </button>
      </div>

      <MoneyRoute milestone={projected} approvedOn={approvedOn} />
      <p className="no-print mb-4">
        <SampleTag>Sample letter format, to be confirmed by Poetry</SampleTag>
      </p>

      <article className="letter-sheet border border-ink/25 bg-paper px-6 py-8 sm:px-12 sm:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-5">
          <div>
            <p className="display text-32 leading-none">Poetry Designs</p>
            <p className="mt-2 text-15 text-ink-soft">
              Poetry Constructions, Bengaluru <SampleTag>Sample letterhead</SampleTag>
            </p>
          </div>
          <p className="text-right text-15">
            Letter no. {projected.letterNo}
            <br />
            {formatDate(issuedOn)}
          </p>
        </header>

        <p className="mt-8">
          To
          <br />
          The Branch Manager
          <br />
          Home loan bank of {client.name} and {client.coOwner} <SampleTag>Sample addressee</SampleTag>
        </p>

        <h1 className="mt-8 text-22 font-semibold leading-snug">
          Request for payment: milestone {milestone.id}, {lowerFirst(milestone.name)}
        </h1>

        <p className="mt-5">
          This is to confirm that the work described below has been completed at {project.name}, {project.address}{" "}
          (project {project.code} <SampleTag>Sample code</SampleTag>), under {agreement}. The owner approved this payment stage on {formatDate(approvedOn)}.
        </p>

        <dl className="mt-6 border-t border-ink">
          <LetterRow
            term="Work covered"
            value={
              <span className="flex items-start gap-4">
                <span className="min-w-0 flex-1">{milestone.covers}</span>
                {/* The drawing is in rosewood line on screen and in black on paper. */}
                <span className="shrink-0 text-center print:[--color-ink-soft:#000] print:[--color-rosewood:#000]" aria-hidden="true">
                  <HouseMark tone="line" upTo={markForStop(milestone.id).upTo} highlight={covered} className="w-[84px] shrink-0" />
                  <span className="lettering mt-0.5 block">This payment</span>
                </span>
              </span>
            }
          />
          {projected.workCompletedOn && <LetterRow term="Work completed on" value={formatDate(projected.workCompletedOn)} />}
          <LetterRow term={`Milestone amount (${milestone.percent}%)`} value={inr(projected.agreedAmount)} money />
          <LetterRow term="GST at 18%" value={inr(projected.agreedTotal - projected.agreedAmount)} money />
          <LetterRow term="Received in earlier payments" value={inr(receivedBefore)} money />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-ink py-4">
            <dt className="font-semibold">Amount now payable</dt>
            <dd className="figure text-32">{inr(projected.agreedTotal)}</dd>
          </div>
        </dl>

        <p className="mt-6">
          Please release the amount payable to Poetry Constructions by bank transfer, quoting letter no.{" "}
          <span className="whitespace-nowrap">{projected.letterNo}</span>. Account details: as on your agreement (sample).
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="display text-22">Vikram Desai</p>
            <p className="border-t border-ink pt-2">
              Project Head, for Poetry Constructions <SampleTag>Sample signatory</SampleTag>
              <br />
              <span className="text-ink-soft">Authorised signatory</span>
            </p>
          </div>
          <div>
            <p className="display flex items-center gap-3 text-22">
              {client.name}
              <Seal tone="line" size={24} />
            </p>
            <p className="border-t border-ink pt-2">
              Owner
              <br />
              <span className="text-ink-soft">Approved in the portal on {formatDate(approvedOn)}</span>
            </p>
          </div>
        </div>
      </article>

      {/* The second printed sheet: the work the letter is for, as the site recorded it. */}
      <article className="letter-sheet mt-8 border border-ink/25 bg-paper px-6 py-8 [break-before:page] sm:px-12 sm:py-12">
        <h2 className="display text-22 leading-snug">Stage proof</h2>
        <p className="mt-1 text-15 text-ink-soft">
          Letter no. {projected.letterNo}, milestone {milestone.id}, {lowerFirst(milestone.name)}
        </p>
        <ul className="mt-6 grid gap-3 border-t border-ink pt-5">
          {doneAt && (
            <li>
              Work marked done by {doneBy}, site engineer, on {when(doneAt)}.
            </li>
          )}
          {photos.length > 0 && (
            <li className="flex flex-wrap gap-2">
              {photos.slice(0, 3).map((kind, i) => (
                <SamplePhoto key={`${kind}-${i}`} kind={kind} tag={i === 0} />
              ))}
            </li>
          )}
          {projected.acceptedAt && <li>Accepted as finished by {client.name} on {when(projected.acceptedAt)}.</li>}
          <li>Project Head: Vikram Desai.</li>
        </ul>
      </article>
    </div>
  );
}

function LetterRow({ term, value, money }: { term: string; value: ReactNode; money?: boolean }) {
  return (
    <div className="grid gap-x-6 border-b border-sand py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <dt className="text-ink-soft">{term}</dt>
      <dd className={money ? "figure sm:text-right" : ""}>{value}</dd>
    </div>
  );
}
