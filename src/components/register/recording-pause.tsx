"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isKeyboardClick } from "@/lib/motion";

// Nothing is written to the record at once. A commit waits five seconds in a pause bar
// ("Recording in 5 seconds. Cancel"), then runs: one synchronous store write. Cancel writes
// nothing. Only one pause runs at a time: starting another commits the first at once. A
// pause whose screen is hidden, or whose provider goes away, also commits at once, because
// the person already confirmed it. There is no undo after recording.

const PAUSE_MS = 5000;
/** How long a newly pressed stamp keeps its press, so a route shown again does not replay it. */
const FRESH_MS = 400;

type Verb = "Recording" | "Sending";

export type PauseStart = {
  verb?: Verb;
  /** What is being recorded, for the screen reader: "Your request MR-2026-0142". */
  what: string;
  commit: () => void;
  /** The control that started it; focus goes back to it on Cancel. */
  origin?: HTMLElement | null;
};

export type Pending = {
  verb: Verb;
  what: string;
  /** The register row the pause was started from, if any. */
  rowId: string | null;
  /** Counts the pauses started, so a second pause draws a fresh countdown line. */
  seq: number;
};

type Running = Pending & {
  commit: () => void;
  origin: HTMLElement | null;
  owner: string;
  timer: number;
  keyboard: boolean;
};

type Fresh = { rowId: string | null; keyboard: boolean } | null;

type PauseApi = {
  pending: Pending | null;
  /** The row whose stamp was just pressed, for 400 ms; null otherwise. */
  fresh: Fresh;
  start: (p: PauseStart, owner: string) => void;
  cancel: () => void;
  /** Commits the running pause at once, if it belongs to `owner` (or to anyone, with no owner). */
  flush: (owner?: string) => void;
  /** Called by a register row as a click passes through it, before the button's own handler. */
  markRow: (rowId: string, keyboard: boolean, target: HTMLElement | null) => void;
};

const PauseContext = createContext<PauseApi | null>(null);

/**
 * Runs `callback` when this component is hidden (its route is kept but not shown) or goes
 * away. Hidden routes stay mounted, so this is where a timer or a half-done thing is settled.
 * It is a bare layout-effect cleanup, so in development it also runs once straight after
 * mount (StrictMode connects, disconnects and connects again): keep callbacks idempotent and
 * safe to run then, and never let one undo a choice the person just made.
 */
export function useOnHidden(callback: () => void): void {
  const latest = useRef(callback);
  useLayoutEffect(() => {
    latest.current = callback;
  });
  useLayoutEffect(() => {
    return () => latest.current();
  }, []);
}

export function PauseProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [fresh, setFresh] = useState<Fresh>(null);
  const running = useRef<Running | null>(null);
  const freshTimer = useRef<number | null>(null);
  const seq = useRef(0);
  // The row a click is passing through. It lives for one event only.
  const lastRow = useRef<{ rowId: string; keyboard: boolean; target: HTMLElement | null } | null>(null);

  const commitRunning = useCallback(() => {
    const run = running.current;
    if (!run) return;
    running.current = null;
    window.clearTimeout(run.timer);
    setPending(null);
    try {
      run.commit();
    } finally {
      if (freshTimer.current !== null) window.clearTimeout(freshTimer.current);
      setFresh({ rowId: run.rowId, keyboard: run.keyboard });
      freshTimer.current = window.setTimeout(() => {
        freshTimer.current = null;
        setFresh(null);
      }, FRESH_MS);
    }
  }, []);

  const api = useMemo<PauseApi>(
    () => ({
      pending,
      fresh,
      start: (p, owner) => {
        // One pause at a time: the one already running is recorded now.
        commitRunning();
        const row = lastRow.current;
        lastRow.current = null;
        seq.current += 1;
        const next: Running = {
          verb: p.verb ?? "Recording",
          what: p.what,
          rowId: row?.rowId ?? null,
          seq: seq.current,
          commit: p.commit,
          origin: p.origin ?? row?.target ?? null,
          owner,
          keyboard: row?.keyboard ?? false,
          timer: window.setTimeout(commitRunning, PAUSE_MS),
        };
        running.current = next;
        setPending({ verb: next.verb, what: next.what, rowId: next.rowId, seq: next.seq });
      },
      cancel: () => {
        const run = running.current;
        if (!run) return;
        running.current = null;
        window.clearTimeout(run.timer);
        setPending(null);
        // After the bar has gone and the control is drawn again: a control that was set
        // aside while the pause ran takes focus only once it is back.
        const origin = run.origin;
        window.setTimeout(() => {
          if (origin?.isConnected) origin.focus();
        }, 0);
      },
      flush: (owner) => {
        if (running.current && (owner === undefined || running.current.owner === owner)) commitRunning();
      },
      markRow: (rowId, keyboard, target) => {
        lastRow.current = { rowId, keyboard, target };
        // A task, not a microtask: a real click runs microtasks between its capture and
        // bubble listeners, and the row must still be known when the button's handler runs.
        window.setTimeout(() => {
          if (lastRow.current?.rowId === rowId) lastRow.current = null;
        }, 0);
      },
    }),
    [pending, fresh, commitRunning],
  );

  // Escape cancels, wherever the focus is.
  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") api.cancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, api]);

  // The provider itself hidden or gone: whatever is running was confirmed, so record it.
  // Nothing is left marked fresh, so the stamp does not press again when the screen returns.
  useOnHidden(() => {
    commitRunning();
    if (freshTimer.current !== null) window.clearTimeout(freshTimer.current);
    freshTimer.current = null;
    setFresh(null);
  });

  return <PauseContext value={api}>{children}</PauseContext>;
}

/** Used when a screen has no provider: the commit is made at once. Only the gallery does this. */
function noProvider(): PauseApi {
  return {
    pending: null,
    fresh: null,
    start: (p) => p.commit(),
    cancel: () => {},
    flush: () => {},
    markRow: () => {},
  };
}

const FALLBACK = noProvider();

/**
 * Starts and cancels the pause. Call `start` from a click or submit handler, never from an
 * effect. A pause started here and still running when this component is hidden commits at once.
 */
export function usePause(): {
  /** The pause running on this page, whoever started it. `rowId` is the row it came from. */
  pending: Pending | null;
  start(p: PauseStart): void;
  cancel(): void;
} {
  const api = useContext(PauseContext) ?? FALLBACK;
  const owner = useId();
  useOnHidden(() => api.flush(owner));
  return {
    pending: api.pending,
    start: (p) => api.start(p, owner),
    cancel: api.cancel,
  };
}

/** For register rows: whether a pause or a fresh stamp belongs to this row. */
export function useRowPause(rowId: string): {
  pending: Pending | null;
  fresh: boolean;
  onClickCapture: (event: { detail: number; target: EventTarget | null }) => void;
  cancel: () => void;
} {
  const api = useContext(PauseContext) ?? FALLBACK;
  return {
    pending: api.pending?.rowId === rowId ? api.pending : null,
    fresh: api.fresh?.rowId === rowId && !api.fresh.keyboard,
    onClickCapture: (event) =>
      api.markRow(rowId, isKeyboardClick(event), event.target instanceof HTMLElement ? event.target : null),
    cancel: api.cancel,
  };
}

function words(p: Pending): string {
  return `${p.verb} in 5 seconds.`;
}

function Bar({ p, onCancel, spoken }: { p: Pending; onCancel?: () => void; spoken: boolean }) {
  return (
    <div className="pause-bar">
      <p aria-hidden={spoken ? undefined : true}>
        {words(p)}
        {spoken && <span className="sr-only"> {p.what}.</span>}
      </p>
      {onCancel && (
        <button type="button" className="btn btn-quiet pause-cancel min-h-11 shrink-0 px-4" onClick={onCancel}>
          Cancel
        </button>
      )}
      <span className="pause-line" aria-hidden="true" />
    </div>
  );
}

/**
 * The bar along the bottom of the screen: above the tab bar on a phone. Rendered once by the
 * staff shell and once by the client layout. Its status line is always there, so the words
 * are announced when a pause starts.
 */
export function PauseBar() {
  const api = useContext(PauseContext) ?? FALLBACK;
  const p = api.pending;
  return (
    <div className="pause-dock no-print" data-inline={p?.rowId ? "" : undefined} role="status">
      {p && <Bar key={p.seq} p={p} spoken onCancel={api.cancel} />}
    </div>
  );
}

/** The same bar under a register row, from 1024 px. The dock keeps the spoken words. */
export function RowPauseBar({ rowId }: { rowId: string }) {
  const { pending, cancel } = useRowPause(rowId);
  if (!pending) return null;
  return (
    <div className="pause-inline">
      <Bar key={pending.seq} p={pending} spoken={false} onCancel={cancel} />
    </div>
  );
}
