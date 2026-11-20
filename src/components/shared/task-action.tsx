/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useState, type MouseEvent, type ReactNode } from "react";
import { field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { Firm, TaskView } from "@/lib/firm";
import type { PersonId } from "@/lib/firm-data";

// A work task answered where it is listed: whoever it is given to hands it in with one press;
// whoever set it accepts it or sends it back with a note. Each waits five seconds before it is
// recorded. Used in Today rows (`AttentionList` action) and the site's task list.

const OPEN = new Set<TaskView["status"]>(["planned", "in-progress", "revision"]);

/** What this person can do with a task now: hand it in, review it, or nothing. */
export function taskTurn(task: TaskView | undefined, person: PersonId): "hand-in" | "review" | null {
  if (!task || task.kind !== "work") return null;
  if (task.person === person && OPEN.has(task.status)) return "hand-in";
  if (task.assignedBy === person && task.status === "submitted") return "review";
  return null;
}

/** "Hand in", one press, then the pause. */
export function HandInButton({ task, person }: { task: TaskView; person: PersonId }) {
  const demo = useDemo();
  const pause = usePause();
  return (
    <button
      type="button"
      className="btn btn-glass btn-sm"
      aria-disabled={pause.pending !== null ? true : undefined}
      onClick={(event) => {
        if (pause.pending !== null) return;
        const { record } = demo;
        pause.start({
          what: `${task.title}, handed in`,
          origin: event.currentTarget,
          commit: () => record({ kind: "task.submitted", taskId: task.id, by: person }),
        });
      }}
    >
      Hand in
    </button>
  );
}

/**
 * "Review", opening a note and Accept / Send back under the row. Renders two grid items: the
 * button, and the panel spanning both columns while open.
 */
export function ReviewToggle({ task, reviewer }: { task: TaskView; reviewer: PersonId }) {
  const demo = useDemo();
  const pause = usePause();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const first = task.personName.split(" ")[0];
  const busy = pause.pending !== null;

  const decide = (event: MouseEvent<HTMLButtonElement>, accept: boolean) => {
    if (busy) return;
    const words = note.trim();
    if (!accept && !words) {
      setError(true);
      return;
    }
    setError(false);
    const { record } = demo;
    pause.start({
      what: accept ? `${task.title}, accepted` : `${task.title}, sent back to ${first}`,
      origin: event.currentTarget,
      commit: () => {
        record(
          accept
            ? { kind: "task.accepted", taskId: task.id, by: reviewer }
            : { kind: "task.sent-back", taskId: task.id, note: words, by: reviewer },
        );
        setNote("");
        setOpen(false);
      },
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-glass btn-sm"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => {
          if (open && busy) pause.cancel();
          setOpen(!open);
        }}
      >
        {open ? "Close" : "Review"}
      </button>
      {open && (
        <div id={`${id}-panel`} className="col-span-2 grid gap-3 px-2 pt-1 pb-2">
          <label htmlFor={`${id}-note`} className="sr-only">
            Note for {first}
          </label>
          <input
            id={`${id}-note`}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setError(false);
            }}
            placeholder="Note, to send back"
            className={field}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {error && (
            <p id={`${id}-error`} className="late-text text-15" role="alert">
              Add a note
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-glass btn-sm" aria-disabled={busy ? true : undefined} onClick={(e) => decide(e, false)}>
              Send back
            </button>
            <button type="button" className="btn btn-glass btn-sm" aria-disabled={busy ? true : undefined} onClick={(e) => decide(e, true)}>
              Accept
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** The action for a Today row "task:<id>": Hand in or Review, or nothing. */
export function TaskRowAction({ itemId, person }: { itemId: string; person: PersonId }) {
  const firm = useFirm();
  const task = itemId.startsWith("task:") ? firm.tasks.find((t) => t.id === itemId.slice(5)) : undefined;
  const turn = taskTurn(task, person);
  if (!task || !turn) return null;
  return turn === "hand-in" ? <HandInButton task={task} person={person} /> : <ReviewToggle task={task} reviewer={person} />;
}

/** For an `AttentionList` action: a "task:<id>" row this person can answer gets its button. */
export function taskActionFor(firm: Firm, itemId: string, person: PersonId): ReactNode {
  if (!itemId.startsWith("task:")) return null;
  return taskTurn(firm.tasks.find((t) => t.id === itemId.slice(5)), person) ? <TaskRowAction itemId={itemId} person={person} /> : null;
}
