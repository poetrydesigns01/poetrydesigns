"use client";

import { useSyncExternalStore } from "react";
import { changes, designs, TODAY, type ChangeStatus, type DesignStatus } from "./demo-data";

// Demo-only state: decisions the viewer makes are kept for the browser tab,
// so approving something on one screen shows up on the others.

type Decision = { status: DesignStatus; comment?: string; decidedOn: string };

type DemoState = {
  designDecisions: Record<string, Decision>;
  changeDecisions: Record<string, { status: ChangeStatus; decidedOn: string }>;
  paymentApproved: boolean;
  creditsRequested: boolean;
};

const initialState: DemoState = {
  designDecisions: {},
  changeDecisions: {},
  paymentApproved: false,
  creditsRequested: false,
};

export const DEMO_STORAGE_KEY = "poetry-demo-state";

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: DemoState } = { raw: null, value: initialState };

function read(): DemoState {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(DEMO_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private windows; fall back to memory.
    return cache.value;
  }
  if (raw !== cache.raw) {
    cache = { raw, value: raw ? { ...initialState, ...JSON.parse(raw) } : initialState };
  }
  return cache.value;
}

function write(next: DemoState) {
  const raw = JSON.stringify(next);
  try {
    window.sessionStorage.setItem(DEMO_STORAGE_KEY, raw);
  } catch {
    // See read().
  }
  cache = { raw, value: next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDemo() {
  const state = useSyncExternalStore(subscribe, read, () => initialState);

  return {
    ...state,
    decideDesign: (id: string, status: DesignStatus, comment?: string) =>
      write({ ...read(), designDecisions: { ...read().designDecisions, [id]: { status, comment, decidedOn: TODAY } } }),
    decideChange: (id: string, status: ChangeStatus) =>
      write({ ...read(), changeDecisions: { ...read().changeDecisions, [id]: { status, decidedOn: TODAY } } }),
    approvePayment: () => write({ ...read(), paymentApproved: true }),
    requestCredits: () => write({ ...read(), creditsRequested: true }),
  };
}

/** The latest version of a design, with any decision made in this tab applied. */
export function useLatestVersion(designId: string) {
  const { designDecisions } = useDemo();
  const design = designs.find((d) => d.id === designId);
  if (!design) return null;
  const latest = design.versions[design.versions.length - 1];
  const decision = designDecisions[designId];
  return decision ? { ...latest, ...decision } : latest;
}

/** All changes, with any decision made in this tab applied. */
export function useChanges() {
  const { changeDecisions } = useDemo();
  return changes.map((change) => {
    const decision = changeDecisions[change.id];
    return decision ? { ...change, ...decision } : change;
  });
}
