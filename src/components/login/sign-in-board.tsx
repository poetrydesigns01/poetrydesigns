/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import {
  memo,
  useEffect,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";
import { SealMark } from "@/components/house/house";
import type { DemoAccount } from "@/lib/demo-accounts";
import { ROLE_SENTENCE } from "./role-caption";
import { ROLES, type LoginRole } from "./site-model";

// The sign-in card: who is signing in, their ID and password, and the stamp that lands
// when the house is topped out. The fields are not controlled: every keystroke is read
// from the input itself, so typing never renders this card.

const TILE: Record<LoginRole, { short: string; long: string; name: string }> = {
  client: { short: "Homeowner", long: "Homeowner", name: "Homeowner" },
  bd: { short: "BD", long: "Business development", name: "BD, business development" },
  architect: { short: "Architect", long: "Architect", name: "Architect" },
  site: { short: "Site", long: "Site engineer", name: "Site engineer" },
  finance: { short: "Finance", long: "Finance", name: "Procurement and finance" },
  admin: { short: "Admin", long: "Admin", name: "Admin" },
};

export type BoardRefs = {
  form: RefObject<HTMLFormElement | null>;
  id: RefObject<HTMLInputElement | null>;
  password: RefObject<HTMLInputElement | null>;
  idRow: RefObject<HTMLDivElement | null>;
  passwordRow: RefObject<HTMLDivElement | null>;
  stamp: RefObject<HTMLDivElement | null>;
  /** The name on the stamp, written by hand when it lands. */
  checked: RefObject<HTMLSpanElement | null>;
};

export type BoardHandlers = {
  onRole: (role: LoginRole, pointer: string | null) => void;
  onRoleKeyDown: (event: KeyboardEvent<HTMLFieldSetElement>) => void;
  onTilePointerDown: (event: PointerEvent<HTMLLabelElement>) => void;
  onTileEnter: (role: LoginRole, event: PointerEvent<HTMLLabelElement>) => void;
  onTileLeave: () => void;
  onIdInput: () => void;
  onIdFocus: () => void;
  onPasswordInput: () => void;
  onPasswordFocus: () => void;
  onFieldBlur: () => void;
  onPasswordKey: (event: KeyboardEvent<HTMLInputElement>) => void;
  onShow: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/** "Senior architect, Project Head" reads as "Vikram Desai, senior architect, Project Head". */
export function personLine(account: DemoAccount): string {
  return `${account.name}, ${account.title.charAt(0).toLowerCase()}${account.title.slice(1)}`;
}

const noop = () => () => {};

/**
 * False on the server and until this page has hydrated. Until then the form would submit
 * itself as a plain GET, the password in the address, so the button stays disabled, and a
 * disabled default button blocks Enter as well.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export const SignInBoard = memo(function SignInBoard({
  role,
  prefixRole,
  match,
  idError,
  passwordError,
  caps,
  showPassword,
  checking,
  reachError,
  success,
  signedIn,
  refs: {
    form: formRef,
    id: idRef,
    password: passwordRef,
    idRow: idRowRef,
    passwordRow: passwordRowRef,
    stamp: stampRef,
    checked: checkedRef,
  },
  on,
}: {
  role: LoginRole | null;
  prefixRole: LoginRole | null;
  match: DemoAccount | null;
  idError: string | null;
  passwordError: string | null;
  caps: boolean;
  showPassword: boolean;
  /** The server is checking the password. */
  checking: boolean;
  /** The server could not be reached; nothing typed is wrong. */
  reachError: string | null;
  success: boolean;
  /** Set at success: who is signing in, for the button and the stamp. */
  signedIn: DemoAccount | null;
  refs: BoardRefs;
  on: BoardHandlers;
}) {
  const idStatus = idError ?? (match ? personLine(match) : "");
  const hydrated = useHydrated();

  // A value already in a field when the page hydrated (the browser restoring the form, or
  // an early autofill) fired no change React saw: read it once the page is live.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (idRef.current?.value) on.onIdInput();
      if (passwordRef.current?.value) on.onPasswordInput();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [on, idRef, passwordRef]);

  return (
    <form ref={formRef} className="login-board" noValidate onSubmit={on.onSubmit} aria-label="Sign in">
      <div className="lg-board-head">
        <h1 className="display text-32 lg-h1">Sign in</h1>
        <p className="lg-helper text-15">{ROLE_SENTENCE.none}</p>
        <div ref={stampRef} className="lg-stamp" data-kind={signedIn?.role === "client" ? "seal" : "kota"} aria-hidden="true">
          {signedIn?.role === "client" ? (
            <SealMark className="lg-seal" />
          ) : (
            <span className="display text-22 lg-kota-word">Approved</span>
          )}
          <span ref={checkedRef} className="lettering text-13 lg-checked" />
        </div>
      </div>

      <fieldset className="lg-roles" onKeyDown={on.onRoleKeyDown}>
        <legend className="sr-only">Who is signing in?</legend>
        <div className="lg-tiles">
          {ROLES.map((r) => (
            <label
              key={r}
              className="role-tile"
              data-prefix={prefixRole === r && role !== r ? "" : undefined}
              data-role={r}
              onPointerDown={on.onTilePointerDown}
              onPointerEnter={(event) => on.onTileEnter(r, event)}
              onPointerLeave={on.onTileLeave}
            >
              <input
                type="radio"
                name="role"
                value={r}
                className="sr-only"
                checked={role === r}
                aria-label={TILE[r].name}
                aria-describedby={`login-role-${r}`}
                disabled={success && role !== r}
                onChange={() => on.onRole(r, null)}
              />
              <span className="lg-tile-label">
                <span className="lg-tile-short">{TILE[r].short}</span>
                <span className="lg-tile-long">{TILE[r].long}</span>
              </span>
              <span className="lg-tile-tick" aria-hidden="true" />
              <span id={`login-role-${r}`} hidden>
                {ROLE_SENTENCE[r]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div ref={idRowRef} className="field-row lg-id-row">
        <label htmlFor="login-id" className="lg-label text-15">
          ID
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
          inputMode="text"
          placeholder="firstname.lastname"
          aria-describedby="login-id-status"
          aria-invalid={idError ? true : undefined}
          readOnly={success}
          onChange={on.onIdInput}
          onFocus={on.onIdFocus}
          onBlur={on.onFieldBlur}
        />
        <p id="login-id-status" className="lg-status text-13" data-error={idError ? "" : undefined} aria-live="polite">
          {idStatus}
        </p>
      </div>

      <div ref={passwordRowRef} className="field-row lg-password-row">
        <label htmlFor="login-password" className="lg-label text-15">
          Password
        </label>
        <div className="relative">
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
            readOnly={success}
            onChange={on.onPasswordInput}
            onFocus={on.onPasswordFocus}
            onBlur={on.onFieldBlur}
            onKeyDown={on.onPasswordKey}
            onKeyUp={on.onPasswordKey}
          />
          <button
            type="button"
            className="lg-show text-15"
            aria-controls="login-password"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={on.onShow}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <p
          id="login-password-status"
          className="lg-status text-13"
          data-error={passwordError || reachError ? "" : undefined}
          aria-live="polite"
        >
          {passwordError ?? reachError ?? (caps ? <span className="glass-chip chip-late">Caps Lock is on</span> : "")}
        </p>
      </div>

      {/* Stays enabled while the server checks, so focus is not lost; a second press waits. */}
      <button
        type="submit"
        className="btn btn-primary lg-submit"
        disabled={!hydrated}
        aria-busy={success || checking ? true : undefined}
      >
        {success && signedIn ? `Signing in as ${signedIn.name}` : checking ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
});
