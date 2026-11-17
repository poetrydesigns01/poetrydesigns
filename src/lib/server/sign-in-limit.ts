/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import "server-only";

// How often one address may ask to sign in. Each check runs a deliberately slow key
// derivation, so a script that hammers the endpoint costs CPU and memory and guesses without
// end. This counts per server instance and is a first line only: the host's firewall should
// carry the same rule, and the real back end keeps it.

/** Sign-in checks allowed from one address in one window. A person never needs this many. */
const LIMIT = 20;
const WINDOW_MS = 60_000;
/** Past this many addresses, the expired ones are swept before a new one is counted. */
const SWEEP_AT = 5_000;

const windows = new Map<string, { start: number; count: number }>();

/** The caller's address as the host reports it; one shared bucket when there is none. */
export function callerOf(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Counts one sign-in check from `caller`. Returns 0 when it may go ahead, else how many
 * seconds remain until it may try again.
 */
export function takeSignInTurn(caller: string): number {
  const now = performance.now();
  if (windows.size >= SWEEP_AT && !windows.has(caller)) {
    for (const [key, entry] of windows) {
      if (now - entry.start >= WINDOW_MS) windows.delete(key);
    }
    // Still full: the oldest address makes room, so memory stays bounded.
    const oldest = windows.keys().next();
    if (windows.size >= SWEEP_AT && !oldest.done) windows.delete(oldest.value);
  }
  const current = windows.get(caller);
  if (!current || now - current.start >= WINDOW_MS) {
    windows.set(caller, { start: now, count: 1 });
    return 0;
  }
  if (current.count >= LIMIT) return Math.max(1, Math.ceil((current.start + WINDOW_MS - now) / 1000));
  current.count += 1;
  return 0;
}
