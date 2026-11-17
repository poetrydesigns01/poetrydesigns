/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useId, useState, type MouseEvent, type Ref } from "react";
import { field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { RequestView, TaskView, TurnItem } from "@/lib/firm";
import type { PersonId } from "@/lib/firm-data";
import { Icon, PanelHead } from "./site-kit";

// What needs the site engineer, as short glass rows with one action each: a delivery to
// mark, a stage to mark done, a junior's hand-in to accept or send back, a task to hand in.

/** "Mark delivered" for a request whose order is on its way. One press, then the pause. */
export function DeliveredButton({
  request,
  person,
  primary = false,
  ref,
}: {
  request: RequestView;
  person: PersonId;
  primary?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  const demo = useDemo();
  const pause = usePause();
  return (
    <button
      ref={ref}
      type="button"
      className={`btn ${primary ? "btn-primary" : "btn-glass"} gap-2 btn-sm`}
      aria-disabled={pause.pending !== null ? true : undefined}
      onClick={(event) => {
        if (pause.pending !== null) return;
        const { record } = demo;
        pause.start({
          what: `${request.no}, delivered`,
          origin: event.currentTarget,
          commit: () => record({ kind: "request.delivered", no: request.no, by: person }),
        });
      }}
    >
      <Icon name="truck" className="size-4.5" />
      {primary ? "Mark delivered" : "Delivered"}
    </button>
  );
}

/** Accept a junior's hand-in, or send it back with a note. */
function ReviewPanel({ task, reviewer, onDone }: { task: TaskView; reviewer: PersonId; onDone: () => void }) {
  const demo = useDemo();
  const pause = usePause();
  const id = useId();
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
        onDone();
      },
    });
  };

  return (
    <div className="grid gap-3 px-3 pb-3">
      <label htmlFor={id} className="sr-only">
        Note for {first}
      </label>
      <input
        id={id}
        value={note}
        onChange={(event) => setNote(event.target.value)}
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
          <Icon name="check" className="mr-1.5 size-4.5" />
          Accept
        </button>
      </div>
    </div>
  );
}

/** A task of the person's own, handed in with one press. */
function HandInButton({ task, person }: { task: TaskView; person: PersonId }) {
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

function TurnRow({ item, person }: { item: TurnItem; person: PersonId }) {
  const firm = useFirm();
  const [open, setOpen] = useState(false);
  const taskId = item.id.startsWith("task:") ? item.id.slice(5) : null;
  const task = taskId ? firm.tasks.find((t) => t.id === taskId) : undefined;
  const no = item.id.startsWith("mr:") ? item.id.slice(3) : null;
  const request = no ? firm.requests.find((r) => r.no === no) : undefined;
  const review = Boolean(task && item.alt);
  const project = item.projectId ? firm.project(item.projectId) : undefined;

  let action = null;
  if (item.action?.href) {
    action = (
      <Link href={item.action.href} className="btn btn-glass btn-sm">
        {item.action.label}
      </Link>
    );
  } else if (request) {
    action = <DeliveredButton request={request} person={person} />;
  } else if (task && review) {
    action = (
      <button type="button" className="btn btn-glass gap-1 btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        Review
        <Icon name="chevron" className="site-chevron size-4.5" />
      </button>
    );
  } else if (task) {
    action = <HandInButton task={task} person={person} />;
  }

  return (
    <li className="glass-row">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5">
        <div className="grid min-w-0 gap-1">
          <p className="text-15 font-semibold text-ink">{item.title}</p>
          <p className="flex flex-wrap items-center gap-2 text-13 text-ink-soft">
            <StatusChip tone={item.overdue ? "late" : "waiting"}>{item.margin}</StatusChip>
            {project && <span>{project.name}</span>}
          </p>
        </div>
        {action}
      </div>
      {open && task && <ReviewPanel task={task} reviewer={person} onDone={() => setOpen(false)} />}
    </li>
  );
}

/** The rows that need this person, in a glass panel. Nothing is drawn when there are none. */
export function NeedsYou({ items, person, title = "Needs you" }: { items: TurnItem[]; person: PersonId; title?: string }) {
  const id = useId();
  if (items.length === 0) return null;
  return (
    <section className="glass p-2 sm:p-3" aria-labelledby={id}>
      <PanelHead id={id} title={title} icon="flag" count={items.length} />
      <ul className="grid gap-1">
        {items.map((item) => (
          <TurnRow key={item.id} item={item} person={person} />
        ))}
      </ul>
    </section>
  );
}
