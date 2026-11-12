"use client";

import { useId, useState } from "react";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { TaskView } from "@/lib/firm";
import type { PersonId } from "@/lib/firm-data";
import { formatStampShort } from "@/lib/format";

// A junior's hand-in, answered in the row it arrived in: accept it, or send it back with a
// note saying what to change. Either waits five seconds, then the row carries the stamp and
// a copy goes to the junior, whose task list shows the answer.

export function ReviewPanel({ task, by, onDone }: { task: TaskView; by: PersonId; onDone: () => void }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const noteId = useId();
  const [choice, setChoice] = useState<"accept" | "back">("accept");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const first = firm.person(task.person)?.first ?? task.personName;

  const submit = (origin: HTMLElement) => {
    // Set aside, not disabled, while a pause runs, so the button keeps focus for Cancel.
    if (pause.pending !== null) return;
    if (choice === "back" && note.trim().length < 3) {
      setError(`Say what ${first} should change.`);
      return;
    }
    setError("");
    const { record } = demo;
    const words = note.trim();
    pause.start({
      what: choice === "accept" ? `${task.title}, accepted` : `${task.title}, sent back to ${first}`,
      origin,
      commit: () => {
        if (choice === "accept") record({ kind: "task.accepted", taskId: task.id, by });
        else record({ kind: "task.sent-back", taskId: task.id, note: words, by });
        setNote("");
        onDone();
      },
    });
  };

  return (
    <div className="grid gap-4 pt-2">
      <p className="text-15 text-ink-soft">
        {first} handed in the {/^[A-Z][a-z]/.test(task.deliverable) ? task.deliverable.charAt(0).toLowerCase() + task.deliverable.slice(1) : task.deliverable}
        {task.submittedAt ? ` on ${formatStampShort(task.submittedAt)}` : ""}.
      </p>
      <ChipGroup label="Your answer" columns={2}>
        <Chip pressed={choice === "accept"} onClick={() => setChoice("accept")}>
          Accept
        </Chip>
        <Chip pressed={choice === "back"} onClick={() => setChoice("back")}>
          Send back
        </Chip>
      </ChipGroup>
      {choice === "back" && (
        <Field label={`What ${first} should change`} error={error} htmlFor={noteId}>
          <textarea
            id={noteId}
            className={`${field} min-h-24 py-2`}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              if (error) setError("");
            }}
          />
        </Field>
      )}
      <div>
        <button
          type="button"
          className="btn btn-quiet"
          aria-disabled={pause.pending !== null}
          onClick={(event) => submit(event.currentTarget)}
        >
          {choice === "accept" ? `Accept ${first}'s work` : `Send back to ${first}`}
        </button>
      </div>
    </div>
  );
}
