/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { SignInReply } from "@/lib/demo-accounts";
import { checkDemoPassword } from "@/lib/server/demo-passwords";
import { callerOf, takeSignInTurn } from "@/lib/server/sign-in-limit";

// POST /api/sign-in checks a demo ID and password on the server, so the passwords never
// reach the browser. It answers which account the pair signs in to, or that it does not
// match. It keeps nothing, logs nothing and sets no cookie: the tab keeps the session.
// One address gets a limited number of checks a minute; past that it is told to wait (429).

/** An ID and a password fit in far less; anything longer is not a sign-in. */
const MAX_BODY = 1024;
const MAX_FIELD = 254;

function reply(status: number, body: SignInReply, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function malformed(): Response {
  return reply(400, { ok: false, error: "Send an ID and a password, as JSON." });
}

export async function POST(request: Request): Promise<Response> {
  // Counted before anything else, so a flood of bad requests is turned away cheaply too.
  const wait = takeSignInTurn(callerOf(request));
  if (wait > 0) {
    return reply(
      429,
      { ok: false, error: "Too many tries. Wait a minute and try again." },
      { "Retry-After": String(wait) },
    );
  }

  // JSON only: a page on another site cannot send JSON here without asking first.
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(type)) return malformed();
  if (Number(request.headers.get("content-length")) > MAX_BODY) return malformed();

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return malformed();
    body = JSON.parse(text);
  } catch {
    return malformed();
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return malformed();
  const { id, password } = body as { id?: unknown; password?: unknown };
  if (typeof id !== "string" || typeof password !== "string") return malformed();
  if (id.length > MAX_FIELD || password.length > MAX_FIELD) return malformed();

  const accountId = await checkDemoPassword(id, password);
  if (!accountId) {
    // The same answer for an ID that is no account and for a wrong password.
    return reply(401, { ok: false, error: "That ID and password do not match." });
  }
  return reply(200, { ok: true, accountId });
}
