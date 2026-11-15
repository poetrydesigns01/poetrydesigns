/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusChip } from "@/components/register/status-chip";
import { planDate } from "@/components/payments/dates";
import { formatShortDate } from "@/lib/format";
import type { DesignStageView, Tone } from "@/lib/portal";
import { DecisionProof, DecisionStep, useDecision } from "./decision";
import { BoqIcon, CheckIcon, ElevationIcon, EyeIcon, EyeOffIcon, LockIcon, PencilIcon, PlanIcon, UploadIcon } from "./icons";
import { designGroups, initials, opensByItself, proofStamp, type DesignGroup, type ItemView } from "./items";

// The designs table: groups in Poetry's workflow order, each a single line until opened,
// one row per item inside. Columns from 1024 px; a card below that, from the same markup.
// On columns the upload date sits under the item.

const COLS = "lg:grid-cols-[minmax(0,1fr)_2.5rem_8rem_7rem_9rem_14.5rem]";

/** A row action: glass, compact, a full 44 px tall. */
const ACTION =
  "btn-glass inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 text-15 font-semibold text-ink sm:flex-none";

export const STAGE_ICON = {
  "floor-plan": PlanIcon,
  elevation: ElevationIcon,
  approvals: BoqIcon,
  estimate: BoqIcon,
  selections: PencilIcon,
} as const;

function toItem(item: DesignStageView["items"][number]): ItemView {
  return { ...item, kind: "plan", mirrored: false };
}

function Person({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-full bg-rosewood/10 text-13 font-semibold text-rosewood"
      >
        {initials(name)}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

function Row({ item, locked, onDecided }: { item: ItemView; locked: boolean; onDecided: () => void }) {
  const decision = useDecision(item, onDecided);
  const uploaded = item.status !== "not-uploaded";
  const href = `/client/designs/${item.id}`;
  const canDecide = !locked && item.status === "waiting" && item.viewed;
  const open = decision.mode !== "idle";

  return (
    <li
      className={`glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-3 lg:py-2.5 ${COLS}`}
    >
      {/* Item */}
      <div className="col-start-1 row-start-1 min-w-0 lg:col-start-auto lg:row-start-auto">
        {uploaded && !locked ? (
          <Link href={href} className="-my-3 block py-3 text-17 font-semibold leading-snug text-ink underline decoration-transparent underline-offset-4 hover:decoration-current lg:truncate lg:text-15">
            {item.title}
          </Link>
        ) : (
          <p className="text-17 font-semibold leading-snug text-ink lg:truncate lg:text-15">{item.title}</p>
        )}
        <p className="lettering flex flex-wrap items-center gap-x-2 text-ink-soft">
          <span>{item.sheet}</span>
          {item.uploadedAt && (
            <span className="hidden items-center gap-1 lg:inline-flex">
              <UploadIcon className="size-3.5" />
              <span className="sr-only">Uploaded </span>
              {formatShortDate(item.uploadedAt)}
            </span>
          )}
        </p>
      </div>

      {/* Version, prepared by, uploaded, viewed: one line on a phone, three columns from 1024 px. */}
      <div className="col-span-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-15 text-ink-soft lg:contents lg:text-ink">
        <span className={`figure ${uploaded ? "" : "max-lg:hidden"}`}>
          <span className="sr-only">Version </span>
          {item.version === null ? "—" : `v${item.version}`}
        </span>
        <span className="min-w-0">
          <span className="sr-only">Prepared by </span>
          <Person name={item.preparedByName} />
        </span>
        <span className={`items-center gap-1.5 lg:hidden ${uploaded ? "flex" : "hidden"}`}>
          <UploadIcon className="size-4" />
          <span className="sr-only">Uploaded </span>
          {item.uploadedAt ? formatShortDate(item.uploadedAt) : "—"}
        </span>
        <span className={`flex items-center gap-1.5 ${uploaded ? "" : "max-lg:hidden"}`}>
          {!uploaded ? (
            <span aria-label="Not viewed">—</span>
          ) : item.viewed && item.viewedAt ? (
            <>
              <EyeIcon className="size-4 lg:hidden" />
              <span className="sr-only">Viewed </span>
              {formatShortDate(item.viewedAt)}
            </>
          ) : (
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <EyeOffIcon className="size-4" />
              Not viewed
            </span>
          )}
        </span>
      </div>

      {/* Status */}
      <div className="col-start-2 row-start-1 self-start lg:col-start-auto lg:row-start-auto lg:self-center">
        {locked ? (
          <StatusChip tone="locked">Locked</StatusChip>
        ) : (
          <StatusChip tone={item.tone}>{item.statusWords}</StatusChip>
        )}
      </div>

      {/* Decision */}
      <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-2 empty:hidden lg:col-span-1 lg:justify-end">
        {canDecide && !open && (
          <>
            <button
              autoFocus={decision.returnTo === "approve"}
              type="button"
              className={ACTION}
              aria-label={`Approve ${item.title}, version ${item.version}`}
              onClick={() => decision.open("approve")}
            >
              <CheckIcon className="size-5 text-kota" />
              Approve
            </button>
            <button
              autoFocus={decision.returnTo === "modify"}
              type="button"
              className={ACTION}
              aria-label={`Modify ${item.title}, version ${item.version}`}
              onClick={() => decision.open("modify")}
            >
              <PencilIcon className="size-5 text-laterite" />
              Modify
            </button>
          </>
        )}
        {!locked && item.status === "waiting" && !item.viewed && (
          <Link href={href} className={ACTION} aria-label={`Open ${item.title}`}>
            <EyeIcon className="size-5" />
            Open
          </Link>
        )}
        {(item.status === "approved" || item.status === "modify") && (
          <DecisionProof item={{ ...item, comment: undefined }} focus={decision.decided} words={false} />
        )}
      </div>

      {item.status === "modify" && item.comment && (
        <p className="col-span-full flex gap-2 text-15 text-ink-soft lg:pl-0">
          <span className="sr-only">Your comment: </span>
          <span aria-hidden="true" className="lettering text-ink-soft">
            You:
          </span>
          <span className="min-w-0">{item.comment}</span>
        </p>
      )}

      {open && (
        <div className="glass-inner col-span-full p-3 sm:p-4 lg:ml-auto lg:w-full lg:max-w-xl">
          <DecisionStep item={item} decision={decision} />
        </div>
      )}
    </li>
  );
}

function groupChip(group: DesignGroup): { tone: Tone; words: string } {
  if (group.locked) return { tone: "locked", words: "Locked" };
  if (group.waiting > 0) return { tone: "waiting", words: `${group.waiting} to review` };
  if (group.modify > 0) return { tone: "progress", words: "Being revised" };
  if (group.approved === group.total) return { tone: "done", words: "Approved" };
  if (group.uploaded === 0) return { tone: "locked", words: "Upcoming" };
  return { tone: "progress", words: `${group.approved}/${group.total}` };
}

const DOT: Record<DesignStageView["items"][number]["status"], string> = {
  approved: "bg-kota",
  waiting: "bg-brass-light ring-2 ring-brass/40",
  modify: "bg-laterite",
  "not-uploaded": "border border-ink/30",
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`size-4 shrink-0 text-ink-soft transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** One group: a single line that says how far it has got, opening on tap to its items. */
function Group({
  group,
  open,
  onToggle,
  onDecided,
}: {
  group: DesignGroup;
  open: boolean;
  onToggle: () => void;
  onDecided: () => void;
}) {
  const Icon = STAGE_ICON[group.stage.stage];
  const chip = groupChip(group);
  const done = group.approved === group.total;
  const bodyId = `group-${group.key}`;
  const upcoming = chip.words === "Upcoming";
  const date = group.lastDecidedAt ? group.lastDecidedAt.slice(0, 10) : group.neededBy;
  const prefix = group.lastDecidedAt ? "" : "by ";

  return (
    <li id={`stage-${group.key}`} className="scroll-mt-24">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        className="glass-row grid min-h-14 w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2.5 text-left sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto]"
      >
        <span
          aria-hidden="true"
          className={`grid size-9 shrink-0 place-items-center rounded-full ${
            done ? "bg-kota text-lime" : group.locked || group.uploaded === 0 ? "bg-ink/5 text-ink-soft" : "bg-brass/25 text-brass-deep"
          }`}
        >
          {done ? (
            <CheckIcon className="size-5" />
          ) : group.locked ? (
            <LockIcon className="size-4" />
          ) : (
            <Icon className="size-5" />
          )}
        </span>
        <span className="grid min-w-0 gap-1">
          <span className="line-clamp-2 text-15 font-semibold text-ink sm:truncate">{group.title}</span>
          <span className="flex items-center gap-1.5" aria-hidden="true">
            {group.milestone && <span className="lettering mr-1 text-ink-soft">M{group.milestone}</span>}
            {group.items.map((item) => (
              <span key={item.id} className={`size-2.5 rounded-full ${DOT[item.status]}`} />
            ))}
            <span className="figure ml-1 text-13 text-ink-soft">
              {group.approved}/{group.total}
            </span>
          </span>
          <span className="sr-only">
            {group.milestone ? `Milestone ${group.milestone}, ` : ""}
            {group.approved} of {group.total} approved
          </span>
        </span>
        {/* On a phone an upcoming group shows its date in place of the chip. */}
        <span className={`figure text-13 whitespace-nowrap text-ink-soft ${upcoming ? "block" : "hidden sm:block"}`}>
          {date && (
            <>
              <span className="sm:hidden">{prefix + formatShortDate(date)}</span>
              <span className="max-sm:hidden">{prefix + planDate(date)}</span>
            </>
          )}
        </span>
        <StatusChip tone={chip.tone} className={upcoming ? "max-sm:hidden" : ""}>
          {chip.words}
        </StatusChip>
        <Chevron open={open} />
      </button>

      {open && (
        <div id={bodyId} className="mx-1 mb-2 mt-1 rounded-xl bg-white/30 p-1 sm:mx-2">
          <div
            aria-hidden="true"
            className={`lettering hidden gap-x-3 px-3 pb-1.5 pt-2 text-ink-soft lg:grid ${COLS}`}
          >
            <span>Item</span>
            <span>Ver.</span>
            <span>Prepared by</span>
            <span>Viewed</span>
            <span>Status</span>
            <span className="text-right">Decision</span>
          </div>
          <ul className="grid gap-1">
            {group.items.map((item) => (
              <Row key={item.id} item={toItem(item)} locked={group.locked} onDecided={onDecided} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/**
 * The designs in Poetry's order, folded so the page stays short: before construction (floor
 * plan drafts, elevation options, design and cost approvals, final estimate), then the
 * selections milestone by milestone. A group that waits for her opens by itself; the rest
 * are one line each and open on tap.
 */
/** What a group holds right now: each item's version and status. */
function signature(group: DesignGroup): string {
  return group.items.map((i) => `${i.id}:${i.version ?? 0}:${i.status}`).join("|");
}

export function DesignGroups({ stages }: { stages: DesignStageView[] }) {
  const groups = designGroups(stages);
  // Open is worked out on every render from the live store, so a group that comes to wait for
  // her (an upload while she was elsewhere) opens and one she has finished folds. Her own taps
  // win over that, and a group she has just decided in here stays open on its proof instead
  // of folding away under her. A tap holds only while the group is as she left it: a new
  // upload or decision there lets it open or fold by itself again. (Routes are kept alive
  // between visits, so nothing is settled once at mount.)
  const [toggled, setToggled] = useState<ReadonlyMap<string, { open: boolean; sig: string }>>(() => new Map());
  const [kept, setKept] = useState<ReadonlySet<string>>(() => new Set());
  const isOpen = (group: DesignGroup) => {
    const tap = toggled.get(group.key);
    if (tap && tap.sig === signature(group)) return tap.open;
    return opensByItself(group) || kept.has(group.key);
  };
  const toggle = (group: DesignGroup) =>
    setToggled((current) => new Map(current).set(group.key, { open: !isOpen(group), sig: signature(group) }));
  const keep = (key: string) => setKept((current) => (current.has(key) ? current : new Set(current).add(key)));

  const phases = [
    { id: "before", title: "Before construction" },
    { id: "during", title: "During construction" },
  ] as const;

  return (
    <>
      {phases.map((phase) => {
        const list = groups.filter((g) => g.phase === phase.id);
        if (list.length === 0) return null;
        const approved = list.reduce((sum, g) => sum + g.approved, 0);
        const total = list.reduce((sum, g) => sum + g.total, 0);
        const headId = `designs-${phase.id}`;
        return (
          <section key={phase.id} aria-labelledby={headId} className="glass p-2 sm:p-3">
            <header className="flex items-center justify-between gap-3 px-3 pb-2 pt-1.5">
              <h2 id={headId} className="display text-22 text-ink">
                {phase.title}
              </h2>
              <span className="figure text-15 text-ink-soft">
                {approved}/{total}
                <span className="sr-only"> approved</span>
              </span>
            </header>
            <ol className="grid gap-1">
              {list.map((group) => (
                <Group
                  key={group.key}
                  group={group}
                  open={isOpen(group)}
                  onToggle={() => toggle(group)}
                  onDecided={() => keep(group.key)}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </>
  );
}

/** Every decision she has made, newest first, with its date and time. */
export function DecisionLog({ stages }: { stages: DesignStageView[] }) {
  const entries = stages
    .flatMap((stage) =>
      stage.items.flatMap((item) =>
        item.versions
          .filter((v) => v.decidedAt && (v.status === "approved" || v.status === "modify"))
          .map((v) => ({ key: `${item.id}:${v.version}`, title: item.title, ...v, decidedAt: v.decidedAt ?? "" })),
      ),
    )
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));

  if (entries.length === 0) return null;

  return (
    <details className="glass group p-2 sm:p-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-2 sm:px-3 [&::-webkit-details-marker]:hidden">
        <h2 className="text-17 font-semibold text-ink">Decision log</h2>
        <span className="flex items-center gap-2">
          <span className="figure text-15 text-ink-soft">{entries.length}</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4 text-ink-soft transition-transform duration-200 group-open:rotate-180">
            <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <ol className="grid gap-1 border-t border-ink/10 pt-1">
        {entries.map((entry) => {
          const approved = entry.status === "approved";
          return (
            <li key={entry.key} className="glass-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-3 py-2.5">
              <span
                aria-hidden="true"
                className={`mt-0.5 grid size-7 place-items-center rounded-full ${
                  approved ? "bg-kota/15 text-kota" : "bg-laterite/12 text-laterite"
                }`}
              >
                {approved ? <CheckIcon className="size-4" /> : <PencilIcon className="size-4" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-15 font-semibold text-ink">
                  {entry.title} <span className="figure font-normal text-ink-soft">v{entry.version}</span>
                </p>
                <p className="figure text-13 text-ink-soft">{proofStamp(entry.decidedAt)}</p>
                {!approved && entry.comment && <p className="mt-1 text-15 text-ink-soft">{entry.comment}</p>}
              </div>
              <StatusChip tone={approved ? "done" : "progress"}>{approved ? "Approved" : "Modify"}</StatusChip>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
