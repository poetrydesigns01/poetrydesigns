"use client";

import { useState } from "react";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { LogTime } from "@/components/tasks/log-time";
import { TaskSheet } from "@/components/tasks/task-sheet";
import { WeekGrid } from "@/components/tasks/week-grid";
import { TODAY } from "@/lib/demo-data";
import { useFirm } from "@/lib/demo-store";
import { hours, weekdayDate } from "@/lib/format";
import { useArchitect } from "./common";

// The architect's own work: the task sheet at the left, the week's hours at the right, and
// time logged inline. Time with a client is a consultation and comes off that client's
// advisory hours; logging is never blocked.

export function ArchitectTasks() {
  const firm = useFirm();
  const pause = usePause();
  const me = useArchitect();
  const [logging, setLogging] = useState(false);
  const logged = firm.hoursThisWeek(me.id);

  const close = () => {
    // The panel's own pause carries no row; cancel it before the panel goes.
    if (pause.pending !== null && pause.pending.rowId === null) pause.cancel();
    setLogging(false);
  };

  return (
    <>
      <StaffBoard
        place="Tasks"
        headline={`Your work for ${weekdayDate(TODAY)}`}
        state={logged > 0 ? `You have logged ${hours(logged)} this week.` : "You have not logged time this week yet."}
        primary={logging ? undefined : { label: "Log time", onClick: () => setLogging(true) }}
      />
      <div className="staff-columns mt-8">
        <div className="min-w-0">
          <TaskSheet person={me.id} projectScope={me.scope} logTime={false} />
        </div>
        <div className={`grid min-w-0 content-start gap-10 ${logging ? "order-first min-[1200px]:order-none" : ""}`}>
          {logging && (
            <section aria-label="Log time" className="order-first grid gap-3 min-[1200px]:order-last">
              <div className="flex items-center justify-between gap-4 border-b border-ink pb-2">
                <h2 className="text-17 font-semibold lg:text-22">Log time</h2>
                <button type="button" className="btn btn-quiet" onClick={close}>
                  Close
                </button>
              </div>
              <LogTime person={me.id} onDone={() => setLogging(false)} />
            </section>
          )}
          <WeekGrid person={me.id} total={false} />
        </div>
      </div>
    </>
  );
}
