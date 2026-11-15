"use client";

import { useId, useState } from "react";
import { field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { TaskView } from "@/lib/firm";
import type { PersonId } from "@/lib/firm-data";
import { formatStampShort } from "@/lib/format";
import { IconFile } from "./glass-ui";

// A junior's hand-in, answered in its row: accept it, or send it back with a note. Either
// waits five seconds before it is recorded.

export function ReviewPanel({ task, by, onDone }: { task: TaskView; by: PersonId; onDone: () => void }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const noteId = useId();
  const [back, setBack] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const first = firm.person(task.person)?.first ?? task.personName;

  const submit = (origin: HTMLElement, accept: boolean) => {
    if (pause.pending !== null) return;
    if (!accept && note.trim().length < 3) {
      setError("Add a note");
      return;
    }
    setError("");
    const { record } = demo;
    const words = note.trim();
    pause.start({
      what: accept ? `${task.title}, accepted` : `${task.title}, sent back to ${first}`,
      origin,
      commit: () => {
        if (accept) record({ kind: "task.accepted", taskId: task.id, by });
        else record({ kind: "task.sent-back", taskId: task.id, note: words, by });
        setNote("");
        onDone();
      },
    });
  };

  return (
    <div className="glass-inner mt-2 grid gap-3 p-3">
      <p className="flex items-center gap-2 text-15 text-ink">
        <IconFile className="text-ink-soft" />
        <span className="min-w-0">
          {task.deliverable}
          {task.submittedAt && <span className="text-ink-soft"> · {formatStampShort(task.submittedAt)}</span>}
        </span>
      </p>
      {back && (
        <div className="grid gap-1.5">
          <label htmlFor={noteId} className="text-15 font-semibold">
            Note for {first}
          </label>
          <textarea
            id={noteId}
            className={`${field} min-h-20 py-2`}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              if (error) setError("");
            }}
          />
          {error && (
            <p className="text-15 font-semibold text-brick" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {back ? (
          <>
            <button
              type="button"
              className="btn btn-primary min-h-11 px-4 text-15"
              aria-disabled={pause.pending !== null}
              onClick={(event) => submit(event.currentTarget, false)}
            >
              Send back
            </button>
            <button type="button" className="btn btn-glass min-h-11 px-4 text-15" onClick={() => setBack(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary min-h-11 px-4 text-15"
              aria-disabled={pause.pending !== null}
              onClick={(event) => submit(event.currentTarget, true)}
            >
              Accept
            </button>
            <button type="button" className="btn btn-glass min-h-11 px-4 text-15" onClick={() => setBack(true)}>
              Send back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
