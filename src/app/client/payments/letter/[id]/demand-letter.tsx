/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon, DownloadIcon, LockIcon } from "@/components/payments/icons";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useFirm } from "@/lib/demo-store";
import { datePart, formatDate, formatStampShort, inr } from "@/lib/format";
import { siteLine } from "@/lib/workflow-plan";

// One stage's demand letter, the only thing a client downloads: it prints as the letter
// alone (see .letter-sheet in globals.css). Until the letter is raised the page says so.

export function DemandLetter({ n }: { n: number }) {
  const demo = useDemo();
  const firm = useFirm();
  const stages = firm.payments("iyer");
  const stage = stages.find((s) => s.n === n);
  const project = firm.project("iyer");
  const raised = !!stage?.letterNo && ["due", "client-paid", "paid"].includes(stage.state);

  const back = (
    <Link href="/client/payments" className="btn btn-glass min-h-11 gap-2">
      <ArrowLeftIcon />
      Payments
    </Link>
  );

  if (!stage || !raised || !stage.letterNo) {
    return (
      <div className="mx-auto grid max-w-3xl gap-4 px-4 py-6 sm:px-6 lg:py-10">
        <div>{back}</div>
        <section className="glass grid justify-items-start gap-3 p-6 sm:p-8">
          <span className="inline-grid h-11 w-11 place-items-center rounded-full bg-white/60 text-ink-soft">
            <LockIcon />
          </span>
          <h1 className="display text-32 text-ink">Letter not raised yet</h1>
          {stage && (
            <p className="flex flex-wrap items-center gap-2 text-15 text-ink-soft">
              {stage.instalmentLabel} · {stage.dueWeekLabel}
              <StatusChip tone={stage.tone}>{stage.status}</StatusChip>
            </p>
          )}
          {stage?.canRequestLetter && (
            <button type="button" className="btn btn-primary mt-2 min-h-11" onClick={() => demo.requestDemandLetter(stage.n)}>
              Request demand letter
            </button>
          )}
        </section>
      </div>
    );
  }

  const issuedOn = stage.letterRaisedAt ? datePart(stage.letterRaisedAt) : null;
  const earlier = stages.filter((s) => s.n < n).reduce((total, s) => total + s.received, 0);
  // The Project Head signs every letter, whoever in the office raised it.
  const signatory = firm.person(project?.team.head ?? "vikram");
  const owners = project?.clients.join(" and ") ?? "the owners";

  return (
    <div className="mx-auto grid max-w-3xl gap-4 px-4 py-6 sm:px-6 lg:py-10">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        {back}
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip tone={stage.tone}>{stage.status}</StatusChip>
          <button type="button" className="btn btn-primary min-h-11 gap-2" onClick={() => window.print()}>
            <DownloadIcon />
            Download
          </button>
        </div>
      </div>

      <article className="letter-sheet glass-strong grid gap-6 p-6 text-15 text-ink sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/15 pb-5">
          <div>
            <p className="display text-32 leading-none">Poetry Designs</p>
            <p className="lettering mt-2 text-ink-soft">Demand letter</p>
          </div>
          <dl className="grid gap-0.5 sm:text-right">
            <dt className="sr-only">Letter no.</dt>
            <dd className="figure">{stage.letterNo}</dd>
            <dt className="sr-only">Date</dt>
            <dd className="text-ink-soft">{issuedOn ? formatDate(issuedOn) : ""}</dd>
          </dl>
        </header>

        <p>
          To the Branch Manager,
          <br />
          home loan bank of {owners}
        </p>

        <div className="grid gap-1">
          <h1 className="text-22 font-semibold leading-snug">
            {stage.instalmentLabel}: {stage.milestoneName}, {stage.dueWeekLabel.toLowerCase()}
          </h1>
          <p className="text-ink-soft">
            {project?.name}
            {project ? `, ${siteLine(project)}` : ""}
          </p>
        </div>

        <dl className="grid">
          {stage.workDoneAt && <Line term="Work done" value={formatDate(stage.workDoneAt)} />}
          <Line term="Instalment amount" value={inr(stage.amount)} money />
          <Line term="GST 18%" value={inr(stage.gst)} money />
          <Line term="Received earlier" value={inr(earlier)} money />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-t border-ink/30 pt-4">
            <dt className="font-semibold">Payable now</dt>
            <dd className="figure text-32">{inr(stage.total)}</dd>
          </div>
        </dl>

        <p>
          Please pay Poetry Designs by bank transfer
          {stage.dueDate ? ` by ${formatDate(stage.dueDate)}` : ""}, quoting <span className="whitespace-nowrap">{stage.letterNo}</span>.
        </p>

        <footer className="grid gap-6 border-t border-ink/15 pt-5 sm:grid-cols-2">
          <div>
            <p className="display text-22">{signatory?.name ?? "Vikram Desai"}</p>
            <p className="text-ink-soft">Project Head, Poetry Designs</p>
          </div>
          <div className="grid content-start gap-1 sm:text-right">
            {stage.clientPaidAt && <Proof label="Payment made" at={stage.clientPaidAt} extra={stage.clientRef} />}
            {stage.receivedAt && <Proof label="Received" at={stage.receivedAt} />}
          </div>
        </footer>
      </article>
    </div>
  );
}

function Line({ term, value, money }: { term: string; value: ReactNode; money?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-t border-ink/10 py-2.5">
      <dt className="text-ink-soft">{term}</dt>
      <dd className={money ? "figure text-right" : "text-right"}>{value}</dd>
    </div>
  );
}

function Proof({ label, at, extra }: { label: string; at: string; extra?: string }) {
  return (
    <p className="text-13 text-ink-soft">
      <span className="font-semibold text-ink">{label}</span> · {formatStampShort(at)}
      {extra ? ` · ${extra}` : ""}
    </p>
  );
}
