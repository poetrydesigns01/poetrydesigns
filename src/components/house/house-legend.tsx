"use client";

import { useRef, useSyncExternalStore } from "react";
import { PegMark, SealMark } from "./house";

export type LegendKey = "built" | "paid" | "approved" | "to-come" | "peg" | "seal" | "trying" | "line";

const WORDS: Record<LegendKey, string> = {
  built: "Built",
  paid: "Paid",
  approved: "Approved, waiting for your bank",
  "to-come": "Still to come",
  peg: "Waiting for you",
  seal: "You agreed this",
  trying: "Trying, not approved",
  line: "Where the builders are now",
};

// Closing the legend is remembered for the page load, so it stays closed from screen to
// screen. Screens that are kept while hidden read the same memory when they come back.
const memory = { closed: false };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isOpen() {
  return !memory.closed;
}

function setOpen(open: boolean) {
  if (memory.closed === !open) return;
  memory.closed = !open;
  listeners.forEach((listener) => listener());
}

// Two courses of blocks in running bond, small enough to sit beside a word.
const JOINTS = "M1 9.5h28M10 1v8.5M20 1v8.5M5 9.5v8.5M15 9.5v8.5M25 9.5v8.5";

function Swatch({ kind, light }: { kind: LegendKey; light: boolean }) {
  if (kind === "peg") return <PegMark className="h-[22px] w-auto shrink-0" />;
  if (kind === "seal") return <SealMark className="size-[18px] shrink-0" />;
  if (kind === "trying") {
    return (
      <span
        className={`loose block h-[16px] w-[28px] shrink-0 border border-dashed ${light ? "border-brass" : "border-brass-light"}`}
        style={{ backgroundImage: light ? "var(--tex-hatch-brass-on-light)" : "var(--tex-hatch-brass)" }}
      />
    );
  }

  return (
    <svg viewBox="0 0 30 19" className="h-[19px] w-[30px] shrink-0" aria-hidden="true" focusable="false" fill="none">
      {kind === "line" ? (
        <>
          <path d="M3 9.5h24" stroke="currentColor" />
          <circle cx="3" cy="9.5" r="2.5" fill="currentColor" />
          <circle cx="27" cy="9.5" r="2.5" fill="currentColor" />
        </>
      ) : kind === "to-come" ? (
        <rect x="1" y="1" width="28" height="17" stroke="currentColor" strokeDasharray="3 3" opacity="0.75" />
      ) : (
        <>
          <rect x="1" y="1" width="28" height="17" style={{ fill: "var(--color-laterite)" }} />
          <path
            d={JOINTS}
            shapeRendering="crispEdges"
            strokeDasharray={kind === "approved" ? "3 2" : undefined}
            style={{ stroke: kind === "built" ? "rgb(42 26 18 / 0.7)" : "var(--color-lime)" }}
          />
          <rect x="1" y="1" width="28" height="17" stroke="currentColor" />
        </>
      )}
    </svg>
  );
}

/**
 * How the house says what state something is in: a drawn swatch and the words for each.
 * Given `open`, the screen decides whether it starts open (the client home opens it on the
 * first visit in a tab). Given `onDone`, it carries a "Got it" button, and closing it in any
 * way counts as done.
 */
export function HouseLegend({
  show,
  title = "How to read the house",
  tone = "dark",
  open: openProp,
  onDone,
}: {
  show: LegendKey[];
  title?: string;
  /** "dark" on the table, "light" on a sheet of paper. */
  tone?: "dark" | "light";
  open?: boolean;
  onDone?: () => void;
}) {
  // The server draws it open; a legend closed earlier in this page load closes on arrival.
  const remembered = useSyncExternalStore(subscribe, isOpen, () => true);
  const open = openProp ?? remembered;
  const ref = useRef<HTMLDetailsElement>(null);

  return (
    <details
      ref={ref}
      className="house-legend"
      open={open}
      onToggle={(event) => {
        const nowOpen = event.currentTarget.open;
        setOpen(nowOpen);
        if (!nowOpen) onDone?.();
      }}
    >
      <summary className="lettering inline-flex min-h-11 cursor-pointer items-center underline decoration-1 underline-offset-4">
        {title}
      </summary>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 pb-1 pt-1">
        {show.map((kind) => (
          <li key={kind} className="lettering flex items-center gap-2">
            <Swatch kind={kind} light={tone === "light"} />
            {WORDS[kind]}
          </li>
        ))}
      </ul>
      {onDone && (
        // Closing the disclosure fires its toggle, which remembers it and calls onDone.
        <button
          type="button"
          className="btn btn-quiet mt-3"
          onClick={() => {
            if (ref.current) ref.current.open = false;
          }}
        >
          Got it
        </button>
      )}
    </details>
  );
}
