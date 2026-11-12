"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type MouseEvent, type Ref } from "react";
import { MaterialStack } from "@/components/instruments/material-stack";
import { field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { RegisterRow } from "@/components/register/register";
import { StatusWord } from "@/components/register/status-word";
import { LogTime } from "@/components/tasks/log-time";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import { ageWords, daysSince, type RequestView, type TaskView, type TurnItem } from "@/lib/firm";
import type { PersonId } from "@/lib/firm-data";
import { datePart, formatShortDate, formatStamp, hours } from "@/lib/format";
import { LadderStrip } from "./ladder-strip";
import { nounOf } from "./site-words";

// The rows the site engineer's registers share. A row in "Your turn" opens what it asks
// for in place: the time log for a task, the hand-in for a review, the delivery mark for
// a request whose PO is uploaded. A row in "My requests" is one link to the request.

/** Closing a panel backs out of a pause it started; a panel that went away would commit it. */
export function useClose(rowId: string, close: () => void) {
  const pause = usePause();
  return () => {
    if (pause.pending !== null && pause.pending.rowId === rowId) pause.cancel();
    close();
  };
}

/**
 * Where focus goes once an inline panel has recorded and closed. If focus was in the panel
 * (or on the row's own button), it goes back to the row's toggle. If the row itself left
 * the register (a task accepted, a request delivered), onGone says where it should go.
 */
export function useRefocus(open: boolean, onGone?: () => void) {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const gone = useRef(onGone);
  useEffect(() => {
    gone.current = onGone;
  });

  /** Called from a commit, before the store write redraws the row. */
  const markFocus = () => {
    const active = document.activeElement;
    if (active && (panelRef.current?.contains(active) || active === toggleRef.current)) pending.current = true;
  };

  useEffect(() => {
    if (!open && pending.current && toggleRef.current) {
      pending.current = false;
      toggleRef.current.focus({ preventScroll: true });
    }
  }, [open]);

  useEffect(() => {
    const waiting = pending;
    const elsewhere = gone;
    return () => {
      if (!waiting.current) return;
      waiting.current = false;
      elsewhere.current?.();
    };
  }, []);

  return { toggleRef, panelRef, markFocus };
}

/** Focus the first control inside a register, or the register itself when it has none. */
export function focusFirstIn(within: HTMLElement | null): void {
  if (!within) return;
  (within.querySelector<HTMLElement>("a[href], button") ?? within).focus({ preventScroll: true });
}

/** Accept a junior's hand-in, or send it back with what needs doing. */
export function ReviewPanel({ task, reviewer, onDone }: { task: TaskView; reviewer: PersonId; onDone: () => void }) {
  const demo = useDemo();
  const pause = usePause();
  const id = useId();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const first = task.personName.split(" ")[0];
  const set = pause.pending !== null;

  const accept = (event: MouseEvent<HTMLButtonElement>) => {
    if (set) return;
    const { record } = demo;
    pause.start({
      what: `${task.title}, accepted`,
      origin: event.currentTarget,
      commit: () => {
        record({ kind: "task.accepted", taskId: task.id, by: reviewer });
        setNote("");
        onDone();
      },
    });
  };

  const sendBack = (event: MouseEvent<HTMLButtonElement>) => {
    if (set) return;
    const words = note.trim();
    if (!words) {
      setError(`Say what ${first} should do again.`);
      return;
    }
    setError("");
    const { record } = demo;
    pause.start({
      what: `${task.title}, sent back to ${first}`,
      origin: event.currentTarget,
      commit: () => {
        record({ kind: "task.sent-back", taskId: task.id, note: words, by: reviewer });
        setNote("");
        onDone();
      },
    });
  };

  return (
    <div className="grid gap-4 pt-2">
      <p className="text-17">
        {first} handed in the {task.deliverable.charAt(0).toLowerCase() + task.deliverable.slice(1)}
        {task.submittedAt ? ` on ${formatStamp(task.submittedAt)}` : ""}, with {hours(task.hoursLogged)} logged.
      </p>
      <div>
        <button type="button" className="btn btn-quiet w-full sm:w-auto" aria-disabled={set} onClick={accept}>
          Accept
        </button>
      </div>
      <div>
        <label htmlFor={id} className="block text-17 font-semibold">
          Or send it back, saying what needs doing
        </label>
        <textarea
          id={id}
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={`${field} mt-1.5 py-3`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p id={`${id}-error`} className="mt-1.5 text-17 font-semibold text-brick" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="btn btn-quiet mt-3 w-full sm:w-auto" aria-disabled={set} onClick={sendBack}>
          Send back to {first}
        </button>
      </div>
    </div>
  );
}

/** "Mark delivered" for a request whose order is on site. One press, then the pause. */
export function DeliveredButton({
  request,
  person,
  onRecorded,
  ref,
}: {
  request: RequestView;
  person: PersonId;
  /** Told whether the press came from the keyboard, just before the delivery is recorded. */
  onRecorded?: (keyboard: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  const demo = useDemo();
  const pause = usePause();
  return (
    <button
      ref={ref}
      type="button"
      className="btn btn-quiet"
      aria-disabled={pause.pending !== null}
      onClick={(event) => {
        if (pause.pending !== null) return;
        const keyboard = event.detail === 0;
        const { record } = demo;
        pause.start({
          what: `${request.no}, delivered`,
          origin: event.currentTarget,
          commit: () => {
            onRecorded?.(keyboard);
            record({ kind: "request.delivered", no: request.no, by: person });
          },
        });
      }}
    >
      Mark delivered
    </button>
  );
}

/** One row of "Your turn", with its action opening in place. */
export function TurnRow({ item, person, onGone }: { item: TurnItem; person: PersonId; onGone?: () => void }) {
  const firm = useFirm();
  const [open, setOpen] = useState(false);
  const close = useClose(item.id, () => setOpen(false));
  const { toggleRef, panelRef, markFocus } = useRefocus(open, onGone);
  const done = () => {
    markFocus();
    setOpen(false);
  };
  const toggle = () => (open ? close() : setOpen(true));

  const taskId = item.id.startsWith("task:") ? item.id.slice(5) : null;
  const task = taskId ? firm.tasks.find((t) => t.id === taskId) : undefined;
  const no = item.id.startsWith("mr:") ? item.id.slice(3) : null;
  const request = no ? firm.requests.find((r) => r.no === no) : undefined;
  const item0 = request ? firm.catalogueAll.find((c) => c.id === request.lines[0]?.material) : undefined;
  const review = Boolean(task && item.alt);
  // Today's page: a row carries the stamps made today. Older ones are on the row's own page.
  const stamps = item.stamps.filter((stamp) => datePart(stamp.at) === TODAY);
  // A status the newest stamp already says is not said again in the sentence.
  const status = (item.status ?? []).filter((word, i) => !(i === 0 && stamps[0]?.words === word));

  let action = null;
  if (item.action?.href) {
    action = (
      <Link href={item.action.href} className="btn btn-quiet">
        {item.action.label}
      </Link>
    );
  } else if (request) {
    action = <DeliveredButton ref={toggleRef} request={request} person={person} onRecorded={markFocus} />;
  } else if (task) {
    action = (
      <button ref={toggleRef} type="button" className="btn btn-quiet" aria-expanded={open} onClick={toggle}>
        {open ? "Close" : review ? "Accept or send back" : item.action?.label === "Start" ? "Start work" : "Log time"}
      </button>
    );
  }

  return (
    <RegisterRow
      id={item.id}
      margin={item.margin}
      marginSub={item.marginSub}
      overdue={item.overdue}
      title={item.title}
      sentence={
        <>
          {status.length > 0 && (
            <>
              {status[0] === item.status?.[0] ? <StatusWord>{status[0]}</StatusWord> : <span className="font-bold">{status[0]}</span>}
              {status.slice(1).map((word) => (
                <span key={word} className="font-bold">
                  . {word}
                </span>
              ))}
              {". "}
            </>
          )}
          {item.sentence}
        </>
      }
      figure={item.figure}
      instrument={
        request && item0 ? (
          <MaterialStack
            item={item0}
            requested={request.lines[0].qty}
            ordered={request.pos.map((po) => po.lines.find((l) => l.lineId === request.lines[0].id)?.qty ?? 0)}
            delivered={Boolean(request.deliveredAt)}
            width={140}
          />
        ) : undefined
      }
      action={action}
      stamps={stamps}
    >
      {open && task && (
        <div ref={panelRef}>
          {review ? (
            <ReviewPanel task={task} reviewer={person} onDone={done} />
          ) : (
            <LogTime person={person} taskId={task.id} onDone={done} />
          )}
        </div>
      )}
    </RegisterRow>
  );
}

/** Whose turn a request of yours is on, and for how long. */
export function requestMargin(r: RequestView): { margin: string; marginSub?: string } {
  if (r.queued) return { margin: "Not sent yet" };
  if (r.status === "Delivered") return { margin: ageWords(daysSince(r.deliveredAt ?? r.at)) };
  if (r.status === "PO uploaded") return { margin: "Yours", marginSub: ageWords(r.days) };
  return { margin: "With procurement", marginSub: ageWords(r.days) };
}

/** A request of yours as one link, with the ladder on its side. Its stamps are on its own page. */
export function RequestRow({ request }: { request: RequestView }) {
  const firm = useFirm();
  const first = request.lines[0];
  const item = firm.catalogueAll.find((c) => c.id === first.material);
  const more = request.lines.length - 1;
  const { margin, marginSub } = requestMargin(request);
  return (
    <RegisterRow
      id={`mr:${request.no}`}
      margin={margin}
      marginSub={marginSub}
      title={`${request.no}, ${item ? nounOf(item) : first.material}${more > 0 ? ` and ${more} more` : ""}`}
      sentence={
        <>
          {request.lineWords.join("; ")}. {request.projectName}, needed by {formatShortDate(request.neededBy)}.
          {/* Under the words, not in a column of its own, so a narrow register keeps its width for them. */}
          <span className="mt-2 block">
            <LadderStrip request={request} />
          </span>
        </>
      }
      href={`/staff/site/requests/${request.no}`}
    />
  );
}
