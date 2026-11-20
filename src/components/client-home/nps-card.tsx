/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useRef, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import { usePause } from "@/components/register/recording-pause";
import { NPS_QUESTION } from "@/lib/bd-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import { PROJECT } from "./data";

// After a milestone (and at handover) the home asks one question, 0 to 10, once. A tap picks
// the score; a comment is optional; Send waits five seconds (Cancel undoes it), then records it
// and the card says thank you. "Not now" hides it for this visit; it asks again until answered.

const SCORES = Array.from({ length: 11 }, (_, i) => i);

export function NpsCard() {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const id = useId();
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const thanksRef = useRef<HTMLParagraphElement>(null);
  const ask = firm.npsAsk(PROJECT);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [thanked, setThanked] = useState(false);
  const [later, setLater] = useState(false);

  if (thanked) {
    return (
      <section aria-labelledby={`${id}-thanks`} className="glass enter-row grid gap-1 p-5 sm:p-6">
        <p className="lettering text-ink-soft">Your feedback</p>
        <p id={`${id}-thanks`} ref={thanksRef} tabIndex={-1} className="display text-22 text-ink outline-none">
          Thank you
        </p>
      </section>
    );
  }
  if (!ask || later) return null;

  const busy = pause.pending !== null;
  const send = (event: MouseEvent<HTMLButtonElement>) => {
    if (score === null || busy) return;
    const answer = { score, comment, milestone: ask.milestone };
    const { answerNps } = demo;
    pause.start({
      what: `Your score, ${answer.score} out of 10`,
      origin: event.currentTarget,
      commit: () => {
        flushSync(() => {
          answerNps(PROJECT, answer.score, answer.comment, answer.milestone, "meera");
          setThanked(true);
        });
        thanksRef.current?.focus({ preventScroll: true });
      },
    });
  };

  return (
    <section aria-labelledby={`${id}-q`} className="glass grid gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="lettering text-ink-soft">{ask.point} done</p>
        <button type="button" className="btn btn-glass min-h-11 px-4 text-15" onClick={() => setLater(true)}>
          Not now
        </button>
      </div>
      <h2 id={`${id}-q`} className="display text-22 text-ink">
        {NPS_QUESTION}
      </h2>
      <div className="grid gap-1.5">
        <div role="group" aria-labelledby={`${id}-q`} className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
          {SCORES.map((n) => {
            const on = score === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                aria-label={`${n} out of 10`}
                onClick={() => {
                  flushSync(() => setScore(n));
                  commentRef.current?.focus({ preventScroll: true });
                }}
                className={`figure grid min-h-11 place-items-center rounded-xl text-17 transition-transform duration-150 active:scale-95 ${
                  on ? "bg-rosewood text-lime" : "glass-inner text-ink hover:bg-white/70"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-13 text-ink-soft" aria-hidden>
          <span>Not likely</span>
          <span>Very likely</span>
        </div>
      </div>
      {score !== null && (
        <div className="enter-row grid gap-3">
          <label className="grid gap-1.5" htmlFor={`${id}-comment`}>
            <span className="text-13 text-ink-soft">Comment, optional</span>
            <textarea
              ref={commentRef}
              id={`${id}-comment`}
              rows={2}
              maxLength={400}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="glass-field w-full px-3 py-2 text-17 leading-snug text-ink"
            />
          </label>
          <div>
            <button type="button" className="btn btn-glass" aria-disabled={busy ? true : undefined} onClick={send}>
              Send
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
