"use client";

import {
  memo,
  startTransition,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import { CourseTrench } from "@/components/admin/course-trench";
import { House, PegMark } from "@/components/house/house";
import { mulberry32, pct } from "@/lib/draw";
import { useFirm } from "@/lib/demo-store";
import { ANCHORS } from "@/lib/house-model";
import { useOnce } from "@/lib/motion";
import { BlockOverlay } from "./block-overlay";
import { SceneBack, SceneFront } from "./site-scene";
import {
  AMBIENT_CAP,
  BASE_LAID,
  BLOCKS,
  COURSES,
  DOOR_ORIGIN,
  FLIGHT_SCALE,
  HOUSE_DY,
  PILE,
  ROLE_CAMERA,
  SCENE,
  STRING_SPANS,
  TOTAL,
  TYPED_CAP,
  stopFor,
  stringAt,
  trolleyFor,
  type LoginRole,
} from "./site-model";
import { SiteRefs } from "./site-refs";
import { EASE, Timers, modestDevice, reducedNow } from "./timing";
import { useSiteLoop } from "./use-site-loop";

// The stage: a laterite site at dusk with the real house half built in it. Everything a
// keystroke does happens here by hand, through refs, so typing never renders the scene.

export type StagePhase = "idle" | "error" | "success";

export type StageHandle = {
  /** The blocks the typed characters are worth; lays or lifts blocks to match. Returns the laid count. */
  setTyped: (typed: number) => number;
  /** Whether the crane may deliver on its own: both fields empty and neither focused. */
  setAmbient: (allowed: boolean) => void;
  topple: (count: number) => void;
  slack: () => void;
  twang: () => void;
  swingHook: (deg: number) => void;
  shutter: (down: boolean) => void;
  brick: () => void;
  morph: (role: LoginRole | null) => void;
  topOut: (onLight: (rect: DOMRect) => void) => void;
};

const MAX_IN_FLIGHT = 12;
const LEVELS = [
  { label: "+9.4", y: 62 },
  { label: "+6.7", y: 152 },
  { label: "+3.3", y: 262 },
  { label: "+0.0", y: 372 },
];
const PEGS = ["pay:3", "design:terrace-plan"];
const CABLE_TOP = SCENE.crane.jibY + 4;
const IDENTITY = "matrix(1, 0, 0, 1, 0, 0)";

export const SiteStage = memo(function SiteStage({
  role,
  preview,
  phase,
  reduced,
  ref,
}: {
  role: LoginRole | null;
  preview: LoginRole | null;
  phase: StagePhase;
  reduced: boolean;
  ref?: Ref<StageHandle>;
}) {
  const [refs] = useState(() => new SiteRefs());
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  // The payment stop lives here, so a storey finishing renders the house and nothing else.
  const [stop, setStop] = useState(1);
  const [waking, wakeDone] = useOnce("login-wake");
  const loop = useSiteLoop(stageRef, refs, !reduced && phase !== "success");

  // Everything the hand-driven motion keeps between calls.
  const s = useRef({
    laid: BASE_LAID,
    typed: 0,
    want: BASE_LAID,
    stop: 1,
    ambient: 0,
    ambientAllowed: false,
    anims: new Array<Animation | null>(TOTAL).fill(null),
    inFlight: [] as { i: number; anim: Animation }[],
    full: COURSES.map((c) => c.to <= BASE_LAID),
    string: stringAt(BASE_LAID),
    dust: 0,
    keys: 0,
    toppling: [] as Animation[],
    timers: new Timers(),
    ambientTimers: new Timers(),
    toppleTimers: new Timers(),
    crane: [] as Animation[],
    trolleyX: 0,
    delivering: false,
    morphing: false,
    done: false,
  });
  const latest = useRef({ phase });
  useEffect(() => {
    latest.current = { phase };
  });

  // The wake plays once per page load: any key or press ends it, and so does its clock.
  useEffect(() => {
    if (!waking) return;
    const timer = window.setTimeout(wakeDone, 1600);
    window.addEventListener("pointerdown", wakeDone);
    window.addEventListener("keydown", wakeDone);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", wakeDone);
      window.removeEventListener("keydown", wakeDone);
    };
  }, [waking, wakeDone]);

  // Leaving the page cancels every timer and animation it started.
  useEffect(() => {
    const state = s.current;
    // Development mounts twice; the second mount is live again.
    state.done = false;
    return () => {
      // The router hides this page and shows the same instance again on the way back, so
      // everything is put back to a state the effects can start from.
      state.done = true;
      state.ambientAllowed = false;
      state.timers.clear();
      state.ambientTimers.clear();
      state.toppleTimers.clear();
      state.anims.forEach((a, i) => {
        a?.cancel();
        state.anims[i] = null;
      });
      for (const a of state.toppling) a.cancel();
      for (const a of state.crane) a.cancel();
      for (const el of [refs.trolley, refs.cable, refs.hookHead, refs.carried]) {
        for (const a of el?.getAnimations() ?? []) a.cancel();
      }
      state.inFlight = [];
      state.toppling = [];
      state.crane = [];
      state.trolleyX = 0;
      state.morphing = false;
      state.delivering = false;
    };
  }, [refs]);

  useImperativeHandle(ref, () => {
    const st = s.current;
    const visual = () => Math.min(st.laid, TOTAL);

    const applyStop = (laid: number) => {
      const next = stopFor(Math.min(laid, TOTAL));
      if (next === st.stop) return;
      st.stop = next;
      startTransition(() => setStop(next));
    };

    const puff = (i: number) => {
      if (loop.current.lite) return;
      const b = BLOCKS[i];
      const rnd = mulberry32(i + 11);
      const corners = [
        [b.x, b.y, -1],
        [b.x + b.w, b.y, 1],
        [b.cx, b.y, 0],
      ];
      for (const [x, y, side] of corners) {
        const mote = refs.dust[st.dust % refs.dust.length];
        st.dust += 1;
        if (!mote) continue;
        const reach = 6 + rnd() * 6;
        const dx = side === 0 ? (rnd() - 0.5) * 6 : side * reach;
        const dy = -(2 + rnd() * reach * 0.6);
        mote.animate(
          [
            { transform: `translate(${x - 1.25}px, ${y - 1.25}px)`, opacity: 1 },
            { transform: `translate(${x - 1.25 + dx}px, ${y - 1.25 + dy}px)`, opacity: 0 },
          ],
          { duration: 260, easing: EASE.lime },
        );
      }
    };

    const flashCourse = (row: number) => {
      const joint = refs.joints[row];
      if (!joint || reducedNow()) return;
      if (stageRef.current?.dataset.role === "finance") return;
      joint.animate(
        [
          { strokeDashoffset: 1, opacity: 0.7, easing: EASE.trowel },
          { strokeDashoffset: 0, opacity: 0.7, offset: 0.22 },
          { strokeDashoffset: 0, opacity: 0.7, offset: 0.53, easing: EASE.lime },
          { strokeDashoffset: 0, opacity: 0 },
        ],
        { duration: 1280 },
      );
    };

    const pins = (from: number) => {
      if (reducedNow()) return;
      for (let p = from; p < from + 2; p++) {
        refs.pins[p]?.animate([{ transform: "scale(1.25)" }, { transform: "scale(1)" }], {
          duration: 120,
          easing: EASE.lime,
        });
      }
    };

    /** Keeps the joints and the string line in step with what is laid. */
    const settle = (landed?: number) => {
      const v = visual();
      COURSES.forEach((c, row) => {
        const full = v >= c.to;
        // A course is complete once its last block has landed, not when it was thrown.
        let down = full;
        for (let j = c.from; down && j < c.to; j++) {
          down = st.anims[j] === null && Boolean(refs.blocks[j]?.hasAttribute("data-on"));
        }
        if (down && !st.full[row]) {
          st.full[row] = true;
          refs.joints[row]?.setAttribute("data-full", "");
          if (landed !== undefined) flashCourse(row);
        } else if (!full && st.full[row]) {
          st.full[row] = false;
          refs.joints[row]?.removeAttribute("data-full");
        }
      });

      const next = stringAt(v);
      const prev = st.string;
      st.string = next;
      STRING_SPANS.forEach((span, k) => {
        const el = refs.strings[k];
        if (!el) return;
        const on = next?.storey === span.storey;
        if (on) {
          el.setAttribute("data-on", "");
          el.style.transform = `translateY(${next.y}px)`;
        } else {
          el.removeAttribute("data-on");
        }
      });
      if (next && prev && next.y !== prev.y) {
        const k = STRING_SPANS.findIndex((span) => span.storey === next.storey);
        pins(k * 2);
      }
    };

    const throwBlock = (i: number, fast = false) => {
      const el = refs.blocks[i];
      if (!el || st.done) return;
      st.anims[i]?.cancel();
      st.anims[i] = null;
      el.setAttribute("data-on", "");
      if (reducedNow()) {
        settle(i);
        return;
      }
      // The oldest throws land at once when too many are in the air.
      while (st.inFlight.length >= MAX_IN_FLIGHT) st.inFlight.shift()?.anim.finish();
      const b = BLOCKS[i];
      const dx = PILE.x - b.cx;
      const dy = PILE.y - b.cy;
      const duration = fast || st.inFlight.length >= 6 ? 220 : 380;
      const anim = el.animate(
        [
          { offset: 0, transform: `translate(${dx}px, ${dy}px) rotate(-24deg)`, opacity: 0, easing: EASE.arc },
          { offset: 0.15, opacity: 1 },
          { offset: 0.55, transform: `translate(${(dx * 0.45).toFixed(1)}px, ${Math.min(dy, 0) - 70}px) rotate(-8deg)`, easing: EASE.lay },
          { offset: 0.88, transform: "translate(0px, -9px) rotate(0deg)" },
          { offset: 1, transform: "translate(0px, 0px) rotate(0deg)", opacity: 1 },
        ],
        { duration },
      );
      st.anims[i] = anim;
      const entry = { i, anim };
      st.inFlight.push(entry);
      anim.onfinish = () => {
        st.inFlight = st.inFlight.filter((e) => e !== entry);
        if (st.anims[i] === anim) st.anims[i] = null;
        puff(i);
        settle(i);
      };
      anim.oncancel = () => {
        st.inFlight = st.inFlight.filter((e) => e !== entry);
        if (st.anims[i] === anim) st.anims[i] = null;
      };
    };

    const liftOff = (i: number, delay: number) => {
      const el = refs.blocks[i];
      if (!el) return;
      st.anims[i]?.cancel();
      st.anims[i] = null;
      if (!el.hasAttribute("data-on")) return;
      if (reducedNow()) {
        el.removeAttribute("data-on");
        return;
      }
      const anim = el.animate(
        [
          { transform: "translateY(0px)", opacity: 1 },
          { transform: "translateY(-12px)", opacity: 0 },
        ],
        { duration: 140, delay, easing: EASE.lime, fill: "forwards" },
      );
      st.anims[i] = anim;
      anim.onfinish = () => {
        if (i >= visual()) el.removeAttribute("data-on");
        anim.cancel();
        if (st.anims[i] === anim) st.anims[i] = null;
      };
    };

    const endTopple = () => {
      st.toppleTimers.clear();
      for (const a of st.toppling) a.cancel();
      st.toppling = [];
    };

    /** Lays or lifts blocks so that `next` are down. */
    const layTo = (next: number, paced: boolean) => {
      const a = visual();
      st.laid = next;
      const b = visual();
      if (st.toppling.length > 0) endTopple();
      if (b > a) {
        // A keystroke's few blocks go down one after another along the course.
        const gap = b - a > 6 ? 30 : 40;
        for (let i = a; i < b; i++) {
          const k = i - a;
          if (!paced || k === 0) throwBlock(i);
          else
            st.timers.after(k * gap, () => {
              if (i < visual() && !refs.blocks[i]?.hasAttribute("data-on")) throwBlock(i);
            });
        }
      } else if (b < a) {
        for (let i = a - 1; i >= b; i--) liftOff(i, (a - 1 - i) * 25);
      }
      settle();
    };

    const pointPastTop = () => {
      if (loop.current.lite) return;
      st.keys += 1;
      const row = Math.floor(mulberry32(st.keys)() * COURSES.length);
      const joint = refs.joints[row];
      if (!joint || reducedNow()) return;
      joint.animate(
        [
          { strokeDashoffset: 1, opacity: 0.9, easing: EASE.trowel },
          { strokeDashoffset: 0, opacity: 0.9, offset: 0.4 },
          { strokeDashoffset: 0, opacity: 0 },
        ],
        { duration: 500 },
      );
    };

    // ---- The crane ----
    const craneTo = (el: Element | null, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      if (!el) return null;
      const anim = el.animate(frames, { fill: "forwards", ...options });
      st.crane.push(anim);
      anim.onfinish = () => {
        st.crane = st.crane.filter((x) => x !== anim);
      };
      return anim;
    };

    /** Where the trolley really is now, in scene units from its park. Read in handlers only. */
    const trolleyNow = () => {
      const el = refs.trolley;
      if (!el) return 0;
      try {
        return new DOMMatrixReadOnly(getComputedStyle(el).transform).e;
      } catch {
        return st.trolleyX;
      }
    };

    /**
     * Ends a delivery where it stands. Finished moves still hold their end values, so every
     * move on the crane is cancelled from the elements themselves, and the trolley, hook and
     * carried block then run home from wherever they had got to.
     */
    const stopCrane = () => {
      const parts = [refs.trolley, refs.cable, refs.hookHead, refs.carried] as const;
      const from = parts.map((el) => {
        if (!el) return null;
        const style = getComputedStyle(el);
        return {
          transform: style.transform === "none" ? IDENTITY : style.transform,
          opacity: style.opacity,
        };
      });
      for (const el of parts) for (const a of el?.getAnimations() ?? []) a.cancel();
      for (const a of st.crane) a.cancel();
      st.crane = [];
      st.trolleyX = 0;
      st.delivering = false;
      if (reducedNow()) return;
      const [trolley, cable, hookHead, carried] = parts;
      const [t, c, h, k] = from;
      const home = (el: Element | null, at: { transform: string } | null, duration: number, easing: string) => {
        if (el && at && at.transform !== IDENTITY) {
          el.animate([{ transform: at.transform }, { transform: IDENTITY }], { duration, easing });
        }
      };
      home(trolley, t, 500, EASE.teak);
      home(cable, c, 320, EASE.lime);
      home(hookHead, h, 320, EASE.lime);
      if (carried && k && Number(k.opacity) > 0) {
        carried.animate([{ opacity: k.opacity }, { opacity: 0 }], { duration: 160, easing: EASE.lime });
      }
    };

    const lowerTo = (localEnd: number, ms: number, delay: number) => {
      const scale = (localEnd - 6) / SCENE.crane.cable;
      const drop = localEnd - (6 + SCENE.crane.cable);
      craneTo(refs.cable, [{ transform: "scaleY(1)" }, { transform: `scaleY(${scale.toFixed(3)})` }], {
        duration: ms,
        delay,
        easing: EASE.lay,
      });
      craneTo(refs.hookHead, [{ transform: "translateY(0px)" }, { transform: `translateY(${drop.toFixed(1)}px)` }], {
        duration: ms,
        delay,
        easing: EASE.lay,
      });
      return { scale, drop };
    };

    const raise = (scale: number, drop: number, delay: number) => {
      craneTo(refs.cable, [{ transform: `scaleY(${scale.toFixed(3)})` }, { transform: "scaleY(1)" }], {
        duration: 400,
        delay,
        easing: EASE.lime,
      });
      craneTo(refs.hookHead, [{ transform: `translateY(${drop.toFixed(1)}px)` }, { transform: "translateY(0px)" }], {
        duration: 400,
        delay,
        easing: EASE.lime,
      });
    };

    const runTrolley = (to: number, delay: number) => {
      // A move that starts now starts from where the trolley is, even on its way home.
      const from = delay === 0 ? trolleyNow() : st.trolleyX;
      st.trolleyX = to;
      craneTo(refs.trolley, [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], {
        duration: 600,
        delay,
        easing: EASE.teak,
      });
    };

    const ambientOk = () =>
      st.ambientAllowed &&
      !st.done &&
      !document.hidden &&
      !loop.current.lite &&
      !reducedNow() &&
      latest.current.phase !== "success" &&
      !stageRef.current?.hasAttribute("data-offscreen") &&
      BASE_LAID + st.ambient < AMBIENT_CAP &&
      st.typed === 0;

    const deliver = () => {
      if (!ambientOk() || st.morphing) {
        scheduleAmbient();
        return;
      }
      const i = BASE_LAID + st.ambient;
      const b = BLOCKS[i];
      const reach = trolleyFor(b.cx);
      const land = () => {
        st.ambient += 1;
        st.laid = BASE_LAID + st.ambient + st.typed;
        applyStop(st.laid);
      };
      if (reach === null) {
        land();
        throwBlock(i);
        settle();
        scheduleAmbient();
        return;
      }
      st.delivering = true;
      runTrolley(reach - SCENE.crane.trolleyPark, 0);
      craneTo(refs.carried, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
      const localEnd = b.y + HOUSE_DY - 9 - CABLE_TOP;
      const { scale, drop } = lowerTo(localEnd, 500, 600);
      st.ambientTimers.after(1100, () => {
        craneTo(refs.carried, [{ opacity: 1 }, { opacity: 0 }], { duration: 60 });
        if (!ambientOk()) {
          raise(scale, drop, 0);
          st.delivering = false;
          return;
        }
        land();
        const el = refs.blocks[i];
        if (el) {
          st.anims[i]?.cancel();
          el.setAttribute("data-on", "");
          el.animate(
            [
              { transform: "translateY(-9px)", opacity: 0 },
              { transform: "translateY(0px)", opacity: 1 },
            ],
            { duration: 140, easing: EASE.lay },
          );
          puff(i);
        }
        settle(i);
        raise(scale, drop, 140);
        st.ambientTimers.after(560, () => {
          st.delivering = false;
          scheduleAmbient();
        });
      });
    };

    const scheduleAmbient = () => {
      st.ambientTimers.clear();
      if (!st.ambientAllowed || st.done || reducedNow()) return;
      if (BASE_LAID + st.ambient >= AMBIENT_CAP) return;
      st.ambientTimers.after(modestDevice() ? 3200 : 2400, deliver);
    };

    return {
      setTyped(typed: number) {
        const prev = st.laid;
        st.typed = typed;
        if (typed > 0 && st.delivering) {
          st.ambientTimers.clear();
          stopCrane();
        }
        // Typing builds up to the first floor; the rest is laid when the password is right.
        const want = BASE_LAID + st.ambient + typed;
        const next = Math.min(want, Math.max(TYPED_CAP, BASE_LAID + st.ambient));
        layTo(next, Math.abs(next - prev) > 1);
        if (want > next && want > st.want) pointPastTop();
        st.want = want;
        applyStop(next);
        return next;
      },
      setAmbient(allowed: boolean) {
        if (allowed === st.ambientAllowed) return;
        st.ambientAllowed = allowed;
        st.ambientTimers.clear();
        if (!allowed) {
          if (st.delivering) stopCrane();
          return;
        }
        // Resume a little after the fields are left empty.
        st.ambientTimers.after(1200, deliver);
      },
      topple(count: number) {
        const v = visual();
        const n = Math.min(10, count, v);
        if (n <= 0) return;
        for (const e of [...st.inFlight]) e.anim.finish();
        endTopple();
        if (reducedNow()) return;
        let swung = false;
        for (let k = 0; k < n; k++) {
          const i = v - 1 - k;
          const el = refs.blocks[i];
          if (!el) continue;
          st.anims[i]?.cancel();
          st.anims[i] = null;
          const b = BLOCKS[i];
          const rnd = mulberry32(i * 7 + 3);
          const drift = (rnd() < 0.5 ? -1 : 1) * (8 + rnd() * 14);
          const turn = (rnd() < 0.5 ? -1 : 1) * (40 + rnd() * 55);
          const fall = 392 - (b.y + b.h) + 1;
          const end = `translate(${drift.toFixed(1)}px, ${fall.toFixed(1)}px) rotate(${turn.toFixed(0)}deg)`;
          const bounce = `translate(${drift.toFixed(1)}px, ${(fall - 6).toFixed(1)}px) rotate(${turn.toFixed(0)}deg)`;
          const anim = el.animate(
            [
              { offset: 0, transform: "translate(0px, 0px) rotate(0deg)", opacity: 1, easing: EASE.lay },
              { offset: 0.416, transform: end, easing: "ease-out" },
              { offset: 0.45, transform: bounce, easing: "ease-in" },
              { offset: 0.49, transform: end },
              { offset: 0.85, transform: end, opacity: 1 },
              { offset: 1, transform: end, opacity: 0 },
            ],
            { duration: 1060, delay: k * 40, fill: "forwards" },
          );
          st.toppling.push(anim);
          st.toppleTimers.after(k * 40 + 450, () => {
            puff(i);
            if (!swung) {
              swung = true;
              hook(8);
            }
          });
          anim.onfinish = () => {
            // Laid again from the pile, last to fall first.
            st.toppleTimers.after((n - 1 - k) * 60, () => {
              anim.cancel();
              st.toppling = st.toppling.filter((a) => a !== anim);
              if (i < visual()) throwBlock(i, true);
            });
          };
        }
      },
      slack() {
        const k = STRING_SPANS.findIndex((span) => span.storey === st.string?.storey);
        const el = refs.stringInner[k];
        if (!el || reducedNow()) return;
        el.animate(
          [
            { transform: "translateY(0px)", opacity: 1, easing: EASE.lay },
            { transform: "translateY(6px)", opacity: 0.5, offset: 0.15 },
            { transform: "translateY(6px)", opacity: 0.5, offset: 0.82, easing: EASE.teak },
            { transform: "translateY(0px)", opacity: 1 },
          ],
          { duration: 1340 },
        );
      },
      twang: () => twang(),
      swingHook: (deg: number) => hook(deg),
      shutter(down: boolean) {
        const stage = stageRef.current;
        if (!stage) return;
        if (down) stage.setAttribute("data-shutter", "");
        else stage.removeAttribute("data-shutter");
      },
      brick() {
        const overlay = refs.overlay;
        if (!overlay) return;
        overlay.setAttribute("data-brick", "");
        st.timers.after(900, () => overlay.removeAttribute("data-brick"));
      },
      morph(next: LoginRole | null) {
        if (next !== "site" || reducedNow()) return;
        // A real delivery: the trolley runs out, the pallet is lowered beside the house.
        st.ambientTimers.clear();
        stopCrane();
        st.morphing = true;
        const to = 820 - SCENE.crane.trolleyPark;
        runTrolley(to, 0);
        const groundEnd = SCENE.pallet.y - 8 - CABLE_TOP;
        const { scale, drop } = lowerTo(groundEnd, 500, 600);
        const hang = -(groundEnd - (6 + SCENE.crane.cable));
        craneTo(
          refs.pallet,
          [
            { transform: `translate(${-to}px, ${hang}px)`, easing: EASE.teak },
            { transform: `translate(0px, ${hang}px)`, offset: 600 / 1100, easing: EASE.lay },
            { transform: "translate(0px, 0px)" },
          ],
          { duration: 1100 },
        );
        refs.bags.forEach((bag, k) => {
          bag?.animate(
            [
              { transform: "translateY(-3px)", opacity: 0.5 },
              { transform: "translateY(0px)", opacity: 1 },
            ],
            { duration: 160, delay: 1100 + k * 60, easing: EASE.lime, fill: "backwards" },
          );
        });
        raise(scale, drop, 1400);
        runTrolley(0, 1800);
        st.timers.after(2400, () => {
          st.morphing = false;
        });
        twang();
      },
      topOut(onLight: (rect: DOMRect) => void) {
        st.ambientAllowed = false;
        st.ambientTimers.clear();
        stopCrane();
        endTopple();
        for (const e of [...st.inFlight]) e.anim.finish();
        const overlay = refs.overlay;
        if (reducedNow()) {
          st.stop = 10;
          setStop(10);
          return;
        }
        // The house lays every storey still to come, then its finishing passes run.
        st.stop = 4;
        setStop(4);
        st.timers.after(400, () => {
          st.stop = 10;
          setStop(10);
        });
        if (overlay && !loop.current.lite && (navigator.hardwareConcurrency ?? 8) > 4) {
          overlay.style.setProperty("--from", String(visual()));
          overlay.setAttribute("data-topping", "");
        }
        // The flight: the camera carries the door to the middle of the screen, the house
        // filling it, and the stage lets it out of its box to do so.
        st.timers.after(780, () => {
          const stage = stageRef.current;
          const camera = cameraRef.current;
          if (!stage || !camera) return;
          const box = stage.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const fit = Math.min(vw / (0.72 * box.width), vh / (0.44 * box.width)) * 0.9;
          const scale = Math.max(FLIGHT_SCALE, fit);
          const tx = vw / 2 - box.left - scale * (DOOR_ORIGIN.x / 100) * box.width;
          const ty = vh / 2 - box.top - scale * (DOOR_ORIGIN.y / 100) * box.height;
          const from = getComputedStyle(camera).transform;
          camera.animate(
            [
              { transform: from === "none" ? IDENTITY : from },
              { transform: `matrix(${scale.toFixed(3)}, 0, 0, ${scale.toFixed(3)}, ${tx.toFixed(1)}, ${ty.toFixed(1)})` },
            ],
            { duration: 350, easing: EASE.teak, fill: "forwards" },
          );
        });
        st.timers.after(900, () => {
          overlay?.setAttribute("data-door", "");
          refs.leaves.forEach((leaf) => {
            leaf?.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0.08)" }], {
              duration: 240,
              easing: EASE.teak,
              fill: "forwards",
            });
          });
        });
        st.timers.after(1140, () => {
          if (refs.door) onLight(refs.door.getBoundingClientRect());
        });
      },
    };

    function twang() {
      const k = STRING_SPANS.findIndex((span) => span.storey === st.string?.storey);
      if (k < 0 || reducedNow()) return;
      pins(k * 2);
      refs.stringInner[k]?.animate(
        [
          { transform: "translateY(0px)" },
          { transform: "translateY(-1.6px)" },
          { transform: "translateY(1.2px)" },
          { transform: "translateY(-0.6px)" },
          { transform: "translateY(0px)" },
        ],
        { duration: 320, easing: EASE.lime },
      );
    }

    function hook(deg: number) {
      if (reducedNow()) return;
      if (loop.current.impulse(deg)) return;
      refs.hook?.animate(
        [0, deg, -deg * 0.7, deg * 0.4, -deg * 0.2, 0].map((d) => ({
          transform: `translate(0px, 6px) rotate(${d}deg) translate(0px, -6px)`,
        })),
        { duration: 900, easing: "ease-out" },
      );
    }
  }, [refs, loop]);

  const lifts = stop >= 3 ? 3 : stop >= 2 ? 2 : 1;

  return (
    <div
      ref={stageRef}
      className="login-stage"
      aria-hidden="true"
      data-role={role ?? "none"}
      data-preview={preview && preview !== role ? preview : undefined}
      data-stop={stop}
      data-lifts={lifts}
      data-phase={phase}
      data-reduced={reduced ? "" : undefined}
      data-waking={waking && !reduced ? "" : undefined}
    >
      <div ref={cameraRef} className="login-camera" style={{ transform: ROLE_CAMERA[role ?? "none"] }}>
        <div className="login-sky">
          <div className="sun-x">
            <div className="sun-y">
              <div className="sun" />
            </div>
          </div>
        </div>
        <SceneBack refs={refs} />
        <HorizonTrenches />
        <div className="login-house">
          <House
            tone="dark"
            labels={false}
            scene={{ stop, markers: "none", money: false, stringLabel: false }}
          />
          <BlockOverlay refs={refs} />
          <div className="role-layer lg-pegs" data-for="client">
            {PEGS.map((key, k) => (
              <span
                key={key}
                className="lg-peg"
                style={{ ...pct(ANCHORS[key].x, ANCHORS[key].y), "--k": k } as CSSProperties}
              >
                <PegMark className="lg-peg-mark" />
              </span>
            ))}
          </div>
          <div className="role-layer lg-dims" data-for="architect">
            <span className="lg-dim-run" style={{ left: pct(80, 0).left, right: `${((1 - 638 / 720) * 100).toFixed(3)}%`, top: pct(0, 22).top }}>
              <span className="lettering lg-dim-label">16.1 m</span>
            </span>
            {LEVELS.map((level, k) => (
              <span
                key={level.label}
                className="lettering lg-level"
                style={{ top: pct(0, level.y).top, right: `${(100 - (66 / 720) * 100).toFixed(3)}%`, "--k": k } as CSSProperties}
              >
                {level.label}
              </span>
            ))}
          </div>
        </div>
        <SceneFront refs={refs} />
      </div>
    </div>
  );
});

// Under each site on the admin's horizon, that project's money as course and trench: the
// admin's own drawing, in the ground the pulled-back camera shows below the line. Positions
// are shares of the stage; the sites stand past its edges, at SCENE.villa and SCENE.farm.
const TRENCH_AT = [
  { left: -18, w: 12 },
  { left: 105.5, w: 12 },
];

const HorizonTrenches = memo(function HorizonTrenches() {
  const firm = useFirm();
  const sites = firm.projects.filter((p) => p.phase !== "draft" && p.id !== "iyer").slice(0, 2);
  const scale = Math.max(1, ...sites.flatMap((p) => [Math.abs(p.margin ?? 0), Math.abs(p.cash)]));
  return (
    <div className="role-layer lg-trenches" data-for="admin">
      {sites.map((p, k) => (
        <div
          key={p.id}
          className="lg-trench"
          style={{ left: `${TRENCH_AT[k].left}%`, width: `${TRENCH_AT[k].w}%`, "--k": k } as CSSProperties}
        >
          <CourseTrench
            margin={p.margin}
            cash={p.cash}
            inDesign={p.margin === null}
            scale={scale}
            tone="dark"
            width={120}
            height={56}
          />
        </div>
      ))}
    </div>
  );
});
