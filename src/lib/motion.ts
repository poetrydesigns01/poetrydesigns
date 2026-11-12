"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MouseEvent, PointerEvent, RefObject } from "react";

// The few pieces of motion that CSS cannot do alone. Everything else is transitions
// and keyframes in globals.css, driven by state.

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(listener: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

/** For code outside render: event handlers, timers and frames. */
function reducedNow(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_QUERY).matches;
}

/** True when the person has asked their device for less motion. False on the server. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, reducedNow, () => false);
}

// Keys of the once-per-load moments that have already played. The set lives for the page
// load and is only added to from done(), which runs on the client, never during render.
const seen = new Set<string>();

/**
 * For a moment that plays once per page load. `play` is true only the first time the key
 * is used. Call `done` when the animation ends or is skipped.
 */
export function useOnce(key: string): [play: boolean, done: () => void] {
  const [play, setPlay] = useState(() => !seen.has(key));
  const done = useCallback(() => {
    seen.add(key);
    setPlay(false);
  }, [key]);
  return [play, done];
}

/** A click that came from the keyboard (Enter or Space) and not from a pointer. */
export function isKeyboardClick(event: { detail: number }): boolean {
  return event.detail === 0;
}

/** A short buzz where the device can. Never the only confirmation of anything. */
export function vibrate(ms: number): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function" || reducedNow()) return;
  // Browsers block a buzz, and log it, until the page has been touched once.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate(ms);
  } catch {
    // Some browsers refuse without a recent tap; nothing depends on it.
  }
}

/**
 * Lets an element travel from where it was to where it is now. Measure `first` in the
 * click handler, before the change, and call this once the element is in its new place.
 */
export function moveFrom(el: HTMLElement, first: DOMRect, ms = 180): void {
  if (reducedNow() || typeof el.animate !== "function") return;
  const last = el.getBoundingClientRect();
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  if (dx === 0 && dy === 0) return;
  el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
    duration: ms,
    easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
  });
}

export type HoldPhase = "idle" | "holding" | "rewinding";

export type HoldOptions = {
  /** How long the hold takes once it has started, in ms. Default 900. */
  duration?: number;
  /** A release before this many ms is a tap. Default 200. */
  delay?: number;
  /** Switches the hold off, so every press is a tap: under reduced motion, or when already approved. */
  disabled?: boolean;
  /** Element that receives --hold and data-holding, as well as the pressed control itself. */
  scopeRef?: RefObject<HTMLElement | null>;
  /** Written as data-holding="<target>". */
  target?: string;
  /** A short press, or keyboard activation. */
  onTap: () => void;
  /** Held to the end. */
  onComplete: () => void;
};

export type HoldBind = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  onClick: (event: MouseEvent<HTMLElement>) => void;
};

const REWIND_MS = 200;
// The most one frame may add to a hold. If frames stall, the hold waits; it never jumps to the end.
const MAX_FRAME_MS = 100;
// A click that arrives this soon after a hold was let go belongs to that hold, not to a tap.
const CLICK_AFTER_HOLD_MS = 500;

type HoldState = {
  stage: "idle" | "pressed" | "holding" | "rewinding";
  timer: number | null;
  frame: number | null;
  /** The pressed control and, when there is one, the scope. */
  targets: HTMLElement[];
  progress: number;
  /** The hold ran to the end and the finger is still down. */
  completed: boolean;
  holdEndedAt: number;
  /** Stops listening for a press that is taken away without a release reaching the control. */
  unlisten: (() => void) | null;
};

function paintHold(hold: HoldState, value: number) {
  hold.progress = value;
  for (const el of hold.targets) el.style.setProperty("--hold", value.toFixed(3));
}

/** Stops the timer and the frame and takes --hold and data-holding off again. */
function clearHold(hold: HoldState) {
  if (hold.timer !== null) window.clearTimeout(hold.timer);
  if (hold.frame !== null) window.cancelAnimationFrame(hold.frame);
  hold.unlisten?.();
  hold.unlisten = null;
  for (const el of hold.targets) {
    el.style.removeProperty("--hold");
    el.removeAttribute("data-holding");
  }
  hold.timer = null;
  hold.frame = null;
  hold.targets = [];
  hold.progress = 0;
  hold.stage = "idle";
}

/**
 * Press and hold. After `delay` the hold starts and --hold runs from 0 to 1 over `duration`
 * on the pressed control and on the scope, so CSS can follow the finger. Letting go early
 * runs it back to 0 and records nothing. A short press, Enter or Space is a tap.
 */
export function useHold(options: HoldOptions): { phase: HoldPhase; bind: HoldBind } {
  const [phase, setPhase] = useState<HoldPhase>("idle");
  const latest = useRef(options);
  const state = useRef<HoldState>({
    stage: "idle",
    timer: null,
    frame: null,
    targets: [],
    progress: 0,
    completed: false,
    holdEndedAt: -Infinity,
    unlisten: null,
  });

  useLayoutEffect(() => {
    latest.current = options;
  });

  // When the route is hidden or the control goes away, stop and leave nothing half done.
  useLayoutEffect(() => {
    const hold = state.current;
    return () => {
      clearHold(hold);
      hold.completed = false;
      setPhase("idle");
    };
  }, []);

  // Everything below runs from event handlers, timers and frames, never during render.
  const startHold = () => {
    const hold = state.current;
    const { duration = 900, target = "" } = latest.current;
    hold.timer = null;
    hold.stage = "holding";
    for (const el of hold.targets) el.setAttribute("data-holding", target);
    paintHold(hold, 0);
    setPhase("holding");
    let last: number | null = null;
    let elapsed = 0;
    const step = (now: number) => {
      if (last !== null) elapsed += Math.min(Math.max(0, now - last), MAX_FRAME_MS);
      last = now;
      const value = Math.min(1, elapsed / duration);
      paintHold(hold, value);
      if (value < 1) {
        hold.frame = window.requestAnimationFrame(step);
        return;
      }
      hold.frame = null;
      hold.completed = true;
      vibrate(12);
      try {
        latest.current.onComplete();
      } finally {
        clearHold(hold);
        setPhase("idle");
      }
    };
    hold.frame = window.requestAnimationFrame(step);
  };

  const rewind = () => {
    const hold = state.current;
    if (hold.frame !== null) window.cancelAnimationFrame(hold.frame);
    hold.stage = "rewinding";
    setPhase("rewinding");
    const from = hold.progress;
    let startedAt: number | null = null;
    const step = (now: number) => {
      startedAt ??= now;
      const value = from * (1 - Math.min(1, (now - startedAt) / REWIND_MS));
      paintHold(hold, value);
      if (value > 0) {
        hold.frame = window.requestAnimationFrame(step);
        return;
      }
      hold.frame = null;
      clearHold(hold);
      setPhase("idle");
    };
    hold.frame = window.requestAnimationFrame(step);
  };

  /** The finger came off, or the press was taken away. */
  const release = (event: { timeStamp: number }) => {
    const hold = state.current;
    if (hold.completed) {
      // The hold already ran to the end; only the click that follows is left to swallow.
      hold.completed = false;
      hold.holdEndedAt = event.timeStamp;
    } else if (hold.stage === "pressed") {
      // Let go before the hold began: the click that follows is the tap.
      clearHold(hold);
    } else if (hold.stage === "holding") {
      hold.holdEndedAt = event.timeStamp;
      rewind();
    }
  };

  const bind: HoldBind = {
    onPointerDown: (event) => {
      if (latest.current.disabled || !event.isPrimary || event.button !== 0) return;
      const hold = state.current;
      // A new press always wins over a rewind that is still running.
      clearHold(hold);
      setPhase("idle");
      hold.completed = false;
      const control = event.currentTarget;
      const scope = latest.current.scopeRef?.current;
      hold.targets = scope && scope !== control ? [control, scope] : [control];
      try {
        control.setPointerCapture(event.pointerId);
      } catch {
        // Without capture the hold still works while the pointer stays on the control.
      }
      // If the release never reaches the control (the window loses focus with the button
      // down, or capture is lost), the hold ends there. It must never finish on its own.
      control.addEventListener("lostpointercapture", release);
      window.addEventListener("blur", release);
      hold.unlisten = () => {
        control.removeEventListener("lostpointercapture", release);
        window.removeEventListener("blur", release);
      };
      hold.stage = "pressed";
      hold.timer = window.setTimeout(startHold, latest.current.delay ?? 200);
    },
    onPointerUp: release,
    onPointerLeave: release,
    onPointerCancel: release,
    onContextMenu: (event) => {
      // A long press on a phone must not open the menu half way through a hold.
      event.preventDefault();
    },
    onClick: (event) => {
      const hold = state.current;
      if (event.timeStamp - hold.holdEndedAt < CLICK_AFTER_HOLD_MS) {
        hold.holdEndedAt = -Infinity;
        return;
      }
      latest.current.onTap();
    },
  };

  return { phase, bind };
}
