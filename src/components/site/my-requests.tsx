/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm, useViewer } from "@/lib/demo-store";
import type { RequestView } from "@/lib/firm";
import { formatShortDate } from "@/lib/format";
import { Segmented, StatStrip, procurementDays, requestStatus, requestTitle } from "./site-kit";
import "./site.css";

// Every request this person raised, as a status list: where each stands, and how long
// procurement took to order it (or has been sitting on it).

type Filter = "open" | "delivered" | "all";

function Row({ r }: { r: RequestView }) {
  const firm = useFirm();
  const s = requestStatus(r);
  const days = procurementDays(r);
  const ordered = r.pos.length > 0;
  return (
    <li className="glass-row">
      <Link href={`/staff/site/requests/${r.no}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_8rem_7rem_auto]">
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate text-15 font-semibold text-ink">{requestTitle(r, firm)}</span>
          <span className="truncate text-13 text-ink-soft">
            {r.no.replace("MR-2026-", "MR ")} · {r.projectName}
          </span>
        </span>
        <span className="col-start-2 row-start-1 justify-self-end sm:col-start-4">
          <StatusChip tone={s.tone}>{s.words}</StatusChip>
        </span>
        <span className="text-13 text-ink-soft sm:col-start-2 sm:row-start-1 sm:text-15">
          {r.queued ? (
            "Not sent"
          ) : ordered ? (
            <>
              PO in <span className="figure text-ink">{days} d</span>
            </>
          ) : (
            <span className={days > 3 ? "late-text" : "text-ink"}>
              <span className="figure">{days} d</span> waiting
            </span>
          )}
        </span>
        <span className="text-13 text-ink-soft sm:col-start-3 sm:row-start-1 sm:text-15">
          {r.status === "Delivered" && r.deliveredAt ? `In ${formatShortDate(r.deliveredAt)}` : `Need ${formatShortDate(r.neededBy)}`}
          {r.late && r.status !== "Delivered" && <span className="late-text"> · late</span>}
        </span>
      </Link>
    </li>
  );
}

export function MyRequests() {
  const firm = useFirm();
  const me = useViewer("site");
  const [filter, setFilter] = useState<Filter>("open");
  const mine = firm.requests.filter((r) => r.by === me.id).sort((a, b) => b.at.localeCompare(a.at) || b.no.localeCompare(a.no));
  const open = mine.filter((r) => r.status !== "Delivered");
  const delivered = mine.filter((r) => r.status === "Delivered");
  const waiting = open.filter((r) => r.pos.length === 0 && !r.queued);
  const ordered = mine.filter((r) => r.pos.length > 0);
  const avg = ordered.length > 0 ? Math.round((ordered.reduce((sum, r) => sum + procurementDays(r), 0) / ordered.length) * 10) / 10 : 0;
  const slow = waiting.filter((r) => procurementDays(r) > 3).length;
  const lists: Record<Filter, RequestView[]> = { open, delivered, all: mine };
  const shown = lists[filter];
  const options: { id: Filter; label: string }[] = [
    { id: "open", label: "Open" },
    { id: "delivered", label: "Delivered" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="site-screen">
      <StaffBoard place="My requests" headline={mine.length === 0 ? "No requests yet" : open.length === 0 ? "All delivered" : `${open.length} open`} chip={false} />

      <StatStrip
        label="Procurement"
        items={[
          { icon: "box", label: "Open", value: open.length },
          { icon: "truck", label: "Awaiting PO", value: waiting.length },
          { icon: "clock", label: "Over 3 days", value: slow, alert: slow > 0 },
          { icon: "calendar", label: "Avg days to PO", value: avg },
        ]}
      />

      <Segmented
        label="Show"
        value={filter}
        onChange={setFilter}
        options={options.map((o) => ({ ...o, count: lists[o.id].length }))}
      />

      <section aria-label="Requests" className="glass p-1.5 sm:p-2">
        {shown.length === 0 ? (
          <p className="px-3 py-3 text-15 text-ink-soft">None</p>
        ) : (
          <ul className="grid gap-0.5">
            {shown.map((r) => (
              <Row key={r.no} r={r} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
