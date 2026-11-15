/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import { DecisionProof, DecisionStep, useDecision } from "@/components/designs/decision";
import { DesignSheet } from "@/components/designs/design-sheet";
import { CheckIcon, ChevronLeftIcon, EyeIcon, LockIcon, PencilIcon, UploadIcon } from "@/components/designs/icons";
import { initials, proofStamp, useDesignItem, type ItemView } from "@/components/designs/items";
import { STAGE_ICON } from "@/components/designs/stage-table";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo } from "@/lib/demo-store";
import { formatDate } from "@/lib/format";

// One design item, view only: the sheet, a version switch, and her decision beside it.
// Opening it records that she has seen the newest version.

/** A quiet label pill: like a status chip, without the status dot. */
const PILL = "inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/60 bg-white/55 px-3 text-13 font-semibold text-ink";

function VersionSwitch({ item, shown, onPick }: { item: ItemView; shown: number; onPick: (v: number) => void }) {
  if (item.versions.length < 2) {
    return <span className={`figure ${PILL}`}>v{item.version}</span>;
  }
  return (
    <div role="group" aria-label="Version" className="glass-inner inline-flex gap-1 rounded-full p-1">
      {item.versions.map((v) => {
        const on = v.version === shown;
        return (
          <button
            key={v.version}
            type="button"
            aria-pressed={on}
            aria-label={`Version ${v.version}${v.version === item.version ? ", latest" : ""}`}
            onClick={() => onPick(v.version)}
            className={`figure grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-full px-3 text-15 transition-colors ${
              on ? "bg-rosewood text-lime" : "text-ink hover:bg-white/60"
            }`}
          >
            v{v.version}
          </button>
        );
      })}
    </div>
  );
}

function DecisionPanel({ item, locked }: { item: ItemView; locked: boolean }) {
  const decision = useDecision(item);

  if (locked || item.status === "not-uploaded") return null;

  return (
    <section aria-label="Your decision" className="glass-dark grid gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="lettering text-lime/75">Your decision · v{item.version}</p>
        {item.status === "waiting" && <StatusChip tone={item.tone}>{item.statusWords}</StatusChip>}
      </div>

      {item.status === "waiting" && decision.mode === "idle" && (
        <div className="grid grid-cols-2 gap-2">
          <button
            autoFocus={decision.returnTo === "approve"}
            type="button"
            className="btn btn-primary gap-2 px-3"
            onClick={() => decision.open("approve")}
          >
            <CheckIcon className="size-5" />
            Approve
          </button>
          <button autoFocus={decision.returnTo === "modify"} type="button" className="btn btn-glass gap-2 px-3" onClick={() => decision.open("modify")}>
            <PencilIcon className="size-5" />
            Modify
          </button>
        </div>
      )}

      {item.status === "waiting" && decision.mode !== "idle" && <DecisionStep item={item} decision={decision} dark />}

      {(item.status === "approved" || item.status === "modify") && (
        <div role="status">
          <DecisionProof item={item} focus={decision.decided} dark />
        </div>
      )}
    </section>
  );
}

function Details({ item }: { item: ItemView }) {
  const earlier = item.versions.slice(0, -1).reverse();
  return (
    <section aria-label="Details" className="glass p-4 sm:p-5">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-15">
        <dt className="text-ink-soft">Prepared by</dt>
        <dd className="flex min-w-0 items-center gap-2 text-ink">
          <span
            aria-hidden="true"
            className="grid size-6 shrink-0 place-items-center rounded-full bg-rosewood/10 text-13 font-semibold text-rosewood"
          >
            {initials(item.preparedByName)}
          </span>
          <span className="truncate">{item.preparedByName}</span>
        </dd>
        <dt className="text-ink-soft">Uploaded</dt>
        <dd className="figure text-ink">{item.uploadedAt ? formatDate(item.uploadedAt) : "—"}</dd>
        <dt className="text-ink-soft">Viewed</dt>
        <dd className="figure text-ink">{item.viewedAt ? proofStamp(item.viewedAt) : item.uploadedAt ? "Not viewed" : "—"}</dd>
      </dl>

      {earlier.length > 0 && (
        <div className="mt-4 border-t border-ink/10 pt-3">
          <h2 className="lettering text-ink-soft">Earlier versions</h2>
          <ol className="mt-2 grid gap-2">
            {earlier.map((v) => (
              <li key={v.version} className="glass-inner grid gap-1 px-3 py-2.5">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-15">
                  <span className="figure font-semibold text-ink">v{v.version}</span>
                  <StatusChip tone={v.status === "approved" ? "done" : v.status === "modify" ? "progress" : "waiting"}>
                    {v.status === "approved" ? "Approved" : v.status === "modify" ? "Modify" : "Superseded"}
                  </StatusChip>
                  {v.decidedAt && <span className="figure text-13 text-ink-soft">{proofStamp(v.decidedAt)}</span>}
                </p>
                {v.comment && <p className="text-15 text-ink-soft">{v.comment}</p>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

export function DesignViewer({ id }: { id: string }) {
  const demo = useDemo();
  const { item, stage } = useDesignItem(id);
  const latest = item?.version ?? null;
  const [picked, setPicked] = useState<number | null>(null);
  const locked = stage?.locked ?? false;

  // Opening the item marks its newest version seen, once. The store skips it if already seen.
  const recordView = useEffectEvent(() => demo.viewDesignItem(id));
  useEffect(() => {
    if (latest !== null && !locked) recordView();
  }, [id, latest, locked]);

  if (!item) return null;

  const shown = picked !== null && item.versions.some((v) => v.version === picked) ? picked : latest;
  const shownVersion = item.versions.find((v) => v.version === shown);
  const Icon = stage ? STAGE_ICON[stage.stage] : null;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6 lg:gap-5 lg:py-10">
      <header className="flex items-center gap-3">
        <Link
          href="/client/designs"
          aria-label="Back to designs"
          className="btn-glass grid size-11 shrink-0 place-items-center rounded-full text-ink"
        >
          <ChevronLeftIcon className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="lettering flex items-center gap-1.5 text-ink">
            {Icon && <Icon className="size-3.5" />}
            {stage?.label ?? item.stageLabel} · {item.sheet}
          </p>
          <h1 className="display text-22 text-ink sm:text-32">{item.title}</h1>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Drawing" className="glass grid gap-2 p-2 sm:gap-3 sm:p-3">
          {shown !== null && !locked ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
                <VersionSwitch item={item} shown={shown} onPick={setPicked} />
                <span className={PILL}>
                  <EyeIcon className="size-4" />
                  View only
                </span>
              </div>
              <DesignSheet item={item} version={shown} />
            </>
          ) : (
            <div className="glass-inner grid place-items-center px-4 py-16 text-ink-soft sm:py-24">
              <span className="grid justify-items-center gap-2">
                {locked ? <LockIcon className="size-8" /> : <UploadIcon className="size-8" />}
                <span className="text-17 font-semibold">{locked ? "Locked" : "Not uploaded"}</span>
              </span>
            </div>
          )}

          {shownVersion && (shownVersion.note || shown !== latest) && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 pb-1 text-15 text-ink-soft">
              {shown !== latest && (
                <StatusChip tone="locked">Older version</StatusChip>
              )}
              {shownVersion.note && <span className="min-w-0">{shownVersion.note}</span>}
            </p>
          )}
        </section>

        <div className="grid gap-4 lg:gap-5">
          <DecisionPanel item={item} locked={locked} />
          <Details item={item} />
        </div>
      </div>
    </div>
  );
}
