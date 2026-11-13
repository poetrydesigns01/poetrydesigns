"use client";

import { useMemo, useSyncExternalStore } from "react";
import { stampNow } from "./clock";
import type { DemoAccount } from "./demo-accounts";
import { milestones, TODAY, type ChangeStatus, type DesignStatus } from "./demo-data";
import { deriveFirm, type Firm } from "./firm";
import {
  people,
  type FirmEvent,
  type NewEvent,
  type Person,
  type PersonId,
  type ProjectId,
  type StaffRole,
} from "./firm-data";
import { derive, latestVersionOf, type Projection } from "./projection";

// Demo-only state: what the viewer does is kept for the browser tab, so approving
// something on one screen shows up on the others, and every role reads the same record.
// `events` is append-only: nothing in it is ever edited or removed.

export type { FirmEvent, NewEvent };

export type DemoState = {
  designDecisions: Record<
    string,
    { status: DesignStatus; comment?: string; note?: string; decidedOn: string; at: string; version?: number }
  >;
  changeDecisions: Record<string, { status: ChangeStatus; comment?: string; note?: string; decidedOn: string; at: string }>;
  paymentApproved: boolean;
  creditsRequested: boolean;
  /** Ids of pending changes being tried on the house. Nothing here is approved. */
  trying: string[];
  /** Append-only; never edited or removed. */
  events: FirmEvent[];
  viewers: { architect: "vikram" | "ananya"; site: "suresh" | "manjunath"; finance: "prakash" | "divya" };
  lastRole: StaffRole;
  scope: Partial<Record<StaffRole, ProjectId | "all">>;
  clientProject: "iyer" | "iyer-cottage";
  focusRow: { href: string; id: string } | null;
  taught: { legend: boolean; hold: boolean };
  /** The "no signal" demo toggle on the site engineer's phone. */
  offline: boolean;
  /**
   * Who signed in on the first screen, with a demo account. It decides only whether the
   * portal opens: "See it as" and the person switch change who is viewed, not this.
   */
  session: DemoSession | null;
};

export type DemoSession = { id: string; role: DemoAccount["role"]; name: string };

const initialState: DemoState = {
  designDecisions: {},
  changeDecisions: {},
  paymentApproved: false,
  creditsRequested: false,
  trying: [],
  events: [],
  viewers: { architect: "vikram", site: "suresh", finance: "prakash" },
  lastRole: "admin",
  scope: {},
  clientProject: "iyer",
  focusRow: null,
  taught: { legend: false, hold: false },
  offline: false,
  session: null,
};

export const DEMO_STORAGE_KEY = "poetry-demo-state";

/** The milestone waiting for her approval when the demo starts; its approval is also `paymentApproved`. */
const SEED_DUE = milestones.find((m) => m.status === "awaiting-approval")?.id ?? -1;

let storageKey = DEMO_STORAGE_KEY;
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: DemoState } = { raw: null, value: initialState };

function read(): DemoState {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(storageKey);
  } catch {
    // Storage can be unavailable in private windows; fall back to memory.
    return cache.value;
  }
  if (raw !== cache.raw) {
    cache = { raw, value: raw ? { ...initialState, ...JSON.parse(raw) } : initialState };
  }
  return cache.value;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function write(next: DemoState) {
  const raw = JSON.stringify(next);
  try {
    window.sessionStorage.setItem(storageKey, raw);
  } catch {
    // See read().
  }
  cache = { raw, value: next };
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Adds one event to the record, numbered after the ones before it. */
function append(state: DemoState, event: NewEvent, at: string): DemoState {
  const full = { ...event, id: `e${state.events.length + 1}`, at } as FirmEvent;
  return { ...state, events: [...state.events, full] };
}

/** Appends a staff event and keeps the older fields that the same fact lives in. */
function applyEvent(state: DemoState, event: NewEvent, at: string): DemoState {
  const next = append(state, event, at);
  if (event.kind === "payment.approved" && event.projectId === "iyer" && event.n === SEED_DUE) next.paymentApproved = true;
  if (event.kind === "credits.requested" && event.projectId === "iyer") next.creditsRequested = true;
  return next;
}

function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, read, () => initialState);
}

export function useDemo() {
  const state = useDemoState();

  return {
    ...state,
    // ---- The client's writers. Each stamps its time and adds its event to the record. ----
    decideDesign: (id: string, status: DesignStatus, comment?: string, note?: string) => {
      const now = read();
      const at = stampNow();
      const version = latestVersionOf(id, now.events);
      write(
        append(
          {
            ...now,
            designDecisions: { ...now.designDecisions, [id]: { status, comment, note, decidedOn: TODAY, at, version } },
          },
          { kind: "design.decided", projectId: "iyer", designId: id, version, status, comment, by: "meera" },
          at,
        ),
      );
    },
    decideChange: (id: string, status: ChangeStatus, comment?: string, note?: string) => {
      const now = read();
      const at = stampNow();
      write(
        append(
          {
            ...now,
            changeDecisions: { ...now.changeDecisions, [id]: { status, comment, note, decidedOn: TODAY, at } },
            trying: now.trying.filter((tried) => tried !== id),
          },
          { kind: "change.decided", projectId: "iyer", changeId: id, status, comment, by: "meera" },
          at,
        ),
      );
    },
    /** Older screens hand a click event straight through, so only a string counts as a note. */
    approvePayment: (note?: unknown) => {
      const now = read();
      const recorded = now.events.some((e) => e.kind === "payment.approved" && e.projectId === "iyer" && e.n === SEED_DUE);
      const next = { ...now, paymentApproved: true };
      write(
        recorded
          ? next
          : append(
              next,
              {
                kind: "payment.approved",
                projectId: "iyer",
                n: SEED_DUE,
                note: typeof note === "string" && note ? note : undefined,
                by: "meera",
              },
              stampNow(),
            ),
      );
    },
    /** Older screens call this with no number; five hours is the usual ask. */
    requestCredits: (hours?: unknown) => {
      const now = read();
      write(
        append(
          { ...now, creditsRequested: true },
          { kind: "credits.requested", projectId: "iyer", hours: typeof hours === "number" ? hours : 5, by: "meera" },
          stampNow(),
        ),
      );
    },
    /** Puts a pending change on the house to see what it would do, or takes it off again. */
    setTrying: (id: string, on: boolean) => {
      const rest = read().trying.filter((tried) => tried !== id);
      write({ ...read(), trying: on ? [...rest, id] : rest });
    },
    stopTrying: () => write({ ...read(), trying: [] }),

    // ---- The staff writer ----
    /** Records one staff event: called from a handler or the pause timer, never from render. */
    record: (event: NewEvent) => write(applyEvent(read(), event, stampNow())),

    // ---- Signing in ----
    /** Opens the portal as an account: one write sets the session, who is viewed and the staff role. */
    signIn: (account: DemoAccount) => {
      const now = read();
      const { role, person } = account;
      const viewers =
        role === "architect" || role === "site" || role === "finance"
          ? ({ ...now.viewers, [role]: person } as DemoState["viewers"])
          : now.viewers;
      write({
        ...now,
        session: { id: account.id, role, name: account.name },
        viewers,
        lastRole: role === "client" ? now.lastRole : role,
      });
    },
    /** Closes the portal. Everything done in the tab is kept for the next person to sign in. */
    signOut: () => {
      if (read().session) write({ ...read(), session: null });
    },

    // ---- UI state ----
    setViewer: <R extends keyof DemoState["viewers"]>(role: R, person: DemoState["viewers"][R]) =>
      write({ ...read(), viewers: { ...read().viewers, [role]: person } }),
    setLastRole: (role: StaffRole) => {
      if (read().lastRole !== role) write({ ...read(), lastRole: role });
    },
    setScope: (role: StaffRole, id: ProjectId | "all") => write({ ...read(), scope: { ...read().scope, [role]: id } }),
    setClientProject: (id: "iyer" | "iyer-cottage") => write({ ...read(), clientProject: id }),
    setFocusRow: (row: { href: string; id: string } | null) => write({ ...read(), focusRow: row }),
    teach: (key: "legend" | "hold") => {
      if (!read().taught[key]) write({ ...read(), taught: { ...read().taught, [key]: true } });
    },
    /** Going back online sends every request saved while offline, in the order they were saved. */
    setOffline: (on: boolean) => {
      const now = read();
      let next: DemoState = { ...now, offline: on };
      if (!on) {
        const at = stampNow();
        for (const e of now.events) {
          if (e.kind !== "request.raised" || !e.queued) continue;
          if (now.events.some((x) => x.kind === "request.sent" && x.no === e.no)) continue;
          next = append(next, { kind: "request.sent", no: e.no, by: e.by }, at);
        }
      }
      write(next);
    },
  };
}

/** The whole demo state as it stands. */
export function getDemoSnapshot(): DemoState {
  return typeof window === "undefined" ? initialState : read();
}

/** Clears everything done in this tab (events, viewers, scope, lessons, the no-signal toggle and the session). */
export function resetDemo(): void {
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // See read().
  }
  cache = { raw: null, value: initialState };
  notify();
}

/** Switches where the state is kept. Only the development gallery uses it, and puts it back when hidden. */
export function setStorageKey(key: string): void {
  if (key === storageKey) return;
  storageKey = key;
  cache = { raw: null, value: initialState };
  notify();
}

// Every screen reads the same projection and firm, so each is worked out once per state.
let projected: { state: DemoState; value: Projection } | null = null;
let firmed: { state: DemoState; value: Firm } | null = null;

function projectionOf(state: DemoState): Projection {
  if (projected?.state !== state) {
    projected = { state, value: derive(state) };
  }
  return projected.value;
}

function firmOf(state: DemoState): Firm {
  if (firmed?.state !== state) {
    firmed = { state, value: deriveFirm(state, projectionOf(state)) };
  }
  return firmed.value;
}

/** Everything the client screens show, derived from what was done in this tab. */
export function useProjection(): Projection {
  const state = useDemoState();
  return useMemo(() => projectionOf(state), [state]);
}

/** Everything the staff screens show: registers, money, people and the record. */
export function useFirm(): Firm {
  const state = useDemoState();
  return useMemo(() => firmOf(state), [state]);
}

/** The person a staff role is being viewed as. BD is always Rohan and admin always Shalini. */
export function useViewer(role: StaffRole): Person {
  const state = useDemoState();
  const firm = useFirm();
  const id: PersonId =
    role === "bd" ? "rohan" : role === "admin" ? "shalini" : state.viewers[role];
  return firm.person(id) ?? people.find((p) => p.id === id) ?? people[0];
}
