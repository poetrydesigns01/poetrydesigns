/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useOnHidden } from "@/components/craft/seal";
import { useDemo, useProjection } from "@/lib/demo-store";

/**
 * The strip itself. It rises once, when a trial starts. A screen that is hidden and shown
 * again keeps it in the document, so the rise is dropped on the way out and it is simply
 * there on the way back.
 */
function Strip({ sentence, onStop }: { sentence: string; onStop: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const [fresh, setFresh] = useState(true);
  useOnHidden(ref, () => setFresh(false));

  // The strip's height, as --trial-h on the root, so the bars that ride along the bottom of a
  // page (a decision bar, the estimate's bar, the composer) stand above it, never under it.
  useLayoutEffect(() => {
    const strip = ref.current;
    if (!strip) return;
    const root = strip.ownerDocument.documentElement;
    const measure = () => root.style.setProperty("--trial-h", `${strip.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--trial-h");
    };
  }, []);

  return (
    <aside
      ref={ref}
      className={`trial-strip-glass sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 mx-auto mb-3 w-[calc(100%-2rem)] max-w-3xl lg:bottom-4${fresh ? " enter-rise" : ""}`}
      aria-label="A change you are previewing"
    >
      <div className="glass-pop flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5 pl-4 pr-2">
        <p className="min-w-0 flex-1 text-15">
          <span className="glass-chip chip-waiting mr-2">Preview</span>
          {sentence}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="btn btn-glass min-h-11 px-4 text-15" onClick={onStop}>
            Stop
          </button>
          <Link href="/client/changes" className="btn btn-glass min-h-11 px-4 text-15">
            Decide
          </Link>
        </div>
      </div>
    </aside>
  );
}

/**
 * While a change is being tried, this strip follows her to every client screen: what is
 * being tried, what it would do, and the two ways out. It sits above the phone tab bar,
 * or along the bottom edge on a wider screen, and takes its own room at the end of the
 * page so it never covers the last line.
 */
export function TrialStrip() {
  const { stopTrying } = useDemo();
  // A preview belongs to the changes screen, which shows it in its own hero. Any other client
  // screen (a reload included) takes it off the house, so no strip follows her around.
  const path = usePathname() ?? "";
  const onClient = path.startsWith("/client");
  const offChanges = onClient && !path.startsWith("/client/changes");
  const { trialSentence, tried, pending } = useProjection();
  // What a screen reader is told, half a second after the trial last changed.
  const [spoken, setSpoken] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const lastTried = useRef<string[]>([]);
  const triedIds = tried.map((change) => change.id).join(" ");
  const pendingIds = pending.map((change) => change.id).join(" ");

  useEffect(() => {
    if (offChanges && triedIds) stopTrying();
  }, [offChanges, triedIds, stopTrying]);

  useEffect(() => {
    const before = lastTried.current;
    lastTried.current = triedIds ? triedIds.split(" ") : [];
    // A trial that ended because the change was decided is told by the decision itself.
    const takenOff = before.some((id) => pendingIds.split(" ").includes(id));
    const timer = window.setTimeout(() => {
      setSpoken((last) => trialSentence ?? (last && takenOff ? "Nothing is being tried on the house now." : ""));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [trialSentence, triedIds, pendingIds]);

  // The strip goes with the button that was pressed, so the line that says so takes the focus.
  const stop = () => {
    flushSync(stopTrying);
    statusRef.current?.focus({ preventScroll: true });
  };

  return (
    <>
      {trialSentence && !onClient && <Strip sentence={trialSentence} onStop={stop} />}
      <p ref={statusRef} role="status" tabIndex={-1} className="sr-only">
        {spoken}
      </p>
    </>
  );
}
