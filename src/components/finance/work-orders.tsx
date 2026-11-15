/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/admin/glass-kit";
import { Count, GlassTable, Panel, WaitChip } from "@/components/admin/glass-kit";
import { field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import { daysSince } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { daysBetween, formatShortDate } from "@/lib/format";
import type { WorkOrderView } from "@/lib/portal";
import { inScope } from "./shared";

// Labour and services the sites have asked for: a crew for a task, from a start date, for
// so many days. Procurement books a crew against each in a small sheet at the foot of the
// screen; the site sees "Crew booked".

export function WorkOrders({
  scope,
  person,
  taskId,
  title = "Work orders",
}: {
  scope: ProjectId | "all";
  person: PersonId;
  /** Only the orders for one site task, on a request's page. */
  taskId?: string;
  title?: string;
}) {
  const firm = useFirm();
  const [booking, setBooking] = useState<string | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const close = () => {
    setBooking(null);
    window.setTimeout(() => openerRef.current?.focus(), 0);
  };
  const orders = inScope(firm.workOrders, scope)
    .filter((w) => !taskId || w.taskId === taskId)
    .sort((a, b) => rank(a) - rank(b) || a.startOn.localeCompare(b.startOn));
  const waiting = orders.filter((w) => w.status === "requested").length;
  const chosen = orders.find((w) => w.id === booking && w.status === "requested");
  if (taskId && orders.length === 0) return null;

  return (
    <Panel
      title={title}
      aside={waiting > 0 ? <StatusChip tone="waiting">{`${waiting} to book`}</StatusChip> : <Count n={orders.length} />}
      strong
    >
      <GlassTable<WorkOrderView>
        caption={title}
        rows={orders}
        rowKey={(w) => w.id}
        wide="lg"
        empty="No labour or services asked for."
        chip={(w) => <StatusChip tone={w.tone}>{w.statusWords}</StatusChip>}
        lead={(w) => <Trade w={w} />}
        columns={[
          { label: "Labour", cell: (w) => <Trade w={w} /> },
          {
            label: "Task",
            cell: (w) => (
              <span className="grid font-normal">
                <span className="truncate">{w.taskTitle}</span>
                <span className="text-13 text-ink-soft">{firm.project(w.projectId)?.name}</span>
              </span>
            ),
          },
          { label: "Start", cell: (w) => <Start w={w} />, width: "w-32" },
          { label: "Days", cell: (w) => <span className="figure">{w.days}</span>, width: "w-16" },
          {
            label: "Waiting",
            cell: (w) => (w.status === "requested" ? <WaitChip days={daysSince(w.requestedAt)} /> : "–"),
            width: "w-28",
          },
          { label: "Status", cell: (w) => <StatusChip tone={w.tone}>{w.statusWords}</StatusChip>, phone: false, width: "w-36" },
          {
            label: "Action",
            bare: true,
            align: "right",
            width: "w-36",
            cell: (w) =>
              w.status === "requested" ? (
                <button
                  type="button"
                  className="btn btn-glass min-h-11 whitespace-nowrap px-4 text-15"
                  aria-expanded={booking === w.id}
                  aria-label={`Book crew, ${w.id} ${w.trade}, ${w.taskTitle}`}
                  onClick={(event) => {
                    openerRef.current = event.currentTarget;
                    setBooking((b) => (b === w.id ? null : w.id));
                  }}
                >
                  Book crew
                </button>
              ) : (
                <span className="text-13 text-ink-soft">{w.crew ?? ""}</span>
              ),
          },
        ]}
      />
      {chosen && <BookCrew key={chosen.id} order={chosen} person={person} onClose={close} />}
    </Panel>
  );
}

function rank(w: WorkOrderView): number {
  return w.status === "requested" ? 0 : w.status === "booked" ? 1 : w.status === "on-site" ? 2 : 3;
}

function Trade({ w }: { w: WorkOrderView }) {
  return (
    <span className="grid min-w-0">
      <span className="font-semibold">{w.trade}</span>
      <span className="text-13 font-normal text-ink-soft">{w.id}</span>
    </span>
  );
}

function Start({ w }: { w: WorkOrderView }) {
  const left = daysBetween(TODAY, w.startOn);
  return (
    <span className="grid font-normal">
      <span>{formatShortDate(w.startOn)}</span>
      {w.status === "requested" && (
        <span className={`text-13 ${left < 0 ? "late-text" : "text-ink-soft"}`}>
          {left < 0 ? `${-left} days late` : left === 0 ? "Today" : `in ${left} days`}
        </span>
      )}
    </span>
  );
}

function BookCrew({ order, person, onClose }: { order: WorkOrderView; person: PersonId; onClose: () => void }) {
  const demo = useDemo();
  const pause = usePause();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [crew, setCrew] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    const name = crew.trim();
    if (!name) {
      setError("Name the crew.");
      return;
    }
    setError("");
    const { record } = demo;
    pause.start({
      what: `${order.id}, ${name} booked`,
      origin: submitRef.current,
      commit: () => {
        record({ kind: "work-order.booked", projectId: order.projectId, workOrderId: order.id, crew: name, by: person });
        onClose();
      },
    });
  };
  // While the five-second pause runs, its bar (with Cancel) takes the foot of the screen; the
  // sheet steps aside but stays mounted, since closing it would record at once.
  const waiting = pause.pending !== null && pause.pending.what.startsWith(`${order.id},`);

  // In a portal: a glass panel's backdrop filter would otherwise hold a fixed sheet inside it.
  return createPortal(
    <div
      role="dialog"
      aria-labelledby={`${id}-title`}
      className={`fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[25] px-3 pb-3 lg:bottom-0 lg:left-[var(--dock-left,0px)] lg:pb-5 ${waiting ? "invisible" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <form onSubmit={submit} noValidate className="glass-pop mx-auto grid max-w-xl gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p id={`${id}-title`} className="grid">
            <span className="text-17 font-semibold">Book crew</span>
            <span className="text-13 text-ink-soft">
              {order.trade} · {order.id} · {order.days} days from {formatShortDate(order.startOn)}
            </span>
          </p>
          <button type="button" className="btn btn-glass -mt-1 -mr-1 size-11 shrink-0 p-0" aria-label="Close" onClick={onClose}>
            <Icon name="plus" className="size-4 rotate-45" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div>
            <label htmlFor={`${id}-crew`} className="sr-only">
              Crew or contractor
            </label>
            <input
              ref={inputRef}
              id={`${id}-crew`}
              className={field}
              placeholder="Crew or contractor"
              autoComplete="off"
              value={crew}
              aria-invalid={error ? true : undefined}
              onChange={(e) => setCrew(e.target.value)}
            />
            {error && (
              <p className="mt-1.5 text-15 font-semibold text-brick" role="alert">
                {error}
              </p>
            )}
          </div>
          <button ref={submitRef} type="submit" className="btn btn-primary min-h-12" aria-disabled={pause.pending !== null ? true : undefined}>
            Book
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
