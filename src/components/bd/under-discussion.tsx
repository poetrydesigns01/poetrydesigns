/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { dated, Empty, Panel } from "@/components/architect/glass-ui";
import { useOnHidden } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { DESK_HREF } from "@/lib/desk";
import { useFirm } from "@/lib/demo-store";
import type { ProspectLevel } from "@/lib/bd-data";
import { PROSPECT_LEVELS, UNDER_DISCUSSION, toCall, type ProspectView } from "@/lib/prospects";
import { Segmented } from "./bd-ui";
import { ME, ProspectCard } from "./prospect-bits";

// Under discussion: prospects before they pay the sign-up, by level. From 1024 px the four
// levels stand side by side as columns; on a phone a level filter sits over one list. Quiet
// leads (no move in 14 days, brick) go first in their column, then new enquiries to call
// (brass), then the longest at that level. The state line counts both, as the rail does.

type Who = "mine" | "all";
type LevelFilter = ProspectLevel | "all";

function byUrgency(a: ProspectView, b: ProspectView): number {
  return Number(b.followUpDue) - Number(a.followUpDue) || Number(toCall(b)) - Number(toCall(a)) || b.idleDays - a.idleDays;
}

export function UnderDiscussion() {
  const firm = useFirm();
  const [who, setWho] = useState<Who>("mine");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [open, setOpen] = useState<string | null>(null);
  useOnHidden(() => setOpen(null));

  const pool = who === "mine" ? firm.prospectsFor(ME) : firm.prospects;
  const active = pool.filter((p) => p.status === "active");
  const dropped = pool.filter((p) => p.status === "dropped");
  // His own to move, whichever list is shown: the same rows his Today and the rail count.
  const own = firm.prospectsFor(ME).filter((p) => p.status === "active");
  const quiet = own.filter((p) => p.followUpDue).length;
  const calls = own.filter(toCall).length;
  const state = [quiet > 0 ? `${quiet} to follow up` : "", calls > 0 ? `${calls} to call` : ""].filter(Boolean).join(" · ");
  const columns = PROSPECT_LEVELS.map((l) => ({ ...l, items: active.filter((p) => p.level === l.level).sort(byUrgency) }));

  return (
    <>
      <StaffBoard
        place={UNDER_DISCUSSION}
        headline={active.length === 0 ? "No one under discussion" : `${active.length} under discussion`}
        state={state || undefined}
        primary={{ label: "New enquiry", href: `${DESK_HREF.prospects}/new` }}
        chip={false}
      />

      <div className="mt-6 grid gap-4 lg:mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Segmented
            label="Whose leads"
            options={[
              { id: "mine", label: "Mine", count: firm.prospectsFor(ME).filter((p) => p.status === "active").length },
              { id: "all", label: "Everyone", count: firm.prospects.filter((p) => p.status === "active").length },
            ]}
            value={who}
            onChange={(id) => setWho(id)}
          />
          <Segmented
            className="w-full lg:hidden"
            label="Level"
            scroll
            options={[
              { id: "all" as LevelFilter, label: "All", count: active.length },
              ...columns.map((c) => ({ id: c.level as LevelFilter, label: `L${c.level}`, count: c.items.length, title: c.name })),
            ]}
            value={level}
            onChange={(id) => setLevel(id)}
          />
        </div>

        <div className="grid items-start gap-3 lg:grid-cols-4">
          {columns.map((c) => (
            <section
              key={c.level}
              aria-label={`${c.label}, ${c.name}`}
              className={`glass min-w-0 p-2 ${
                (level !== "all" && level !== c.level) || (level === "all" && c.items.length === 0) ? "max-lg:hidden" : ""
              }`}
            >
              <header className="flex min-h-11 items-center justify-between gap-2 px-2 pb-1">
                <h2 className="min-w-0">
                  <span className="lettering block text-ink-soft">{c.label}</span>
                  <span className="block truncate text-15 font-semibold text-ink">{c.name}</span>
                </h2>
                <span className="figure text-22 text-ink">{c.items.length}</span>
              </header>
              {c.items.length === 0 ? (
                <Empty>None</Empty>
              ) : (
                <ul className="grid gap-1.5">
                  {c.items.map((p) => (
                    <ProspectCard
                      key={p.id}
                      p={p}
                      open={open === p.id}
                      onToggle={() => setOpen(open === p.id ? null : p.id)}
                      showAdvisor={who === "all"}
                    />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {dropped.length > 0 && (
          <Panel title="Dropped">
            <ul className="grid gap-1">
              {dropped.map((p) => (
                <li key={p.id}>
                  <Link
                    href={DESK_HREF.prospect(p.id)}
                    className="glass-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5"
                  >
                    <span className="grid min-w-0 gap-0.5">
                      <span className="truncate text-15 text-ink">{p.owner}</span>
                      <span className="truncate text-13 text-ink-soft">{p.dropReason}</span>
                    </span>
                    <span className="text-13 text-ink-soft">{p.droppedAt ? dated(p.droppedAt) : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
