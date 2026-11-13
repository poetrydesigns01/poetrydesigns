"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ARRIVED_KEY } from "@/components/arrival-veil";
import { SignOutButton } from "@/components/sign-out";
import { ACCOUNTS, accountForId, findAccount, type DemoAccount } from "@/lib/demo-accounts";
import { useDemo } from "@/lib/demo-store";
import { usePrefersReducedMotion } from "@/lib/motion";
import { RoleCaption } from "./role-caption";
import { SignInBoard, type BoardHandlers, type BoardRefs } from "./sign-in-board";
import { SiteStage, type StageHandle, type StagePhase } from "./site-stage";
import { blocksFor, type LoginRole } from "./site-model";
import { EASE, Timers, reducedNow } from "./timing";
import "./login.css";

// The first screen: sign in on the site board, beside a laterite house going up at dusk.
// Every character typed lays a block; a wrong password knocks the top ones off; the right
// one tops the house out, and its front door opens on the person's own screen.

const DOMAIN = "@poetrydesigns.in";

/** The one account an ID of three or more characters can still become, if only one. */
function uniquePrefix(raw: string): DemoAccount | null {
  let key = raw.trim().toLowerCase();
  if (key.endsWith(DOMAIN)) key = key.slice(0, -DOMAIN.length);
  if (key.length < 3) return null;
  const found = ACCOUNTS.filter((a) => a.id.startsWith(key));
  return found.length === 1 ? found[0] : null;
}

function cut(text: string): string {
  return text.length > 32 ? `${text.slice(0, 31)}…` : text;
}

const noop = () => () => {};

/** False on the server and while hydrating; true once the tab's own state can be read. */
function useOnClient(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

const ROLE_TAG: Record<LoginRole, string> = {
  client: "Homeowner",
  bd: "Business development",
  architect: "Architect",
  site: "Site engineer",
  finance: "Finance",
  admin: "Admin",
};

/**
 * The router keeps a page it leaves in the document, hidden, and shows it again on the way
 * back. Once someone has signed in, the screen they leave is swapped for a fresh one, so
 * signing out never comes back to a topped-out house behind a wall of light.
 */
export function Login() {
  const [visit, setVisit] = useState(0);
  return <LoginScreen key={visit} onLeft={() => setVisit((n) => n + 1)} />;
}

function LoginScreen({ onLeft }: { onLeft: () => void }) {
  const router = useRouter();
  const demo = useDemo();
  const reduced = usePrefersReducedMotion();

  const onClient = useOnClient();

  const stage = useRef<StageHandle>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const idRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const idRowRef = useRef<HTMLDivElement>(null);
  const passwordRowRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const checkedRef = useRef<HTMLSpanElement>(null);
  // One set of refs for the life of the screen, so the board is not rendered for nothing.
  const refs = useMemo<BoardRefs>(
    () => ({
      form: formRef,
      id: idRef,
      password: passwordRef,
      idRow: idRowRef,
      passwordRow: passwordRowRef,
      stamp: stampRef,
      checked: checkedRef,
    }),
    [],
  );

  const [role, setRole] = useState<LoginRole | null>(null);
  const [preview, setPreview] = useState<LoginRole | null>(null);
  const [match, setMatch] = useState<DemoAccount | null>(null);
  const [prefixRole, setPrefixRole] = useState<LoginRole | null>(null);
  const [phase, setPhase] = useState<StagePhase>("idle");
  const [idError, setIdError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [caps, setCaps] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [revision, setRevision] = useState(0);
  const [signedIn, setSignedIn] = useState<DemoAccount | null>(null);
  const [slowPush, setSlowPush] = useState(false);

  // What handlers and timers share between renders. Nothing here is drawn.
  const live = useRef({
    pointer: null as string | null,
    pointerAt: -Infinity,
    hover: 0,
    misses: new Map<string, number>(),
    timers: new Timers(),
    pushed: false,
    unskip: null as (() => void) | null,
  });

  // The crane starts delivering on its own once the page is up; leaving clears everything.
  const leftRef = useRef(onLeft);
  useEffect(() => {
    leftRef.current = onLeft;
  });
  useEffect(() => {
    const state = live.current;
    stage.current?.setAmbient(true);
    return () => {
      state.timers.clear();
      window.clearTimeout(state.hover);
      state.unskip?.();
      if (state.pushed) leftRef.current();
    };
  }, []);

  // ---- Small helpers, all for handlers and timers ----
  const values = () => ({ id: refs.id.current?.value ?? "", password: refs.password.current?.value ?? "" });

  const syncTyped = () => {
    const v = values();
    stage.current?.setTyped(blocksFor(v.id.length, v.password.length));
    const active = typeof document !== "undefined" ? document.activeElement : null;
    const focused = active === refs.id.current || active === refs.password.current;
    stage.current?.setAmbient(v.id === "" && v.password === "" && !focused);
  };

  /** Sets a status message so that it is read out again even when it has not changed. */
  const announce = (set: (value: string | null) => void, message: string) => {
    set(null);
    window.requestAnimationFrame(() => set(message));
  };

  const shake = (row: HTMLElement | null) => {
    if (!row || reducedNow()) return;
    row.animate(
      [
        { transform: "translateX(0px)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(0px)" },
      ],
      { duration: 280, easing: EASE.lime },
    );
  };

  const chooseRole = (next: LoginRole) => {
    if (next === role) return;
    setRole(next);
    setPreview(null);
    stage.current?.morph(next);
  };

  const recognise = (raw: string) => {
    const account = accountForId(raw) ?? null;
    if (account !== match) {
      setMatch(account);
      if (account) {
        router.prefetch(account.home);
        chooseRole(account.role);
      }
    }
    const prefix = account ? null : (uniquePrefix(raw)?.role ?? null);
    if (prefix !== prefixRole) setPrefixRole(prefix);
    return account;
  };

  // ---- Success: the house is topped out and the door opens on their screen ----
  const openLight = (rect: DOMRect) => {
    const light = lightRef.current;
    if (!light) return;
    Object.assign(light.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      opacity: "1",
    });
    const scale = Math.max(window.innerWidth / Math.max(rect.width, 1), window.innerHeight / Math.max(rect.height, 1)) * 1.15;
    const tx = window.innerWidth / 2 - (rect.left + rect.width / 2);
    const ty = window.innerHeight / 2 - (rect.top + rect.height / 2);
    light.animate(
      [{ transform: "translate(0px, 0px) scale(1)" }, { transform: `translate(${tx}px, ${ty}px) scale(${scale.toFixed(2)})` }],
      { duration: 260, easing: EASE.teak, fill: "forwards" },
    );
  };

  const writeChecked = (first: string) => {
    if (checkedRef.current) checkedRef.current.textContent = first;
  };

  const pressStamp = (account: DemoAccount) => {
    const el = refs.stamp.current;
    if (!el) return;
    if (account.role === "client") {
      el.animate(
        [
          { opacity: 0, transform: "rotate(-4deg) scale(1.18)" },
          { opacity: 1, transform: "rotate(-4deg) scale(1)" },
        ],
        { duration: 180, easing: EASE.brass, fill: "forwards" },
      );
    } else {
      el.animate(
        [
          { opacity: 0, transform: "rotate(-4deg) scale(1.6)", easing: EASE.lay },
          { opacity: 1, transform: "rotate(-4deg) scale(0.96)", offset: 0.7 },
          { opacity: 1, transform: "rotate(-4deg) scale(1)" },
        ],
        { duration: 260, fill: "forwards" },
      );
    }
  };

  const succeed = (account: DemoAccount) => {
    const state = live.current;
    // The tab is told first, so the next screen opens as this person, under the light.
    demo.signIn(account);
    try {
      window.sessionStorage.setItem(ARRIVED_KEY, "1");
    } catch {
      // Without storage the next screen simply opens without the light fading off it.
    }
    router.prefetch(account.home);
    setSignedIn(account);
    setMatch(account);
    setPrefixRole(null);
    if (account.role !== role) setRole(account.role);
    setIdError(null);
    setPasswordError(null);
    setPhase("success");

    const first = account.name.split(" ")[0];
    const go = () => {
      if (state.pushed) return;
      state.pushed = true;
      state.unskip?.();
      router.push(account.home);
    };
    // Any key or press skips straight in.
    const skip = () => go();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    state.unskip = () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      state.unskip = null;
    };

    stage.current?.topOut(openLight);
    if (reducedNow()) {
      writeChecked(first);
      state.timers.after(450, go);
      return;
    }
    // The stamp lands early, while the house tops out, and holds until the flight.
    state.timers.after(250, () => pressStamp(account));
    state.timers.after(510, () => writeChecked(first));
    state.timers.after(1400, go);
    state.timers.after(1800, () => setSlowPush(true));
  };

  // ---- The board's handlers ----
  // The board gets one object for its whole life (stableOn, below), which calls these.
  const on: BoardHandlers = {
    onRole: (next) => {
      chooseRole(next);
      const state = live.current;
      // A click with a mouse moves on to the ID. A tap does not, so the keyboard stays shut.
      if (state.pointer === "mouse" && performance.now() - state.pointerAt < 1000) {
        refs.id.current?.focus({ preventScroll: true });
      }
      state.pointer = null;
    },
    onRoleKeyDown: (event: KeyboardEvent<HTMLFieldSetElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        refs.id.current?.focus();
      }
    },
    onTilePointerDown: (event: PointerEvent<HTMLLabelElement>) => {
      live.current.pointer = event.pointerType;
      live.current.pointerAt = performance.now();
    },
    onTileEnter: (next, event) => {
      if (event.pointerType !== "mouse") return;
      window.clearTimeout(live.current.hover);
      live.current.hover = window.setTimeout(() => startTransition(() => setPreview(next)), 120);
    },
    onTileLeave: () => {
      window.clearTimeout(live.current.hover);
      startTransition(() => setPreview(null));
    },
    onIdInput: () => {
      if (phase === "success") return;
      syncTyped();
      const raw = values().id;
      if (idError && raw.length > 0) setIdError(null);
      recognise(raw);
    },
    onIdFocus: () => {
      stage.current?.twang();
      syncTyped();
    },
    onPasswordInput: () => {
      if (phase === "success") return;
      syncTyped();
      if (passwordError && values().password.length > 0) setPasswordError(null);
    },
    onPasswordFocus: () => {
      if (!showPassword) stage.current?.shutter(true);
      syncTyped();
    },
    onFieldBlur: () => {
      stage.current?.shutter(false);
      // Focus moves on before the next field says so; check once it has landed.
      window.setTimeout(syncTyped, 0);
    },
    onPasswordKey: (event: KeyboardEvent<HTMLInputElement>) => {
      const on = event.getModifierState("CapsLock");
      if (on !== caps) setCaps(on);
    },
    onShow: () => {
      const next = !showPassword;
      setShowPassword(next);
      if (next) stage.current?.shutter(false);
    },
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (phase === "success") return;
      syncTyped();
      const { id, password } = values();
      const trimmed = id.trim();
      const still = reducedNow();

      if (!trimmed) {
        announce(setIdError, "Enter your ID, in the form firstname.lastname.");
        refs.id.current?.focus();
        stage.current?.twang();
        if (still) stage.current?.brick();
        return;
      }

      const account = recognise(id);
      if (!account) {
        const lower = trimmed.toLowerCase();
        const message =
          lower.includes("@") && !lower.endsWith(DOMAIN)
            ? "Use your ID without the email part, like firstname.lastname."
            : `No account has the ID “${cut(trimmed)}”. Check the spelling.`;
        announce(setIdError, message);
        refs.id.current?.focus();
        refs.id.current?.select();
        if (still) {
          stage.current?.brick();
        } else {
          stage.current?.swingHook(10);
          stage.current?.slack();
          shake(refs.idRow.current);
        }
        return;
      }

      if (!password) {
        announce(setPasswordError, `Enter the password for ${account.id}.`);
        refs.password.current?.focus();
        return;
      }

      const result = findAccount(id, password);
      if (!result.ok) {
        const misses = (live.current.misses.get(account.id) ?? 0) + 1;
        live.current.misses.set(account.id, misses);
        const stuck =
          account.role === "admin"
            ? "Still not right. Check Caps Lock; the demo passwords are in the README."
            : "Still not right. Check Caps Lock, or ask Shalini Murthy, operations head, to reset it.";
        const message =
          misses >= 3
            ? stuck
            : `That password is not right for ${account.id}. Passwords are case-sensitive.${caps ? " Caps Lock is on." : ""}`;
        announce(setPasswordError, message);
        setRevision((n) => n + 1);
        refs.password.current?.focus();
        refs.password.current?.select();
        if (still) {
          stage.current?.brick();
        } else {
          shake(refs.passwordRow.current);
          stage.current?.topple(blocksFor(id.length, password.length));
        }
        return;
      }

      succeed(result.account);
    },
  };

  const handlers = useRef<BoardHandlers | null>(null);
  useEffect(() => {
    handlers.current = on;
  });
  const [stableOn] = useState<BoardHandlers>(() => ({
    onRole: (next, pointer) => handlers.current?.onRole(next, pointer),
    onRoleKeyDown: (event) => handlers.current?.onRoleKeyDown(event),
    onTilePointerDown: (event) => handlers.current?.onTilePointerDown(event),
    onTileEnter: (next, event) => handlers.current?.onTileEnter(next, event),
    onTileLeave: () => handlers.current?.onTileLeave(),
    onIdInput: () => handlers.current?.onIdInput(),
    onIdFocus: () => handlers.current?.onIdFocus(),
    onPasswordInput: () => handlers.current?.onPasswordInput(),
    onPasswordFocus: () => handlers.current?.onPasswordFocus(),
    onFieldBlur: () => handlers.current?.onFieldBlur(),
    onPasswordKey: (event) => handlers.current?.onPasswordKey(event),
    onShow: () => handlers.current?.onShow(),
    onSubmit: (event) => {
      // Never let the browser send the form itself, even before the handlers are set.
      event.preventDefault();
      handlers.current?.onSubmit(event);
    },
  }));

  const success = phase === "success";
  // Someone already signed in in this tab who came back here: say so, and offer the way back.
  const already = onClient && demo.session && !signedIn ? (accountForId(demo.session.id) ?? null) : null;
  const tag = success && signedIn ? `${signedIn.name.split(" ")[0]} ✓` : match ? `${match.name.split(" ")[0]} ✓` : role ? ROLE_TAG[role] : null;

  return (
    <main className="login" data-phase={phase} data-reduced={reduced ? "" : undefined}>
      <p className="sr-only">
        A laterite house being built on site, with a crane and scaffolding. Each character you type lays a block.
      </p>
      <p className="sr-only" role="status">
        {success && signedIn ? `Signed in. Opening ${signedIn.name}'s screen.` : ""}
      </p>

      <div className="lg-scene on-dark">
        <div className="lg-head">
          <div className="lg-titles">
            <p className="display text-22 lg-wordmark lg-exit">Poetry Designs</p>
            <p className="display display-xl lg-hero lg-exit">From concept to reality.</p>
          </div>
          <div className="lg-caption-slot lg-exit" aria-hidden="true">
            <RoleCaption role={role} match={match} />
          </div>
        </div>
        {tag && (
          <p className="lettering text-13 lg-tag" aria-hidden="true">
            {tag}
          </p>
        )}
        <div className="lg-stage-box">
          <SiteStage ref={stage} role={role} preview={preview} phase={phase} reduced={reduced} />
        </div>
      </div>

      <div className="lg-band" aria-hidden="true" />

      <div className="lg-board-col">
        <div className="lg-board-wrap lg-exit">
          {already && (
            <p className="lg-session text-15">
              <span>Signed in as {already.name}.</span>
              <Link href={already.home} className="link font-semibold">
                Open your screen
              </Link>
              <SignOutButton className="link" />
            </p>
          )}
          <SignInBoard
            role={role}
            prefixRole={prefixRole}
            match={match}
            idError={idError}
            passwordError={passwordError}
            caps={caps}
            showPassword={showPassword}
            success={success}
            signedIn={signedIn}
            revision={revision}
            refs={refs}
            on={stableOn}
          />
          <span className="lg-post" aria-hidden="true" />
          <span className="lg-post" aria-hidden="true" />
        </div>
      </div>

      <footer className="lg-foot lg-exit on-dark text-15">
        <Link href="/follow" className="link inline-flex min-h-11 items-center hover:text-lime">
          Follow one payment from site to bank
        </Link>
      </footer>

      <div ref={lightRef} className="lg-light" aria-hidden="true" />
      <div className="lg-veil" aria-hidden="true" />
      {slowPush && signedIn && (
        <p className="lettering text-13 lg-opening" aria-hidden="true">
          Opening {signedIn.name.split(" ")[0]}&apos;s screen
        </p>
      )}
    </main>
  );
}
