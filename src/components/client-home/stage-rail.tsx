import Link from "next/link";
import { formatShortDate } from "@/lib/format";
import type { TimelineView } from "@/lib/portal";
import type { Progress } from "./data";
import { ArrowIcon, CheckIcon, LockIcon } from "./icons";

// The ten milestones down the home's right side: done, now and to come, each with its
// expected finish. The first one waiting on its instalment shows a padlock. The days her
// changes added show in bold brick where they landed and in total.

export function StageDot({
  state,
  n,
  locked = false,
}: {
  state: "done" | "current" | "upcoming";
  n: number;
  locked?: boolean;
}) {
  return (
    <span className="stage-dot relative" data-state={state} aria-hidden="true">
      {state === "done" ? (
        <CheckIcon />
      ) : locked ? (
        <LockIcon className="size-3 text-ink-soft" />
      ) : (
        <span className={state === "current" ? "text-laterite" : "text-ink-soft"}>{n}</span>
      )}
    </span>
  );
}

const STATE_WORDS = { done: "done", current: "under way", upcoming: "to come" } as const;

/** A milestone held for its instalment has not started, whatever its dates say. */
export function shownState(row: TimelineView["rows"][number]): "done" | "current" | "upcoming" {
  return row.held ? "upcoming" : row.state;
}

export function StageRail({ timeline, progress }: { timeline: TimelineView; progress: Progress }) {
  const rows = timeline.rows.filter((r) => r.n >= 1);
  const firstLocked = rows.find((r) => r.locked && r.state !== "done")?.n ?? null;

  return (
    <section className="glass grid gap-1 p-2 sm:p-3" aria-labelledby="rail-title">
      <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-1">
        <h2 id="rail-title" className="display text-22 text-ink">
          Timeline
        </h2>
        {timeline.extraDays > 0 && <span className="glass-chip chip-late">+{timeline.extraDays} days</span>}
      </div>
      <ol className="stage-rail">
        {rows.map((row) => {
          const added = row.changes.reduce((total, c) => total + c.days, 0);
          const state = shownState(row);
          const locked = row.n === firstLocked;
          return (
            <li
              key={row.n}
              className={`relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-1.5 ${
                row.n === progress.milestone ? "glass-inner" : ""
              }`}
            >
              <StageDot state={state} n={row.n} locked={locked} />
              <span className="flex min-w-0 items-center gap-2">
                <span className={`truncate text-15 ${state === "upcoming" ? "text-ink-soft" : "text-ink"}`}>
                  {row.name}
                </span>
                {added > 0 && <span className="late-text flex-none text-13">+{added}d</span>}
                <span className="sr-only">
                  , milestone {row.n}, {locked ? `opens when instalment ${row.n} is received` : STATE_WORDS[state]}
                  {added > 0 ? `, ${added} days added by changes` : ""}
                </span>
              </span>
              <span className="figure text-13 text-ink-soft">{formatShortDate(row.expectedDate)}</span>
            </li>
          );
        })}
      </ol>
      <Link href="/client/timeline" className="btn btn-glass mt-2 gap-2">
        Full timeline
        <ArrowIcon />
      </Link>
    </section>
  );
}
