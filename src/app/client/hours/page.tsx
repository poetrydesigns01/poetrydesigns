"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useOnHidden } from "@/components/craft/seal";
import { FocusTarget, Sheet, useFocusedId } from "@/components/home/sheet";
import { HoursRule } from "@/components/hours/hours-rule";
import { ClientPage } from "@/components/page-band";
import { Chip } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { SampleTag } from "@/components/register/sample-tag";
import { useDemo, useProjection } from "@/lib/demo-store";
import { formatDate, formatStamp, hours, inr } from "@/lib/format";

// Advisory hours: how many are left, what each session used, and a way to ask for more.
// Bought hours are added by the office once she has paid, and show here with who added
// them and when. Nothing on this screen works out a price.

const ASKS = [2, 5, 10];

export default function HoursPage() {
  const demo = useDemo();
  const projection = useProjection();
  const pause = usePause();
  const focused = useFocusedId();
  const [asking, setAsking] = useState(false);
  const [ask, setAsk] = useState(5);
  const rootRef = useRef<HTMLDivElement>(null);
  const askRef = useRef<HTMLButtonElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const firstChip = useRef<HTMLButtonElement>(null);
  const requestRef = useRef<HTMLDivElement>(null);
  const what = `Your request for ${hours(ask)} more`;
  const sending = pause.pending !== null && pause.pending.what === what;

  // A half-made request does not wait for her on a screen she has left.
  useOnHidden(rootRef, () => setAsking(false));

  const { before, during, left, low, requested, added, sessions } = projection.credits;
  const total = before.granted + during.granted;

  const openAsk = () => {
    flushSync(() => setAsking(true));
    firstChip.current?.focus();
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
        const focusedHere = rootRef.current?.matches(":focus-within") ?? false;
        flushSync(() => {
          demo.requestCredits(amount);
          setAsking(false);
        });
        if (focusedHere) requestRef.current?.focus({ preventScroll: true });
      },
    });
  };

  const newestAdded = added[added.length - 1];
  const focusOnRequest = Boolean(focused?.startsWith("hours:")) && requested !== null;
  const focusOnAdded = Boolean(focused?.startsWith("hours:")) && !focusOnRequest;

  return (
    <div ref={rootRef} className="contents">
      <ClientPage
        head={
          <>
            <h1 className="display display-xl max-w-[16ch] text-balance">
              {left > 0 ? `You have ${hours(left)} left of ${total}.` : "Your construction hours are used."}
            </h1>
            <p className="mt-4 max-w-[58ch] text-17 text-lime/85">
              {low ? "You are running low on construction hours, and sessions" : "Sessions"} still go ahead past your
              allowance.
            </p>
            {!requested && !asking && (
              <button ref={askRef} type="button" className="btn btn-primary mt-5" onClick={openAsk}>
                Ask for more hours
              </button>
            )}
            {!requested && asking && (
              // The choices sit on paper of their own, so they read as they do everywhere else.
              <div className="enter-row mt-5 max-w-[30rem] bg-lime p-4 text-ink" role="group" aria-label="Ask for more hours">
                <p className="font-semibold">How many more hours?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ASKS.map((option, index) => (
                    <Chip key={option} ref={index === 0 ? firstChip : undefined} pressed={ask === option} onClick={() => setAsk(option)}>
                      {hours(option)}
                    </Chip>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    ref={sendRef}
                    type="button"
                    className="btn btn-primary bg-rosewood! text-lime! hover:bg-rosewood-2!"
                    aria-disabled={sending || undefined} onClick={send}>
                    Send request
                  </button>
                  <button type="button" className="btn btn-quiet bg-sand-2! text-ink! hover:bg-sand!" onClick={closeAsk}>
                    Go back
                  </button>
                </div>
              </div>
            )}
          </>
        }
        table={<HoursRule />}
      >
        {requested && (
          <Sheet title="Your request">
            <FocusTarget on={focusOnRequest}>
              <div ref={requestRef} tabIndex={-1} className="outline-offset-4">
                <p className="max-w-[58ch]">
                  Asked on {requested.at.length > 10 ? formatStamp(requested.at) : formatDate(requested.at)} for{" "}
                  {requested.hours} more {requested.hours === 1 ? "hour" : "hours"}. Rohan Menon will call you with the price. Once you have paid, he adds them
                  here and you see who added them and when.
                </p>
              </div>
            </FocusTarget>
          </Sheet>
        )}

        <Sheet title="Hours added">
          {added.length === 0 ? (
            <p className="max-w-[58ch] text-ink-soft">No hours have been added yet.</p>
          ) : (
            <ul className="sheet-rows">
              {added.map((addition, index) => (
                <li key={addition.id}>
                  <FocusTarget on={focusOnAdded && addition === newestAdded}>
                    <p className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <span className="font-semibold">
                        {hours(addition.hours)} for {addition.pool === "during" ? "construction" : "before construction"}
                      </span>
                      <span className="figure">{inr(addition.amount)}</span>
                    </p>
                    <p className="max-w-[58ch] text-ink-soft">
                      Paid on {formatDate(addition.receivedOn)}, reference {addition.reference}, before GST.{" "}
                      {index === 0 && <SampleTag>Sample price</SampleTag>}
                    </p>
                  </FocusTarget>
                </li>
              ))}
            </ul>
          )}
        </Sheet>

        <Sheet title="Every session so far" tone="sand">
          <ul className="sheet-rows">
            {sessions.map((session) => (
              <li key={session.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4">
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug">{session.topic}</span>
                  <span className="block text-ink-soft">
                    {formatDate(session.date)}, with {session.with}
                  </span>
                </span>
                <span className="figure">{hours(session.hours)}</span>
              </li>
            ))}
          </ul>
        </Sheet>
      </ClientPage>
    </div>
  );
}
