/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { GlassTable, Icon, Meter, Panel } from "@/components/admin/glass-kit";
import { field } from "@/components/register/chips";
import { DropZone } from "@/components/register/drop-zone";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { MaterialReport } from "@/components/reports/material-report";
import { FactRow, RequestSteps } from "@/components/site/site-kit";
import { stampNow } from "@/lib/clock";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm, useViewer } from "@/lib/demo-store";
import type { PoView, RequestView } from "@/lib/firm";
import type { PersonId, Vendor } from "@/lib/firm-data";
import { datePart, daysBetween, formatShortDate, formatStampShort, inr } from "@/lib/format";
import { MarkSeen, SeeAsLine } from "./mark-seen";
import { WaitingChip, requestChip } from "./request-words";
import { numberFrom, perUnit, procuresFor, rateWords } from "./shared";
import { WorkOrders } from "./work-orders";

// One material request, for procurement. At the left what the site asked for and how much
// is ordered; at the right the Zoho PO: the file, its number, the vendor (with the last
// rate for this material), quantity, rate and GST per line, and the totals. A PO that
// covers part of a line leaves the rest to order, and another PO can be linked for it.
// Labour for the same site task is booked from here too.

/** A vendor's last rate for a request line: the same size first, then any size of it. */
function rateFor(vendor: Vendor | undefined, material: string, sub: string) {
  if (!vendor) return undefined;
  return vendor.rates.find((r) => r.material === material && r.sub === sub) ?? vendor.rates.find((r) => r.material === material);
}

type LineDraft = { qty?: string; rate?: string; gst?: string };

function LinkPo({ request, person }: { request: RequestView; person: PersonId }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const submitRef = useRef<HTMLButtonElement>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [poNo, setPoNo] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [lines, setLines] = useState<Record<string, LineDraft>>({});
  const [errors, setErrors] = useState<{ files?: string; poNo?: string; vendor?: string; lines?: string }>({});

  const open = request.lines.filter((l) => (request.ordered[l.id] ?? 0) < l.qty);
  const first = open[0] ?? request.lines[0];
  // Vendors who have sold this material, the most recent rate first; then the rest.
  const live = firm.vendors.filter((v) => !v.deleted);
  const selling = live
    .filter((v) => request.lines.some((l) => rateFor(v, l.material, l.sub)))
    .sort((a, b) => (rateFor(b, first.material, first.sub)?.on ?? "").localeCompare(rateFor(a, first.material, first.sub)?.on ?? ""));
  const others = live.filter((v) => !selling.includes(v));
  const chosenId = vendorId ?? selling[0]?.id ?? "";
  const vendor = live.find((v) => v.id === chosenId);
  const number = poNo ?? firm.nextPoNo;

  const valueOf = (lineId: string) => {
    const line = request.lines.find((l) => l.id === lineId);
    const d = lines[lineId] ?? {};
    const left = line ? line.qty - (request.ordered[lineId] ?? 0) : 0;
    const rate = line ? rateFor(vendor, line.material, line.sub)?.rate : undefined;
    return {
      qtyText: d.qty ?? String(left),
      rateText: d.rate ?? (rate !== undefined ? String(rate) : ""),
      gstText: d.gst ?? "18",
      left,
    };
  };
  const setLine = (lineId: string, patch: LineDraft) => setLines((all) => ({ ...all, [lineId]: { ...all[lineId], ...patch } }));

  const priced = open.map((line) => {
    const v = valueOf(line.id);
    return { line, v, qty: numberFrom(v.qtyText), rate: numberFrom(v.rateText), gst: numberFrom(v.gstText) };
  });
  const counted = priced.filter((p) => Number.isFinite(p.qty) && p.qty > 0 && Number.isFinite(p.rate) && Number.isFinite(p.gst));
  const before = Math.round(counted.reduce((t, p) => t + p.qty * p.rate, 0));
  const gstTotal = Math.round(counted.reduce((t, p) => t + (p.qty * p.rate * p.gst) / 100, 0));

  const chooseVendor = (id: string) => {
    setVendorId(id);
    // A new vendor brings its own last rates.
    setLines((all) => Object.fromEntries(Object.entries(all).map(([k, d]) => [k, { ...d, rate: undefined }])));
  };

  const submit = () => {
    if (pause.pending !== null) return;
    const next: typeof errors = {};
    if (files.length === 0) next.files = "Choose the PO file.";
    if (!/^PO-\d{4}-\d{4}$/.test(number)) next.poNo = "As in Zoho Books, like PO-2026-0422.";
    else if (firm.pos.some((po) => po.no === number)) next.poNo = `${number} is already linked.`;
    if (!vendor) next.vendor = "Choose the vendor.";
    const ordering = priced.filter((p) => p.v.qtyText.trim() !== "" && p.v.qtyText.trim() !== "0");
    if (ordering.length === 0) next.lines = "Write a quantity on at least one line.";
    for (const p of ordering) {
      const unit = p.line.unit;
      if (!Number.isFinite(p.qty) || p.qty <= 0) next.lines = `Quantity of ${p.line.sub}, in ${unit}.`;
      else if (p.qty > p.v.left) next.lines = `Only ${p.v.left.toLocaleString("en-IN")} ${unit} of ${p.line.sub} is left to order.`;
      else if (!Number.isFinite(p.rate) || p.rate <= 0) next.lines = `Rate before GST for ${p.line.sub}.`;
      else if (!Number.isFinite(p.gst) || p.gst < 0 || p.gst > 28) next.lines = `GST for ${p.line.sub}, as a percentage.`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !vendor) return;

    const { record } = demo;
    const po = {
      no: number,
      requestNo: request.no,
      projectId: request.projectId,
      n: request.n,
      vendorId: vendor.id,
      by: person,
      lines: ordering.map((p) => ({ lineId: p.line.id, qty: p.qty, rate: p.rate, gstPercent: p.gst })),
      file: `${files[0]} (sample)`,
    };
    pause.start({
      what: `${number} linked to ${request.no}`,
      origin: submitRef.current,
      commit: () => {
        record({ kind: "po.linked", po: { ...po, at: stampNow() }, by: person });
        setFiles([]);
        setPoNo(null);
        setVendorId(null);
        setLines({});
        setErrors({});
      },
    });
  };

  const last = vendor ? rateFor(vendor, first.material, first.sub) : undefined;

  return (
    <form
      className="@container grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div>
        <DropZone
          label="PO from Zoho Books"
          samples={[`${number}.pdf`]}
          accept="pdf"
          chosen={files}
          onChoose={(chosen) => {
            setFiles(chosen);
            setErrors((e) => ({ ...e, files: undefined }));
          }}
        />
        {errors.files && (
          <p className="mt-1.5 text-15 font-semibold text-brick" role="alert">
            {errors.files}
          </p>
        )}
      </div>
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="PO number" error={errors.poNo}>
          <input
            className={field}
            autoComplete="off"
            value={number}
            aria-invalid={errors.poNo ? true : undefined}
            onChange={(event) => setPoNo(event.target.value)}
          />
        </Field>
        <Field
          label="Vendor"
          hint={last ? `Last ${rateWords(last.rate)} ${perUnit(last.unit)}, ${formatShortDate(last.on)}` : undefined}
          error={errors.vendor}
        >
          <select className={field} value={chosenId} onChange={(event) => chooseVendor(event.target.value)}>
            <option value="">Choose</option>
            <optgroup label="Sold this before">
              {selling.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </optgroup>
            {others.length > 0 && (
              <optgroup label="Other vendors">
                {others.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>
      </div>

      <div className="grid gap-3">
        {priced.map(({ line, v }) => {
          const item = firm.catalogue.find((c) => c.id === line.material);
          return (
            <fieldset key={line.id} className="glass-inner grid gap-3 p-3">
              <legend className="sr-only">
                {item?.name ?? line.material}, {line.sub}
              </legend>
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-15">
                <span className="font-semibold">
                  {item?.name ?? line.material}, {line.sub}
                </span>
                <span className="text-13 text-ink-soft">
                  {v.left.toLocaleString("en-IN")} {line.unit} left
                </span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Field label={`Qty, ${line.unit}`}>
                  <input
                    className={field}
                    inputMode="decimal"
                    autoComplete="off"
                    value={v.qtyText}
                    onChange={(event) => setLine(line.id, { qty: event.target.value })}
                  />
                </Field>
                <Field label="Rate">
                  <input
                    className={field}
                    inputMode="decimal"
                    autoComplete="off"
                    value={v.rateText}
                    onChange={(event) => setLine(line.id, { rate: event.target.value })}
                  />
                </Field>
                <Field label="GST %">
                  <input
                    className={field}
                    inputMode="numeric"
                    autoComplete="off"
                    value={v.gstText}
                    onChange={(event) => setLine(line.id, { gst: event.target.value })}
                  />
                </Field>
              </div>
            </fieldset>
          );
        })}
        {errors.lines && (
          <p className="text-15 font-semibold text-brick" role="alert">
            {errors.lines}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <Total label="Before GST" value={inr(before)} />
        <Total label="GST" value={inr(gstTotal)} />
        <Total label="Total" value={inr(before + gstTotal)} strong />
      </dl>

      <div>
        <button ref={submitRef} type="submit" className="btn btn-primary min-h-12 w-full sm:w-auto" aria-disabled={pause.pending !== null}>
          Link PO
        </button>
      </div>
    </form>
  );
}

function Total({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="glass-inner min-w-0 px-3 py-2">
      <dt className="lettering text-ink-soft">{label}</dt>
      <dd className={`figure truncate text-17 ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}

function MarkDelivered({ request, person }: { request: RequestView; person: PersonId }) {
  const demo = useDemo();
  const pause = usePause();
  return (
    <button
      type="button"
      className="btn btn-primary min-h-12 w-full sm:w-auto"
      aria-disabled={pause.pending !== null}
      onClick={(event) => {
        if (pause.pending !== null) return;
        const { record } = demo;
        pause.start({
          what: `${request.no}, marked delivered`,
          origin: event.currentTarget,
          commit: () => record({ kind: "request.delivered", no: request.no, by: person }),
        });
      }}
    >
      Mark delivered
    </button>
  );
}

export function RequestDetail({ no }: { no: string }) {
  const firm = useFirm();
  const me = useViewer("finance");
  const request = firm.requests.find((r) => r.no === no);
  const back = { label: "Back to requests", href: "/staff/finance/requests" };

  if (!request || request.queued) {
    return (
      <StaffBoard
        place="Requests"
        headline="Not raised yet"
        state={request?.queued ? "Saved on the site phone; it goes out with the signal." : undefined}
        chip={false}
        back={back}
      />
    );
  }

  const project = firm.project(request.projectId);
  const raiser = firm.person(request.by);
  const canBuy = procuresFor(me.id, project);
  // Who to hand over to: someone in this site's procurement the demo can show, else the first.
  const team = project?.team.procurement ?? ["prakash"];
  const buyer = firm.person(team.find((id) => id === "prakash" || id === "divya") ?? team[0]);
  const left = daysBetween(TODAY, request.neededBy);
  const open = request.status !== "Delivered";

  const heading =
    request.status === "PO in part"
      ? "Link another PO"
      : request.status === "New" || request.status === "Seen"
        ? "Zoho PO"
        : request.status === "PO uploaded"
          ? "Delivery"
          : "Delivered";

  return (
    <>
      <StaffBoard
        place="Requests"
        headline={request.no}
        state={`${request.projectName} · Milestone ${request.n}`}
        chip={false}
        back={back}
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-12">
        <div className="grid content-start gap-5 lg:col-span-5">
          <Panel title="Request" aside={requestChip(request, { late: false })}>
            <div className="px-1 pb-4">
              <RequestSteps r={request} />
            </div>
            <dl className="grid gap-0.5">
              <FactRow label="Project">
                <Link href={`/staff/projects/${request.projectId}/materials`} className="link -my-2 inline-flex min-h-11 items-center">
                  {request.projectName}
                </Link>
              </FactRow>
              <FactRow label="Milestone">{request.n}</FactRow>
              <FactRow label="Raised">{formatStampShort(request.sentAt || request.at)}</FactRow>
              <FactRow label="Needed by">
                {formatShortDate(request.neededBy)}
                {open && (
                  <span className={`text-13 ${request.late || left < 0 ? "late-text" : "text-ink-soft"}`}>
                    {" · "}
                    {left < 0 ? `${-left} days late` : left === 0 ? "today" : `in ${left} days`}
                  </span>
                )}
              </FactRow>
              <FactRow label="Waiting">{open ? <WaitingChip r={request} /> : "–"}</FactRow>
              <FactRow label="Raised by">
                <span className="inline-flex flex-wrap items-center justify-end gap-x-3">
                  <span>{raiser?.name ?? request.by}</span>
                  {raiser?.phone && (
                    <a
                      href={`tel:${raiser.phone.replace(/\s/g, "")}`}
                      className="link -my-2 inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap"
                    >
                      <Icon name="phone" className="size-3.5" />
                      {raiser.phone}
                    </a>
                  )}
                </span>
              </FactRow>
            </dl>
          </Panel>

          <Panel title="Items">
            <ul className="grid gap-1">
              {request.lines.map((line) => {
                const item = firm.catalogue.find((c) => c.id === line.material);
                const ordered = request.ordered[line.id] ?? 0;
                const share = line.qty > 0 ? ordered / line.qty : 0;
                return (
                  <li key={line.id} className="glass-row grid gap-2 px-3 py-3">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-15 font-semibold">
                        {item?.name ?? line.material}, {line.sub}
                      </span>
                      <span className="figure text-15">
                        {ordered.toLocaleString("en-IN")} / {line.qty.toLocaleString("en-IN")} {line.unit}
                      </span>
                    </p>
                    <Meter
                      value={share}
                      tone={request.status === "Delivered" ? "done" : share >= 1 ? "done" : "progress"}
                      label={`${item?.name ?? line.material}, ordered`}
                    />
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="grid content-start gap-5 lg:col-span-7">
          <Panel title={heading} strong>
            {!canBuy ? (
              buyer && me.id !== buyer.id && (buyer.id === "prakash" || buyer.id === "divya") ? (
                <SeeAsLine words={`With ${buyer.name}.`} person={{ id: buyer.id, first: buyer.first }} />
              ) : (
                <p className="px-1 text-15 text-ink-soft">With {buyer?.name ?? "procurement"}.</p>
              )
            ) : request.status === "New" ? (
              <div className="grid justify-items-start gap-3 px-1">
                <StatusChip tone="waiting">Not seen yet</StatusChip>
                <MarkSeen no={request.no} person={me.id} primary className="min-h-12 w-full sm:w-auto" />
              </div>
            ) : request.status === "Seen" || request.status === "PO in part" ? (
              <LinkPo key={request.no} request={request} person={me.id} />
            ) : request.status === "PO uploaded" ? (
              <div className="grid justify-items-start gap-3 px-1">
                <StatusChip tone="done">Ordered in full</StatusChip>
                <MarkDelivered request={request} person={me.id} />
              </div>
            ) : (
              <p className="flex flex-wrap items-center gap-2 px-1 text-15">
                <StatusChip tone="done">Delivered</StatusChip>
                {request.deliveredAt && <span>{formatShortDate(datePart(request.deliveredAt))}</span>}
                {request.deliveredBy && (
                  <span className="text-ink-soft">{firm.person(request.deliveredBy)?.name ?? request.deliveredBy}</span>
                )}
              </p>
            )}
          </Panel>

          {request.pos.length > 0 && (
            <Panel title="Linked POs">
              <GlassTable<PoView>
                caption="Linked POs"
                rows={request.pos}
                rowKey={(po) => po.no}
                columns={[
                  {
                    // The PO, its vendor, then one line per item: the panel is too narrow for
                    // the lines to hold a column of their own.
                    label: "PO",
                    cell: (po) => (
                      <span className="grid gap-0.5">
                        <span>
                          <span className="whitespace-nowrap">{po.no}</span>
                          <span className="font-normal text-ink-soft"> · {po.vendor}</span>
                        </span>
                        <ul className="grid gap-0.5 text-13 font-normal text-ink-soft">
                          {po.lineWords.map((words) => (
                            <li key={words}>{words}</li>
                          ))}
                        </ul>
                      </span>
                    ),
                  },
                  {
                    label: "Before GST",
                    align: "right",
                    cell: (po) => <span className="figure whitespace-nowrap">{inr(po.amount)}</span>,
                  },
                  {
                    label: "With GST",
                    align: "right",
                    cell: (po) => <span className="figure whitespace-nowrap">{inr(po.total)}</span>,
                  },
                  {
                    label: "Bill",
                    phone: false,
                    cell: (po) =>
                      po.billed ? <StatusChip tone="done">Billed</StatusChip> : <StatusChip tone="waiting">Not billed</StatusChip>,
                  },
                ]}
                chip={(po) =>
                  po.billed ? <StatusChip tone="done">Billed</StatusChip> : <StatusChip tone="waiting">Not billed</StatusChip>
                }
                wide="xl"
              />
            </Panel>
          )}

          {request.taskId && canBuy && (
            <WorkOrders scope={request.projectId} person={me.id} taskId={request.taskId} title="Labour for this task" />
          )}
        </div>

        <details className="glass p-3 sm:p-5 lg:col-span-12">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-1 text-17 font-semibold">
            <Icon name="file" />
            Requirement report
          </summary>
          <div className="mt-3 overflow-x-auto">
            <MaterialReport no={request.no} />
          </div>
        </details>
      </div>
    </>
  );
}
