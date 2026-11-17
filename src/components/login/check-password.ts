/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { SignInReply } from "@/lib/demo-accounts";

// The card knows who can sign in, but not their passwords: the server checks those.

export type PasswordCheck =
  | { kind: "right"; accountId: string }
  | { kind: "wrong" }
  | { kind: "busy" }
  | { kind: "unreachable" };

/** How long the card waits for an answer before it says the server could not be reached. */
export const CHECK_PATIENCE_MS = 10_000;

/** Asks the server whether an ID and password match. Never throws. */
export async function checkPassword(id: string, password: string, signal: AbortSignal): Promise<PasswordCheck> {
  try {
    const response = await fetch("/api/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, password }),
      cache: "no-store",
      signal,
    });
    if (response.status === 401) return { kind: "wrong" };
    // Too many checks from this address in a minute: nothing was checked.
    if (response.status === 429) return { kind: "busy" };
    if (!response.ok) return { kind: "unreachable" };
    const reply = (await response.json()) as SignInReply;
    return reply.ok && typeof reply.accountId === "string"
      ? { kind: "right", accountId: reply.accountId }
      : { kind: "unreachable" };
  } catch {
    // Offline, blocked, timed out or cut off: nothing came back that can be read.
    return { kind: "unreachable" };
  }
}
