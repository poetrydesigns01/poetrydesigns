/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

// The way back from a page outside the portal's own areas (a missing page, an error, the
// privacy policy): the signed-in person's first screen, or the sign-in screen when nobody
// has signed in in this tab. It reads the session without loading the demo store, so the
// pages that carry it stay light.

/** The same key as DEMO_STORAGE_KEY in lib/demo-store.tsx. */
const STATE_KEY = "poetry-demo-state";

const STAFF_ROLES = ["bd", "architect", "site", "finance", "admin"];

function homeFor(role: unknown): string {
  if (role === "client") return "/client";
  if (typeof role === "string" && STAFF_ROLES.includes(role)) return `/staff/${role}`;
  return "/";
}

function readHome(): string {
  try {
    const raw = window.sessionStorage.getItem(STATE_KEY);
    if (!raw) return "/";
    const state = JSON.parse(raw) as { session?: { role?: unknown } | null };
    return homeFor(state.session?.role);
  } catch {
    // Storage can be closed to the page, or hold something else: the sign-in screen is safe.
    return "/";
  }
}

const noSubscribe = () => () => {};

/** A link to the viewer's home: "/" on the server and until the tab's session is read. */
export function HomeLink({ className, children }: { className?: string; children: ReactNode }) {
  const href = useSyncExternalStore(noSubscribe, readHome, () => "/");
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
