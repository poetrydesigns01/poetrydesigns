"use client";

import { useEffect, useRef, type RefObject } from "react";
import { SCENE, SCENE_W } from "./site-model";
import type { SiteRefs } from "./site-refs";

// The one frame loop on the sign-in page: the far skyline and the crane drift a little
// with the pointer, and the crane hook swings on a spring. It sleeps as soon as nothing
// is moving, pauses when the tab is hidden or the stage is off screen, and never reads
// layout inside a frame. If frames come slowly it turns itself down for the visit.

export type SiteLoop = {
  /** Gives the hook a push, in degrees. Returns false when the loop cannot run it. */
  impulse: (deg: number) => boolean;
  /** True once the page has been found to run slowly. */
  lite: boolean;
};

const LERP = 0.08;
const STIFFNESS = 0.06;
const DAMPING = 0.86;
const SKY_X = 4;
const SKY_Y = 1.3;
const CRANE_X = 8;
const SLOW_FRAME_MS = 22;
const SAMPLE = 90;
const PROBE = 60;

export function useSiteLoop(
  stageRef: RefObject<HTMLDivElement | null>,
  refs: SiteRefs,
  enabled: boolean,
): RefObject<SiteLoop> {
  const api = useRef<SiteLoop>({ impulse: () => false, lite: false });

  useEffect(() => {
    const stage = stageRef.current;
    const loop = api.current;
    if (!stage || !enabled) {
      loop.impulse = () => false;
      return;
    }

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const slow = window.innerWidth < 640 || (navigator.hardwareConcurrency ?? 8) <= 4;
    let rect = stage.getBoundingClientRect();
    let raf = 0;
    let running = false;
    let last = 0;
    let frame = 0;
    let sum = 0;
    let samples = 0;
    let visible = !document.hidden;
    let onscreen = true;
    let pointer: { x: number; y: number } | null = null;
    const cur = { sx: 0, sy: 0, cx: 0 };
    const shown = { sx: 0, sy: 0, cx: 0, hook: 0 };
    let theta = 0;
    let velocity = 0;

    const canRun = () => visible && onscreen;

    const write = (el: Element | null, value: string) => {
      if (el) (el as SVGGElement).style.transform = value;
    };

    const goLite = () => {
      loop.lite = true;
      stage.setAttribute("data-lite", "");
    };

    const tick = (now: number) => {
      raf = 0;
      if (!canRun()) {
        running = false;
        return;
      }
      const dt = last ? now - last : 16.7;
      last = now;
      if (!loop.lite && dt < 200) {
        sum += dt;
        samples += 1;
        if (samples === SAMPLE) {
          if (sum / SAMPLE > SLOW_FRAME_MS) goLite();
          sum = 0;
          samples = 0;
        }
      }
      frame += 1;
      if (slow && frame % 2 === 1) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      const steps = slow ? 2 : 1;
      let active = false;
      // Scene units per pixel, so the drift is the same on every screen.
      const unit = SCENE_W / Math.max(rect.width, 1);

      if (fine && !loop.lite) {
        const nx = pointer ? (pointer.x / window.innerWidth) * 2 - 1 : 0;
        const ny = pointer ? (pointer.y / window.innerHeight) * 2 - 1 : 0;
        const target = { sx: -nx * SKY_X, sy: -ny * SKY_Y, cx: -nx * CRANE_X };
        for (const key of ["sx", "sy", "cx"] as const) {
          for (let s = 0; s < steps; s++) cur[key] += (target[key] - cur[key]) * LERP;
          if (Math.abs(target[key] - cur[key]) > 0.1) active = true;
        }
        if (Math.abs(cur.sx - shown.sx) > 0.1 || Math.abs(cur.sy - shown.sy) > 0.1) {
          shown.sx = cur.sx;
          shown.sy = cur.sy;
          write(refs.skyline, `translate(${(cur.sx * unit).toFixed(2)}px, ${(cur.sy * unit).toFixed(2)}px)`);
        }
        if (Math.abs(cur.cx - shown.cx) > 0.1) {
          shown.cx = cur.cx;
          write(refs.crane, `translateX(${(cur.cx * unit).toFixed(2)}px)`);
        }
      }

      // The hook leans toward the pointer and swings back on a spring.
      let goal = 0;
      if (fine && !loop.lite && pointer) {
        const hookX = rect.left + (SCENE.crane.trolleyPark / SCENE_W) * rect.width;
        goal = Math.max(-10, Math.min(10, ((pointer.x - hookX) / Math.max(rect.width, 1)) * 14));
      }
      for (let s = 0; s < steps; s++) {
        velocity = (velocity + (goal - theta) * STIFFNESS) * DAMPING;
        theta += velocity;
      }
      if (Math.abs(goal - theta) > 0.05 || Math.abs(velocity) > 0.01) active = true;
      if (Math.abs(theta - shown.hook) > 0.1) {
        shown.hook = theta;
        write(refs.hook, `translate(0px, 6px) rotate(${theta.toFixed(2)}deg) translate(0px, -6px)`);
      }

      if (active) {
        raf = window.requestAnimationFrame(tick);
      } else {
        running = false;
        last = 0;
        refs.skyline?.style.removeProperty("will-change");
        refs.crane?.style.removeProperty("will-change");
      }
    };

    const wake = () => {
      if (running || !canRun()) return;
      running = true;
      last = 0;
      if (fine && !loop.lite) {
        refs.skyline?.style.setProperty("will-change", "transform");
        refs.crane?.style.setProperty("will-change", "transform");
      }
      raf = window.requestAnimationFrame(tick);
    };

    const sleep = () => {
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      running = false;
      last = 0;
    };

    loop.impulse = (deg: number) => {
      if (!canRun()) return false;
      velocity += deg * 0.33;
      wake();
      return true;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer = { x: event.clientX, y: event.clientY };
      if (!loop.lite) wake();
    };
    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) wake();
      else sleep();
    };
    const measure = () => {
      rect = stage.getBoundingClientRect();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        onscreen = entry.intersectionRatio >= 0.05;
        if (onscreen) {
          stage.removeAttribute("data-offscreen");
          wake();
        } else {
          stage.setAttribute("data-offscreen", "");
          sleep();
        }
      },
      { threshold: [0, 0.05, 0.2] },
    );
    io.observe(stage);
    const ro = new ResizeObserver(measure);
    ro.observe(stage);

    // One short probe on every device, touch screens included, since the loop itself runs
    // only while something moves: about 60 frames just after the page is up.
    let probe = 0;
    let probeLast = 0;
    let probeSum = 0;
    let probeCount = 0;
    const probeTick = (now: number) => {
      probe = 0;
      if (loop.lite) return;
      if (canRun() && probeLast) {
        const dt = now - probeLast;
        if (dt < 200) {
          probeSum += dt;
          probeCount += 1;
        }
      }
      probeLast = canRun() ? now : 0;
      if (probeCount >= PROBE) {
        if (probeSum / probeCount > SLOW_FRAME_MS) goLite();
        return;
      }
      probe = window.requestAnimationFrame(probeTick);
    };
    probe = window.requestAnimationFrame(probeTick);

    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      sleep();
      if (probe) window.cancelAnimationFrame(probe);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", measure);
      document.removeEventListener("visibilitychange", onVisibility);
      loop.impulse = () => false;
      refs.skyline?.style.removeProperty("will-change");
      refs.crane?.style.removeProperty("will-change");
    };
  }, [stageRef, refs, enabled]);

  return api;
}
