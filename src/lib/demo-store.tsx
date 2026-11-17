/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useMemo } from "react";
import { projectionOf, useDemoState, type DemoState } from "./demo-core";
import { deriveFirm, type Firm } from "./firm";
import { people, type Person, type PersonId, type StaffRole } from "./firm-data";

// The tab's demo state, its writers and the projection live in demo-core.tsx, which the
// sign-in page imports on its own. This module adds the firm's registers, which only the
// portal's screens need, and passes everything else on unchanged.
export {
  DEMO_STORAGE_KEY,
  getDemoSnapshot,
  resetDemo,
  setStorageKey,
  useDemo,
  useProjection,
  useStoreReady,
  type DemoSession,
  type DemoState,
  type FirmEvent,
  type NewEvent,
} from "./demo-core";

// Every screen reads the same firm, so it is worked out once per state.
let firmed: { state: DemoState; value: Firm } | null = null;

function firmOf(state: DemoState): Firm {
  if (firmed?.state !== state) {
    firmed = { state, value: deriveFirm(state, projectionOf(state)) };
  }
  return firmed.value;
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
