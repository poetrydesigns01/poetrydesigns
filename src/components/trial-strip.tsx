"use client";

import Link from "next/link";
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
      className={`trial-strip on-dark${fresh ? " enter-rise" : ""}`}
      aria-label="A change you are trying"
    >
      <span className="trial-strip-edge" aria-hidden="true" />
      <div className="trial-strip-body">
        <p className="trial-strip-words">{sentence}</p>
        {/* Quiet, both: the screen under the strip keeps its own one filled control. */}
        <div className="flex shrink-0 items-center gap-4">
          <button type="button" className="link inline-flex min-h-11 cursor-pointer items-center text-15" onClick={onStop}>
            Stop trying
          </button>
          <Link href="/client/changes#waiting" className="btn btn-quiet">
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
  const { trialSentence, tried, pending } = useProjection();
  // What a screen reader is told, half a second after the trial last changed.
  const [spoken, setSpoken] = useState("");
  const statusRef = useRef<HTMLParagraphElement>(null);
  const lastTried = useRef<string[]>([]);
  const triedIds = tried.map((change) => change.id).join(" ");
  const pendingIds = pending.map((change) => change.id).join(" ");

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
      {trialSentence && <Strip sentence={trialSentence} onStop={stop} />}
      <p ref={statusRef} role="status" tabIndex={-1} className="sr-only">
        {spoken}
      </p>
    </>
  );
}
