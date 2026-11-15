"use client";

import Link from "next/link";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { MaterialReport } from "@/components/reports/material-report";
import { useFirm, useViewer } from "@/lib/demo-store";
import type { RequestView } from "@/lib/firm";
import { formatShortDate, formatStampShort } from "@/lib/format";
import { DeliveredButton } from "./rows";
import { Icon, PanelHead, procurementDays, requestStatus, requestTitle, taskOfRequest } from "./site-kit";
import "./site.css";

// One request as the site engineer follows it: four steps with their dates, how long
// procurement took, each line with its PO and the vendor's number, and the delivery mark.

function Steps({ r }: { r: RequestView }) {
  const firstPo = r.pos.map((po) => po.at).sort()[0];
  const steps = [
    { label: "Sent", at: r.queued ? undefined : r.sentAt || r.at },
    { label: "Seen", at: r.seenAt ?? (firstPo ? firstPo : undefined) },
    { label: "PO", at: firstPo },
    { label: "Delivered", at: r.deliveredAt },
  ];
  const reached = steps.filter((s) => s.at).length;
  return (
    <ol className="grid grid-cols-4" aria-label="Progress">
      {steps.map((s, i) => {
        const done = Boolean(s.at);
        return (
          <li key={s.label} className="relative grid justify-items-center gap-1.5 text-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-3.5 right-1/2 -left-1/2 h-0.5 ${i < reached ? "bg-kota" : "bg-ink/15"}`}
              />
            )}
            <span
              className={`relative grid size-7 place-items-center rounded-full border-2 ${
                done ? "border-kota bg-kota text-paper" : "border-ink/20 bg-white/70 text-ink-soft"
              }`}
            >
              {done ? <Icon name="check" className="size-4" /> : <span className="figure text-13">{i + 1}</span>}
            </span>
            <span className="text-13 font-semibold text-ink">{s.label}</span>
            <span className="text-13 text-ink-soft">{s.at ? formatShortDate(s.at) : "—"}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function RequestDetail({ no }: { no: string }) {
  const firm = useFirm();
  const me = useViewer("site");
  const request = firm.requests.find((r) => r.no === no);
  const back = { label: "My requests", href: "/staff/site/requests" };

  if (!request) {
    return (
      <div className="site-screen">
        <StaffBoard place="Request" headline={no} chip={false} back={back} />
        <p className="glass px-4 py-3 text-15 text-ink">Not raised yet</p>
      </div>
    );
  }

  const s = requestStatus(request);
  const days = procurementDays(request);
  const ordered = request.pos.length > 0;
  const delivered = Boolean(request.deliveredAt);
  const canDeliver = !delivered && !request.queued && ordered;
  const task = taskOfRequest(request, firm, request.projectId);
  const raiser = firm.person(request.by);

  return (
    <div className="site-screen">
      <StaffBoard place={request.no} headline={requestTitle(request, firm)} chip={false} back={back} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          <section className="glass-strong grid gap-5 p-4 sm:p-6" aria-label="Status">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone={s.tone}>{s.words}</StatusChip>
                {request.late && !delivered && <StatusChip tone="late">Late for site</StatusChip>}
              </div>
              <p className="text-15 text-ink">
                {ordered ? "PO in " : "Waiting "}
                <span className={`figure ${!ordered && days > 3 ? "late-text" : ""}`}>{days} d</span>
              </p>
            </div>
            <Steps r={request} />
            {canDeliver && <DeliveredButton request={request} person={me.id} primary />}
          </section>

          <section className="glass p-2 sm:p-3" aria-labelledby="lines-title">
            <PanelHead id="lines-title" title="Items" icon="box" count={request.lines.length} />
            <ul className="grid gap-1">
              {request.lines.map((line) => {
                const item = firm.catalogueAll.find((c) => c.id === line.material);
                const pos = request.pos.filter((po) => po.lines.some((l) => l.lineId === line.id));
                return (
                  <li key={line.id} className="glass-row grid gap-1.5 px-3 py-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-15 text-ink">
                        {(item?.name ?? line.material).replace(/\s*\(.*\)$/, "")}, {line.sub}
                      </span>
                      <span className="figure shrink-0 text-15 text-ink">
                        {line.qty.toLocaleString("en-IN")} {line.unit}
                      </span>
                    </div>
                    {pos.length === 0 ? (
                      <p className="text-13 text-ink-soft">No PO yet</p>
                    ) : (
                      pos.map((po) => {
                        const vendor = firm.vendors.find((v) => v.id === po.vendorId);
                        const qty = po.lines.find((l) => l.lineId === line.id)?.qty ?? 0;
                        return (
                          <p key={po.no} className="flex flex-wrap items-center gap-x-2 text-13 text-ink-soft">
                            <span className="figure text-ink">{po.no.replace("PO-2026-", "PO ")}</span>
                            <span>
                              {vendor?.name ?? po.vendor} · {qty.toLocaleString("en-IN")} {line.unit}
                            </span>
                            {vendor && (
                              <a href={`tel:${vendor.phone.replace(/\s/g, "")}`} className="link inline-flex min-h-11 items-center text-ink">
                                {vendor.phone}
                              </a>
                            )}
                          </p>
                        );
                      })
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className="glass grid gap-1 p-2 sm:p-3" aria-label="Details">
          <dl className="grid gap-0.5">
            {[
              ["Site", request.projectName],
              ["Task", task ? task.title : "—"],
              ["Need", formatShortDate(request.neededBy)],
              ["By", raiser?.name ?? request.by],
              ["Raised", formatStampShort(request.at)],
            ].map(([k, v]) => (
              <div key={k} className="glass-row flex items-center justify-between gap-3 px-3 py-2.5">
                <dt className="lettering text-ink-soft">{k}</dt>
                <dd className="min-w-0 text-right text-15 text-ink">
                  {k === "Task" && task ? (
                    <Link href="/staff/site/tasks" className="link inline-flex min-h-11 items-center">
                      {v}
                    </Link>
                  ) : (
                    v
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <details className="group px-1 pb-1">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2 text-15 font-semibold text-ink hover:bg-white/50">
              <span className="flex items-center gap-2">
                <Icon name="sheet" className="size-5 text-laterite" />
                Requirement report
              </span>
              <Icon name="chevron" className="size-5 text-ink-soft transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-2 overflow-x-auto">
              <MaterialReport no={request.no} />
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
