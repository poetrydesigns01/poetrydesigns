// A tick as it is chalked on a delivered stack: one stroke, drawn by hand. It is always
// decoration; the words beside it say what happened.

const CHALK_EASE = "cubic-bezier(0.2, 0.7, 0.2, 1)";

export function ChalkTick({ className = "size-4 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} data-chalk-tick="" aria-hidden="true" focusable="false" fill="none">
      {/* The path counts as one unit long and carries one dash of that length, so the
          offset alone can draw it. */}
      <path
        d="M2.6 8.6c1.3 1 2.5 2.3 3.5 3.9 1.8-3.5 4.2-6.5 7.3-9"
        pathLength={1}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ strokeDasharray: "1 1" }}
      />
    </svg>
  );
}

/**
 * Draws the first tick inside `within`, once. Call it from a pointer's click handler after
 * the tick is on the page; never for a keyboard action or under reduced motion.
 */
export function drawTick(within: Element | null | undefined, ms = 180): void {
  const path = within?.querySelector("[data-chalk-tick] path");
  if (!path || typeof path.animate !== "function") return;
  path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ms, easing: CHALK_EASE });
}

/**
 * A row that has just been added arrives from 6 px above. Its tick is simply there: only
 * one tick is drawn for one action, and the caller chooses which with drawTick.
 */
export function chalkIn(row: Element | null | undefined): void {
  if (!row || typeof row.animate !== "function") return;
  row.animate(
    [
      { opacity: 0, transform: "translateY(-6px)" },
      { opacity: 1, transform: "none" },
    ],
    { duration: 160, easing: CHALK_EASE },
  );
}
