"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Long enough for the sheets inside to wake and take up what the tab remembers. */
const SETTLE_MS = 900;

/**
 * The server always draws the starting state. When the tab already holds decisions, the
 * page takes them up as it wakes, and without this every seal would press in and every
 * tried piece would be lowered again, for no action of hers. For the first moment after
 * a page load transitions are off (see [data-settling] in globals.css), so the remembered
 * state is simply there. The wrapper has no box of its own.
 */
export function Settle({ children }: { children: ReactNode }) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="contents" data-settling={settled ? undefined : ""}>
      {children}
    </div>
  );
}
