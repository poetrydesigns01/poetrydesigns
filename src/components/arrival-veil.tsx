"use client";

import { useLayoutEffect, useRef } from "react";

// Signing in ends in a wall of lime light from the house's front door. The screen it opens
// on starts under the same light, which then fades off it, so the light becomes the screen
// instead of cutting to it. The sign-in page leaves a one-time mark in the tab; nothing else
// shows this.

/** Set by the sign-in page just before it opens a person's screen; read once, then removed. */
export const ARRIVED_KEY = "poetry-arrived";

export function ArrivalVeil() {
  const ref = useRef<HTMLDivElement>(null);

  // Before the first paint, so the screen is never seen without the light over it.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let arrived = false;
    try {
      arrived = window.sessionStorage.getItem(ARRIVED_KEY) === "1";
      window.sessionStorage.removeItem(ARRIVED_KEY);
    } catch {
      return;
    }
    if (!arrived) return;
    el.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 260,
      easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
    });
  }, []);

  return <div ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] bg-lime opacity-0" />;
}
