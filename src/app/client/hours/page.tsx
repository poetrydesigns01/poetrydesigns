/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CLIENT_PAGE, PageHead } from "@/components/client-home/page-frame";
import { ClockIcon, PlusIcon } from "@/components/craft/glass-icons";
import {
  CLIENT_PROJECT,
  DesignChangeAsk,
  RequestRows,
  clientStatus,
  useHeadWords,
} from "@/components/hours/client-requests";
import { h, HoursMeter } from "@/components/hours/hours-meter";
import { useOnHidden, usePause } from "@/components/register/recording-pause";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useFirm, useProjection } from "@/lib/demo-store";
import type { PersonId } from "@/lib/firm-data";
import { personName } from "@/lib/projection";
import { formatDate, formatShortDate, formatStampShort } from "@/lib/format";

// Advisory hours: 12 before construction and 8 during it. A meter for each, the sessions
// that used them as a compact table, and one way to ask for more. A request for hours or a
// design change goes to the Project Head; once approved, its cost comes back here to approve.

const ASKS = [2, 5, 10];
const SESSION_GRID = "md:grid-cols-[7rem_minmax(0,1fr)_9.5rem_4rem] md:gap-x-4";

export default function HoursPage() {
  const demo = useDemo();
  const firm = useFirm();
  const projection = useProjection();
  const head = useHeadWords();
  const pause = usePause();
  const [asking, setAsking] = useState(false);
  const [ask, setAsk] = useState(5);
  const askRef = useRef<HTMLButtonElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const what = `Your request for ${h(ask)} more`;
  const sending = pause.pending !== null && pause.pending.what === what;

  // A half-made request does not wait on a screen she has left.
  useOnHidden(() => setAsking(false));

  const { before, during, left, added, sessions } = projection.credits;
  const requests = firm.requestsFor(CLIENT_PROJECT);
  // The hours request still in hand, if any: one at a time.
  const asked = requests.find((r) => r.type === "hours" && r.open);
  const askedStatus = asked ? clientStatus(asked, (id) => firm.person(id as PersonId)?.name ?? id) : null;
  const toApprove = requests.filter((r) => r.status === "fee-with-client" && !r.escalation?.open).length;
  const beforeLeft = Math.max(before.granted - before.used, 0);
  const over = Math.max(during.used - during.granted, 0);

  const openAsk = () => {
    flushSync(() => setAsking(true));
    firstRef.current?.focus();
  };

  const closeAsk = () => {
    if (sending) pause.cancel();
    flushSync(() => setAsking(false));
    askRef.current?.focus();
  };

  const send = () => {
    if (sending) return;
    const amount = ask;
    pause.start({
      what,
      origin: sendRef.current,
      commit: () => {
        flushSync(() => demo.raiseClientRequest(CLIENT_PROJECT, "hours", { hours: amount }, "meera"));
        setAsking(false);
      },
    });
  };

  const construction = sessions.filter((s) => s.phase === "Construction");
  const earlier = sessions.filter((s) => s.phase !== "Construction");
  const groups = [
    { title: "During construction", list: construction },
    { title: "Before construction", list: earlier },
  ].filter((group) => group.list.length > 0);

  return (
    <div className={CLIENT_PAGE}>
      <PageHead title="Advisory hours">{left <= 0 && <StatusChip tone="late">All used</StatusChip>}</PageHead>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-labelledby="hours-during" className="glass-dark grid content-start gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="hours-during" className="lettering text-lime/75">
                During construction
              </h2>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="figure display-lg">{h(Math.max(left, 0))}</span>
                <span className="text-15 text-lime/75">left of {h(during.granted)}</span>
              </p>
            </div>
            {over > 0 && <span className="glass-chip chip-late">{h(over)} over</span>}
          </div>

          <HoursMeter granted={during.granted} used={during.used} tone="dark" label="Construction hours used" />

          <dl className="grid grid-cols-2 gap-2">
            <div className="glass-inner px-3 py-2.5">
              <dt className="lettering text-lime/75">Used</dt>
              <dd className="figure text-22">{h(during.used)}</dd>
            </div>
            <div className="glass-inner px-3 py-2.5">
              <dt className="lettering text-lime/75">Sessions</dt>
              <dd className="figure text-22">{construction.length}</dd>
            </div>
          </dl>

          <div aria-live="polite">
            {asked && askedStatus ? (
              <div className="grid justify-items-start gap-2">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="glass-chip chip-waiting">
                    {h(asked.hours ?? 0)} · {askedStatus.words}
                  </span>
                  <span className="text-13 text-lime/75">{formatStampShort(asked.raisedAt)}</span>
                </p>
                {asked.status === "with-head" && !asked.escalation?.open && <p className="text-15 text-lime/80">Sent to {head}</p>}
                {asked.status === "fee-with-client" && !asked.escalation?.open && (
                  <a href="#requests" className="btn btn-primary min-h-11 px-5 text-15">
                    Review cost
                  </a>
                )}
              </div>
            ) : asking ? (
              <div role="group" aria-label="Request hours" className="glass-inner enter-row grid gap-3 p-3">
                <p className="lettering text-lime/75">How many?</p>
                <div className="flex flex-wrap gap-2">
                  {ASKS.map((option, index) => (
                    <button
                      key={option}
                      ref={index === 0 ? firstRef : undefined}
                      type="button"
                      aria-pressed={ask === option}
                      className={`btn btn-glass min-h-11 min-w-16 px-4 text-15 ${
                        ask === option ? "bg-lime text-rosewood hover:bg-lime" : ""
                      }`}
                      onClick={() => setAsk(option)}
                    >
                      {h(option)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    ref={sendRef}
                    type="button"
                    className="btn btn-primary min-h-11 px-5 text-15"
                    aria-disabled={sending || undefined}
                    onClick={send}
                  >
                    Send request
                  </button>
                  <button type="button" className="btn btn-glass min-h-11 px-4 text-15" onClick={closeAsk}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button ref={askRef} type="button" className="btn btn-primary min-h-11 gap-1.5 px-5 text-15" onClick={openAsk}>
                <PlusIcon size={17} />
                Request more hours
              </button>
            )}
          </div>
        </section>

        <section aria-labelledby="hours-before" className="glass grid content-start gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="hours-before" className="lettering text-ink-soft">
                Before construction
              </h2>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="figure text-32">{h(before.used)}</span>
                <span className="text-15 text-ink-soft">used of {h(before.granted)}</span>
              </p>
            </div>
            {beforeLeft > 0 ? (
              <StatusChip tone="done">{h(beforeLeft)} left</StatusChip>
            ) : (
              <StatusChip tone="locked">Closed</StatusChip>
            )}
          </div>
          <HoursMeter granted={before.granted} used={before.used} label="Hours used before construction" />
          <dl className="grid grid-cols-2 gap-2">
            <div className="glass-inner px-3 py-2.5">
              <dt className="lettering text-ink-soft">Sessions</dt>
              <dd className="figure text-22">{earlier.length}</dd>
            </div>
            <div className="glass-inner px-3 py-2.5">
              <dt className="lettering text-ink-soft">Allowance</dt>
              <dd className="figure text-22">{h(before.granted + during.granted)}</dd>
            </div>
          </dl>

          {added.length > 0 && (
            <div className="border-t border-ink/10 pt-3">
              <h3 className="lettering text-ink-soft">Added</h3>
              <ul className="mt-1 grid gap-1">
                {added.map((addition) => (
                  <li key={addition.id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-15">
                    <span className="figure">+{h(addition.hours)}</span>
                    <span className="text-13 text-ink-soft">
                      {personName(addition.by)} · {formatStampShort(addition.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section id="requests" aria-labelledby="hours-requests" className="glass scroll-mt-24 p-2 sm:p-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-2 pt-2">
          <h2 id="hours-requests" className="flex items-center gap-2 text-17 font-semibold text-ink">
            Your requests
            {toApprove > 0 && <StatusChip tone="waiting">{toApprove} to approve</StatusChip>}
          </h2>
          <DesignChangeAsk />
        </div>
        {requests.length === 0 ? (
          <p className="px-3 pb-3 text-15 text-ink-soft">None yet</p>
        ) : (
          <RequestRows requests={requests} label="Your requests" />
        )}
      </section>

      <section aria-labelledby="hours-sessions" className="glass-strong p-2 sm:p-3">
        <div className="flex items-center justify-between gap-3 px-3 pb-1 pt-2">
          <h2 id="hours-sessions" className="lettering text-ink-soft">
            Sessions
          </h2>
          <span className="flex items-center gap-1.5 text-13 text-ink-soft">
            <ClockIcon size={15} />
            {h(before.used + during.used)}
          </span>
        </div>
        <div aria-hidden="true" className={`lettering hidden px-3 pb-1 pt-1 text-ink-soft md:grid ${SESSION_GRID}`}>
          <span>Date</span>
          <span>Topic</span>
          <span>With</span>
          <span className="text-right">Hours</span>
        </div>
        {groups.map((group) => (
          <div key={group.title} className="mt-1">
            <h3 className="px-3 pb-1 pt-2 text-13 font-semibold text-ink-soft">{group.title}</h3>
            <ul>
              {group.list.map((session) => (
                <li
                  key={session.id}
                  className={`glass-row grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-3 py-2.5 ${SESSION_GRID}`}
                >
                  <span className="hidden text-15 md:block">{formatDate(session.date)}</span>
                  <span className="min-w-0">
                    <span className="block text-15 leading-snug">{session.topic}</span>
                    <span className="block text-13 text-ink-soft md:hidden">
                      {formatShortDate(session.date)} · {session.with}
                    </span>
                  </span>
                  <span className="hidden truncate text-15 md:block">{session.with}</span>
                  <span className="figure text-right text-15">
                    <span className="sr-only">Used </span>
                    {h(session.hours)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
