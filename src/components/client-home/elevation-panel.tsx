/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { House } from "@/components/house/house";
import { StatusChip } from "@/components/register/status-chip";
import type { DesignItemView } from "@/lib/portal";
import type { Progress } from "./data";

// The final 3D elevation she approved, beside a thermometer that fills as the house rises:
// each milestone weighted by its weeks on the plan, a tick where each one ends. Under it,
// the milestone in hand and its tasks from the workflow.

export function ElevationPanel({
  progress,
  elevation,
}: {
  progress: Progress;
  elevation: DesignItemView | null;
}) {
  const waiting = progress.held;

  return (
    <section className="glass grid gap-3 p-4 sm:p-5" aria-labelledby="elevation-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="elevation-title" className="lettering text-ink-soft">
          Your home
        </h2>
        {progress.week > 0 && (
          <p className="lettering text-ink-soft">
            Week <span className="text-ink">{progress.week}</span> of {progress.weeks}
          </p>
        )}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-4">
        <div className="glass-inner relative grid min-w-0 place-items-center overflow-hidden p-2">
          {elevation ? (
            <Link
              href="/client/designs"
              className="grid w-full place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-laterite"
              aria-label={`${elevation.title}, version ${elevation.version}, ${elevation.statusWords}`}
              onContextMenu={(event) => event.preventDefault()}
              onDragStart={(event) => event.preventDefault()}
            >
              <div className="w-full max-w-64 select-none md:max-w-none" aria-hidden="true">
                <House tone="light" flat scene={{ stop: 10, markers: "none", money: false, stringLabel: false }} />
              </div>
              <span className="absolute top-2 left-2" aria-hidden="true">
                <StatusChip tone={elevation.tone}>
                  {`v${elevation.version} · ${elevation.statusWords}`}
                </StatusChip>
              </span>
            </Link>
          ) : (
            <>
              <div className="w-full max-w-64 md:max-w-none">
                <House tone="light" scene={{ markers: "none", stringLabel: false }} />
              </div>
              <span className="glass-chip chip-locked absolute top-2 left-2">Elevation soon</span>
            </>
          )}
        </div>
        <div
          className="grid grid-rows-[auto_minmax(0,1fr)] justify-items-center gap-2"
          role="progressbar"
          aria-label="Construction progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
          aria-valuetext={`${progress.label}, ${progress.percent}% built`}
        >
          <p className="grid justify-items-center leading-none">
            <span className="figure text-22 text-ink">
              {progress.percent}
              <span className="text-15">%</span>
            </span>
            <span className="lettering mt-1 text-ink-soft">built</span>
          </p>
          <div className="thermo" aria-hidden="true">
            <div className="thermo-tube">
              <div className="thermo-fill" style={{ height: `${progress.percent}%` }} />
              {progress.ticks.slice(0, -1).map((at) => (
                <span key={at} className="thermo-tick" style={{ bottom: `${at}%` }} />
              ))}
            </div>
            <div className="thermo-bulb" />
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {waiting ? (
            <span className="glass-chip chip-waiting">Waiting on payment</span>
          ) : (
            <span className="glass-chip chip-progress">{progress.milestone ? `Milestone ${progress.milestone}` : "Now"}</span>
          )}
          <span className="min-w-0 flex-1 truncate text-15 font-semibold text-ink">{progress.stageName}</span>
        </p>
        {progress.tasks.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tasks now">
            {progress.tasks.map((task) => (
              <li
                key={task.id}
                className={`glass-chip ${
                  task.waitingForClient ? "chip-waiting" : task.state === "done" ? "chip-done" : ""
                }`}
              >
                {task.title}
                <span className="figure font-normal">
                  {task.waitingForClient ? " · your approval" : task.state === "done" ? "" : ` · ${task.percent}%`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
