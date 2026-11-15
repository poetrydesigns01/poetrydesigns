/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { DropZone } from "@/components/register/drop-zone";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { LogTime } from "@/components/tasks/log-time";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { TaskView } from "@/lib/firm";
import { WEEK, type PersonId } from "@/lib/firm-data";
import { datePart, hours } from "@/lib/format";
import { isOpen, taskChip, taskRank, useArchitect } from "./common";
import { dayTime, Empty, IconChat, IconClock, IconUpload, Panel, rowBtn, Stat, Stats } from "./glass-ui";

// The architect's own tasks as one table: what to hand in, by when, and where it stands.
// A task is handed in from its row with its file; hours can still be logged from here.

const COLS = "md:grid md:grid-cols-[minmax(0,1fr)_8.5rem_7.5rem_8rem]";

function HandIn({ task, person, onDone }: { task: TaskView; person: PersonId; onDone: () => void }) {
  const demo = useDemo();
  const pause = usePause();
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const slug = task.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 3)
    .join("-");

  return (
    <div className="glass-inner mt-2 grid gap-3 p-3">
      <DropZone
        label={task.deliverable}
        samples={[`${slug}.pdf`, `${slug}-source.dwg`]}
        accept="pdf"
        chosen={files}
        onChoose={(next) => {
          setFiles(next);
          setError("");
        }}
      />
      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary min-h-11 gap-1.5 px-4 text-15"
          aria-disabled={pause.pending !== null}
          onClick={(event) => {
            if (pause.pending !== null) return;
            if (files.length === 0) return setError("Choose the file");
            const { record } = demo;
            pause.start({
              what: `${task.title}, handed in`,
              origin: event.currentTarget,
              commit: () => {
                record({ kind: "task.submitted", taskId: task.id, note: files.join(", "), by: person });
                onDone();
              },
            });
          }}
        >
          <IconUpload /> Hand in
        </button>
        <button type="button" className="btn btn-glass min-h-11 px-4 text-15" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ArchitectTasks() {
  const firm = useFirm();
  const pause = usePause();
  const me = useArchitect();
  const [open, setOpen] = useState<string | null>(null);
  const [logging, setLogging] = useState(false);

  const mine = firm.tasks
    .filter((t) => t.person === me.id && t.kind === "work" && (me.scope === "all" || t.projectId === me.scope))
    .filter((t) => t.status !== "accepted" || (t.acceptedAt && datePart(t.acceptedAt) >= WEEK.from))
    .sort((a, b) => taskRank(a) - taskRank(b) || (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  const openTasks = mine.filter(isOpen);
  const late = openTasks.filter((t) => t.overdue).length;
  const inReview = mine.filter((t) => t.status === "submitted").length;
  const logged = firm.hoursThisWeek(me.id);
  // The headline carries the open count; a tile shows only a number that adds to it, and
  // the row stays hidden on a short list.
  const tiles = [
    late > 0 && <Stat key="late" label="Overdue" value={late} tone="late" />,
    inReview > 0 && <Stat key="review" label="In review" value={inReview} />,
    logged > 0 && <Stat key="hours" label="Hours this week" value={hours(logged)} />,
  ].filter(Boolean);
  const showStats = mine.length >= 3 && tiles.length > 0;

  const close = () => {
    if (pause.pending !== null) pause.cancel();
    setOpen(null);
  };

  return (
    <>
      <StaffBoard
        place="Tasks"
        headline={
          openTasks.length === 0 ? "No open tasks" : `${openTasks.length} open ${openTasks.length === 1 ? "task" : "tasks"}`
        }
      />
      <div className="mt-6 grid gap-4 lg:mt-8">
        {showStats && (
          <Stats label="Your tasks" cols={tiles.length === 3 ? 3 : 2}>
            {tiles}
          </Stats>
        )}

        <Panel
          title="My tasks"
          aside={
            <button
              type="button"
              className={rowBtn}
              aria-expanded={logging}
              onClick={() => {
                if (logging && pause.pending !== null) pause.cancel();
                setLogging(!logging);
              }}
            >
              <IconClock /> {logging ? "Close" : "Log hours"}
            </button>
          }
        >
          {logging && (
            <div className="glass-inner mb-3 p-3">
              <LogTime person={me.id} onDone={() => setLogging(false)} />
            </div>
          )}
          <div aria-hidden="true" className={`lettering hidden gap-x-3 px-3 pb-1 text-ink-soft ${COLS}`}>
            <span>Task</span>
            <span>Due</span>
            <span>Status</span>
            <span className="w-28" />
          </div>
          {mine.length === 0 ? (
            <Empty>No tasks</Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-1">
              {mine.map((t) => {
                const chip = taskChip(t);
                const expanded = open === t.id;
                return (
                  <li key={t.id} className="glass-row px-3 py-2.5">
                    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${COLS} md:items-center`}>
                      <div className="min-w-0 basis-full md:basis-auto">
                        <p className="truncate text-15 font-semibold text-ink">{t.title}</p>
                        <p className="-my-3 truncate py-3 text-13 text-ink-soft">
                          <Link href={`/staff/projects/${t.projectId}`} className="link -my-3 inline-flex min-h-11 items-center">
                            {t.projectName}
                          </Link>{" "}
                          · {t.deliverable}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-13 text-ink">
                        <IconClock className="text-ink-soft md:hidden" />
                        {t.dueAt ? dayTime(t.dueAt) : "—"}
                      </span>
                      <span>
                        <StatusChip tone={chip.tone}>{chip.words}</StatusChip>
                      </span>
                      <span className="ml-auto flex justify-end md:ml-0">
                        {isOpen(t) && (
                          <button
                            type="button"
                            className={rowBtn}
                            aria-expanded={expanded}
                            onClick={() => (expanded ? close() : setOpen(t.id))}
                          >
                            {expanded ? "Close" : (
                              <>
                                <IconUpload /> Hand in
                              </>
                            )}
                          </button>
                        )}
                      </span>
                    </div>
                    {t.status === "revision" && t.note && (
                      <p className="mt-2 flex items-start gap-1.5 text-15 text-ink">
                        <IconChat className="mt-1 text-ink-soft" />
                        <q>{t.note}</q>
                      </p>
                    )}
                    {expanded && <HandIn task={t} person={me.id} onDone={() => setOpen(null)} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
