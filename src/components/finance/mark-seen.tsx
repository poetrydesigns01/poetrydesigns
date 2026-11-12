"use client";

import { usePause } from "@/components/register/recording-pause";
import { useDemo } from "@/lib/demo-store";
import type { PersonId } from "@/lib/firm-data";
import { focusReturn } from "./focus-return";

// "Mark seen": one tap, then the five-second pause, then the request is stamped Seen and
// the site engineer's ladder moves on. The button is set aside (not disabled) while a pause
// runs, so Cancel can hand focus back to it.

export function MarkSeen({
  no,
  person,
  primary = false,
  className = "",
}: {
  no: string;
  person: PersonId;
  primary?: boolean;
  className?: string;
}) {
  const demo = useDemo();
  const pause = usePause();
  return (
    <button
      type="button"
      className={`btn ${primary ? "btn-primary" : "btn-quiet"} ${className}`}
      aria-disabled={pause.pending !== null}
      onClick={(event) => {
        if (pause.pending !== null) return;
        const { record } = demo;
        // Once seen, this button leaves its row: focus follows the row to where it now sits.
        const restore = focusReturn(event.currentTarget, `mr:${no}`);
        pause.start({
          what: `${no}, marked seen`,
          origin: event.currentTarget,
          commit: () => {
            record({ kind: "request.seen", no, by: person });
            restore();
          },
        });
      }}
    >
      Mark seen
    </button>
  );
}

/** "Divya Shenoy records money in. See it as Divya": the way across to the person who does it. */
export function SeeAsLine({
  words,
  person,
}: {
  words: string;
  person: { id: "prakash" | "divya"; first: string };
}) {
  const demo = useDemo();
  return (
    <p className="text-15 text-ink-soft">
      {words}{" "}
      <button
        type="button"
        className="link inline-flex min-h-11 cursor-pointer items-center text-ink"
        onClick={() => demo.setViewer("finance", person.id)}
      >
        See it as {person.first}
      </button>
    </p>
  );
}
