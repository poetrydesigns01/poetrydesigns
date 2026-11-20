/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { PoetryMark } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out";
import { ID_DOMAIN, accountForId, type DemoAccount } from "@/lib/demo-accounts";
import { useDemo } from "@/lib/demo-core";
import { CHECK_PATIENCE_MS, checkPassword } from "./check-password";
import "./login.css";

// The first screen: the firm's logo and one centred card with an ID (or work email) and a
// password. The password is checked on the server; the account decides where it opens.

const noop = () => () => {};

/** False on the server and while hydrating; true once the page is live. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

function cut(text: string): string {
  return text.length > 32 ? `${text.slice(0, 31)}…` : text;
}

/**
 * The router keeps a page it leaves and can show it again on the way back. Once someone has
 * signed in, the screen is swapped for a fresh one, so signing out never returns to a card
 * that still says "Signing in".
 */
export function Login() {
  const [visit, setVisit] = useState(0);
  return <LoginScreen key={visit} onLeft={() => setVisit((n) => n + 1)} />;
}

function LoginScreen({ onLeft }: { onLeft: () => void }) {
  const router = useRouter();
  const demo = useDemo();
  const hydrated = useHydrated();

  const idRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [idError, setIdError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [reachError, setReachError] = useState<string | null>(null);
  const [caps, setCaps] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [signedIn, setSignedIn] = useState<DemoAccount | null>(null);

  const live = useRef({
    misses: new Map<string, number>(),
    check: null as AbortController | null,
    patience: 0,
    pushed: false,
  });

  const leftRef = useRef(onLeft);
  useEffect(() => {
    leftRef.current = onLeft;
  });
  useEffect(() => {
    const state = live.current;
    return () => {
      window.clearTimeout(state.patience);
      // An answer that arrives after the screen has gone is not acted on.
      state.check?.abort();
      state.check = null;
      if (state.pushed) leftRef.current();
    };
  }, []);

  /** Sets a message so a screen reader reads it again even when it has not changed. */
  const announce = (set: (value: string | null) => void, message: string) => {
    set(null);
    window.requestAnimationFrame(() => set(message));
  };

  const shake = (el: HTMLElement | null) => {
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [
        { transform: "translateX(0px)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(0px)" },
      ],
      { duration: 280, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
    );
  };

  const succeed = (account: DemoAccount) => {
    demo.signIn(account);
    setSignedIn(account);
    setIdError(null);
    setPasswordError(null);
    live.current.pushed = true;
    router.push(account.home);
  };

  const wrongPassword = (account: DemoAccount) => {
    const misses = (live.current.misses.get(account.id) ?? 0) + 1;
    live.current.misses.set(account.id, misses);
    const stuck =
      account.role === "admin" ? "Still wrong. Check Caps Lock." : "Still wrong. Ask Shalini Murthy to reset it.";
    announce(setPasswordError, misses >= 3 ? stuck : `Wrong password. It is case-sensitive.${caps ? " Caps Lock is on." : ""}`);
    passwordRef.current?.focus();
    passwordRef.current?.select();
    shake(passwordRef.current?.parentElement ?? null);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const state = live.current;
    // One check at a time: pressing again while the server answers does nothing.
    if (signedIn || state.check) return;
    const id = idRef.current?.value ?? "";
    const password = passwordRef.current?.value ?? "";
    const trimmed = id.trim();

    if (!trimmed) {
      announce(setIdError, "Enter your ID or work email.");
      idRef.current?.focus();
      return;
    }
    const account = accountForId(id);
    if (!account) {
      const lower = trimmed.toLowerCase();
      announce(
        setIdError,
        lower.includes("@") && !lower.endsWith(ID_DOMAIN)
          ? `Use your ${ID_DOMAIN} email or your ID.`
          : `No account “${cut(trimmed)}”. Check the spelling.`,
      );
      idRef.current?.focus();
      idRef.current?.select();
      shake(idRef.current);
      return;
    }
    if (!password) {
      announce(setPasswordError, "Enter your password.");
      passwordRef.current?.focus();
      return;
    }

    const controller = new AbortController();
    state.check = controller;
    setChecking(true);
    setReachError(null);
    state.patience = window.setTimeout(() => controller.abort(), CHECK_PATIENCE_MS);
    void checkPassword(id, password, controller.signal).then((answer) => {
      window.clearTimeout(state.patience);
      if (state.check !== controller) return;
      state.check = null;
      setChecking(false);
      // Typed over while the server answered: the answer is for words no longer there.
      if (idRef.current?.value !== id || passwordRef.current?.value !== password) return;
      const opens = answer.kind === "right" ? accountForId(answer.accountId) : undefined;
      if (opens) succeed(opens);
      else if (answer.kind === "wrong") wrongPassword(account);
      else if (answer.kind === "busy") announce(setReachError, "Too many tries. Wait a minute and try again.");
      else announce(setReachError, "Could not reach the server. Try again.");
    });
  };

  const onPasswordKey = (event: KeyboardEvent<HTMLInputElement>) => {
    const on = event.getModifierState("CapsLock");
    if (on !== caps) setCaps(on);
  };

  // Someone already signed in in this tab who came back here: say so, and offer the way back.
  const already = hydrated && demo.session && !signedIn ? (accountForId(demo.session.id) ?? null) : null;
  const busy = checking || signedIn !== null;

  return (
    <main className="login glass-world">
      <div className="lg-grid" aria-hidden="true" />

      <div className="lg-column">
        <header className="lg-lockup">
          <PoetryMark className="lg-mark" />
          <p className="lg-name">
            <span className="lg-name-main">Poetry</span>
            <span className="lg-name-sub">Designs</span>
          </p>
        </header>

        <section className="lg-card glass-strong" aria-labelledby="login-title">
          <div className="lg-card-head">
            <h1 id="login-title" className="display text-32 lg-title">
              Sign in
            </h1>
            <p className="text-15 lg-helper">From concept to reality, one place for your home.</p>
          </div>

          {already && (
            <div className="lg-session glass-inner text-15">
              <p>Signed in as {already.name}.</p>
              <p className="lg-session-actions">
                <Link href={already.home} className="link font-semibold">
                  Open your screen
                </Link>
                <SignOutButton className="link" onDone={() => idRef.current?.focus({ preventScroll: true })} />
              </p>
            </div>
          )}

          <form className="lg-form" noValidate onSubmit={onSubmit} aria-label="Sign in">
            <div className="lg-field">
              <label htmlFor="login-id" className="lg-label text-15">
                Email or ID
              </label>
              <input
                ref={idRef}
                id="login-id"
                name="username"
                type="text"
                className="glass-field lg-input"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="firstname.lastname"
                aria-describedby="login-id-status"
                aria-invalid={idError ? true : undefined}
                readOnly={signedIn !== null}
                onChange={() => {
                  if (idError) setIdError(null);
                  if (reachError) setReachError(null);
                }}
              />
              <p id="login-id-status" className="lg-status text-13" aria-live="polite">
                {idError}
              </p>
            </div>

            <div className="lg-field">
              <label htmlFor="login-password" className="lg-label text-15">
                Password
              </label>
              <div className="lg-password">
                <input
                  ref={passwordRef}
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="glass-field lg-input lg-input-password"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-describedby="login-password-status"
                  aria-invalid={passwordError ? true : undefined}
                  readOnly={signedIn !== null}
                  onChange={() => {
                    if (passwordError) setPasswordError(null);
                    if (reachError) setReachError(null);
                  }}
                  onKeyDown={onPasswordKey}
                  onKeyUp={onPasswordKey}
                />
                <button
                  type="button"
                  className="lg-show text-13"
                  aria-controls="login-password"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p id="login-password-status" className="lg-status text-13" aria-live="polite">
                {passwordError ?? reachError ?? (caps ? "Caps Lock is on." : null)}
              </p>
            </div>

            {/* Disabled until the page is live, so the form never sends itself as a plain GET. */}
            <button type="submit" className="btn btn-primary lg-submit" disabled={!hydrated} aria-busy={busy || undefined}>
              {signedIn ? `Opening ${signedIn.name.split(" ")[0]}'s screen…` : checking ? "Checking…" : "Sign in"}
            </button>
          </form>
        </section>

        <p className="lg-foot text-13">
          <Link href="/follow" className="lg-foot-link">
            Follow one payment from site to bank
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" className="lg-foot-link">
            Privacy
          </Link>
        </p>
      </div>
    </main>
  );
}
