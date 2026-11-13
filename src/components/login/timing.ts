// Small helpers for the sign-in motion. Everything here runs in handlers, timers and
// frames, never during render.

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/** True when the person has asked their device for less motion. */
export function reducedNow(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_QUERY).matches;
}

/** A small or slow device: fewer things move at once. */
export function modestDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 640 || (navigator.hardwareConcurrency ?? 8) <= 4;
}

/** The project's own curves, for animations started from script. */
export const EASE = {
  teak: "cubic-bezier(0.45, 0, 0.15, 1)",
  lime: "cubic-bezier(0.2, 0.7, 0.2, 1)",
  lay: "cubic-bezier(0.5, 0, 1, 0.6)",
  trowel: "cubic-bezier(0.65, 0, 0.2, 1)",
  brass: "linear(0, 0.62 28%, 1.045 60%, 0.99 82%, 1)",
  arc: "cubic-bezier(0.2, 0.7, 0.2, 1)",
};

/** A set of timers that can all be cleared at once. */
export class Timers {
  private ids = new Set<number>();

  after(ms: number, run: () => void): number {
    const id = window.setTimeout(() => {
      this.ids.delete(id);
      run();
    }, ms);
    this.ids.add(id);
    return id;
  }

  cancel(id: number) {
    window.clearTimeout(id);
    this.ids.delete(id);
  }

  clear() {
    for (const id of this.ids) window.clearTimeout(id);
    this.ids.clear();
  }
}
