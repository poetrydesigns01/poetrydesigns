/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useState } from "react";
import { Segments, StatCard, StatRow } from "@/components/admin/glass-kit";
import { useScope } from "@/components/register/project-switch";
import { StaffBoard } from "@/components/register/staff-board";
import { TODAY } from "@/lib/demo-data";
import { useFirm, useViewer } from "@/lib/demo-store";
import { WEEK } from "@/lib/firm-data";
import { datePart } from "@/lib/format";
import { RequestGroups } from "./request-groups";
import { responseDays } from "./request-words";
import { inScope } from "./shared";
import { WorkOrders } from "./work-orders";

// Procurement's inbox: every material request from the sites, grouped by project and by
// the milestone task it is for, with how long each has waited in its status and how
// quickly each project's requests get their PO. A new one is marked seen from its row; the
// others open their page, where the Zoho PO is linked. Labour (work orders) has its own tab.

type View = "open" | "ordered" | "delivered" | "labour";

export function RequestInbox() {
  const firm = useFirm();
  const me = useViewer("finance");
  const scope = useScope("finance");
  const [view, setView] = useState<View>("open");

  const all = inScope(
    firm.requests.filter((r) => !r.queued),
    scope,
  ).sort((a, b) => b.days - a.days || a.no.localeCompare(b.no));
  const open = all.filter((r) => r.status === "New" || r.status === "Seen" || r.status === "PO in part");
  const ordered = all.filter((r) => r.status === "PO uploaded");
  const delivered = all.filter(
    (r) => r.status === "Delivered" && r.deliveredAt && datePart(r.deliveredAt) >= WEEK.previousFrom && datePart(r.deliveredAt) <= TODAY,
  );
  const fresh = open.filter((r) => r.status === "New").length;
  const late = open.filter((r) => r.late).length;
  const answered = all.map(responseDays).filter((d): d is number => d !== null);
  const average = answered.length > 0 ? answered.reduce((t, d) => t + d, 0) / answered.length : 0;
  const crews = inScope(firm.workOrders, scope).filter((w) => w.status === "requested");

  const rows = view === "open" ? open : view === "ordered" ? ordered : delivered;

  return (
    <>
      <StaffBoard place="Requests" headline={open.length === 0 ? "Every request has a PO" : `${open.length} waiting on a PO`} />

      <div className="mt-6 grid gap-5">
        <StatRow cols={4} label="Procurement at a glance">
          <StatCard label="Waiting on PO" value={open.length} icon="box" />
          <StatCard label="Not seen" value={fresh} icon="clock" tone={fresh > 0 ? "late" : undefined} />
          <StatCard label="Late for site" value={late} icon="alert" tone={late > 0 ? "late" : undefined} />
          <StatCard
            label="Days to PO"
            value={answered.length > 0 ? average.toFixed(1) : "–"}
            sub={`Average of ${answered.length}`}
            icon="chart"
          />
        </StatRow>

        <Segments<View>
          label="Show"
          value={view}
          onChange={setView}
          options={[
            { id: "open", label: "Open", count: open.length },
            { id: "ordered", label: "PO sent", count: ordered.length },
            { id: "delivered", label: "Delivered", count: delivered.length },
            { id: "labour", label: "Labour", count: crews.length },
          ]}
        />

        {view === "labour" ? (
          <WorkOrders scope={scope} person={me.id} />
        ) : (
          <RequestGroups
            rows={rows}
            person={me.id}
            empty={view === "open" ? "Every request has its PO." : "Nothing here yet."}
          />
        )}
      </div>
    </>
  );
}
