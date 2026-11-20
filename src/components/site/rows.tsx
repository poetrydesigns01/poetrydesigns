/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import type { Ref } from "react";
import { usePause } from "@/components/register/recording-pause";
import { useDemo } from "@/lib/demo-store";
import type { RequestView } from "@/lib/firm";
import type { PersonId } from "@/lib/firm-data";
import { Icon } from "./site-kit";

// A delivery to mark, with one press. Handing in a task and reviewing a junior's hand-in are
// in components/shared/task-action.tsx, on Today's rows and the task list.

/** "Mark delivered" for a request whose order is on its way. One press, then the pause. */
export function DeliveredButton({
  request,
  person,
  primary = false,
  ref,
}: {
  request: RequestView;
  person: PersonId;
  primary?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  const demo = useDemo();
  const pause = usePause();
  return (
    <button
      ref={ref}
      type="button"
      className={`btn ${primary ? "btn-primary" : "btn-glass"} gap-2 btn-sm`}
      aria-disabled={pause.pending !== null ? true : undefined}
      onClick={(event) => {
        if (pause.pending !== null) return;
        const { record } = demo;
        pause.start({
          what: `${request.no}, delivered`,
          origin: event.currentTarget,
          commit: () => record({ kind: "request.delivered", no: request.no, by: person }),
        });
      }}
    >
      <Icon name="truck" className="size-4.5" />
      {primary ? "Mark delivered" : "Delivered"}
    </button>
  );
}
