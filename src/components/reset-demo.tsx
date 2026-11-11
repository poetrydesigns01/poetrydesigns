"use client";

import { useState } from "react";

/** Clears the decisions made in this tab, so the demo can be shown again from the start. */
export function ResetDemo() {
  const [done, setDone] = useState(false);

  return (
    <p className="mt-10 text-lime/80">
      <button
        type="button"
        className="link"
        onClick={() => {
          try {
            window.sessionStorage.removeItem("poetry-demo-state");
          } catch {
            // Nothing to clear when storage is unavailable.
          }
          setDone(true);
        }}
      >
        Start the demo again
      </button>
      {done && <span role="status"> The demo is back to its starting point.</span>}
    </p>
  );
}
