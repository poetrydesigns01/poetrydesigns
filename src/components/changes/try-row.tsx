"use client";

import { useDemo } from "@/lib/demo-store";
import type { ProjectedChange } from "@/lib/projection";

/**
 * Puts a change on the house to see what it would do, or takes it off again. Nothing is
 * added to the home by this. The whole row is the switch. What the change adds is said once,
 * on its sheet, so the switch says only what it does.
 */
export function TryRow({ change }: { change: ProjectedChange }) {
  const { setTrying } = useDemo();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={change.trying}
      disabled={change.status !== "pending"}
      className="try-switch"
      onClick={() => setTrying(change.id, !change.trying)}
    >
      <span className="try-switch-words">
        <span className="try-switch-label">
          {change.trying ? `Trying ${change.short}. Tap to take it off.` : `Try ${change.short} on the house`}
        </span>
      </span>
      {/* A loose block that sits in the left slot when off and the right slot when on. */}
      <span className="try-switch-track" aria-hidden="true">
        <span className="try-switch-block loose" />
      </span>
    </button>
  );
}
