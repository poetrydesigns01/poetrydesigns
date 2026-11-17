/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useState } from "react";
import { StatusChip } from "@/components/register/status-chip";
import { useDemo, useProjection } from "@/lib/demo-store";
import { formatStampShort, inr } from "@/lib/format";

// A proposal from the Project Head to pay one stage in two parts. It shows only while it
// waits for the client, or once she has answered, with her answer and its time.

export function SplitCard() {
  const demo = useDemo();
  const change = useProjection().scheduleChange;
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  const commentId = useId();
  if (!change) return null;

  const decided = [...demo.events].reverse().find((e) => e.kind === "schedule.decided" && e.projectId === "iyer" && e.n === change.n);

  return (
    <section id="schedule-change" className="glass grid scroll-mt-24 gap-3 p-4 sm:p-5" aria-labelledby="split-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="split-heading" className="text-17 font-semibold">
          Instalment {change.n} in two parts
        </h2>
        <StatusChip tone={change.status === "approved" ? "done" : "waiting"}>
          {change.status === "approved" ? "Approved" : change.status === "changes-asked" ? "Changes asked" : "Your approval"}
        </StatusChip>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:max-w-md">
        {change.totals.map((total, i) => (
          <div key={i} className="glass-inner p-3">
            <p className="lettering text-ink-soft">
              {change.n}
              {i === 0 ? "a" : "b"} · {change.parts[i]}%
            </p>
            <p className="figure text-17">{inr(total)}</p>
          </div>
        ))}
      </div>
      {change.status === "waiting" ? (
        asking ? (
          <form
            className="grid gap-2 sm:max-w-xl"
            onSubmit={(event) => {
              event.preventDefault();
              if (!comment.trim()) return;
              demo.record({ kind: "schedule.decided", projectId: "iyer", n: change.n, status: "changes-asked", comment: comment.trim(), by: "meera" });
              setAsking(false);
            }}
          >
            <label htmlFor={commentId} className="text-13 font-semibold">
              What should change?
            </label>
            <textarea
              id={commentId}
              rows={2}
              className="glass-field w-full px-3 py-2 text-17 text-ink"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-glass min-h-11" aria-disabled={!comment.trim() || undefined}>
                Send
              </button>
              <button type="button" className="btn btn-glass min-h-11" onClick={() => setAsking(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-glass min-h-11"
              onClick={() => demo.record({ kind: "schedule.decided", projectId: "iyer", n: change.n, status: "approved", by: "meera" })}
            >
              Approve split
            </button>
            <button type="button" className="btn btn-glass min-h-11" onClick={() => setAsking(true)}>
              Modify
            </button>
          </div>
        )
      ) : (
        decided && <p className="text-13 text-ink-soft">{formatStampShort(decided.at)}</p>
      )}
    </section>
  );
}
