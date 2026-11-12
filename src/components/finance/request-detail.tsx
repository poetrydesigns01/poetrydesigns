"use client";

import { useRef, useState } from "react";
import { MaterialStack, stackWords } from "@/components/instruments/material-stack";
import { RequestLadder } from "@/components/instruments/request-ladder";
import { field } from "@/components/register/chips";
import { DropZone } from "@/components/register/drop-zone";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import { CarbonLine, Stamp } from "@/components/register/stamp";
import { StatusWord } from "@/components/register/status-word";
import { MaterialReport } from "@/components/reports/material-report";
import { stampNow } from "@/lib/clock";
import { useDemo, useFirm, useViewer } from "@/lib/demo-store";
import type { RequestView } from "@/lib/firm";
import type { PersonId, Vendor } from "@/lib/firm-data";
import { datePart, formatShortDate, formatStampShort, inr } from "@/lib/format";
import { MarkSeen, SeeAsLine } from "./mark-seen";
import { ProjectLink } from "./rows";
import { beforeGstWords, numberFrom, perUnit, procuresFor, rateWords, withGstWords } from "./shared";

// One material request, for procurement. The left side is what the site asked for, how
// much is on a PO so far, and the request's own report. The right side links the PO made
// in Zoho Books: the file, its number, the vendor (with each vendor's last rate for this
// material), the quantities, rates and GST per line, and the totals. A PO that covers part
// of a line leaves the rest to order, and another PO can be linked for it.

const HEADLINE: Record<RequestView["status"], (no: string) => string> = {
  New: (no) => `${no} has not been seen yet.`,
  Seen: (no) => `${no} is seen and waiting on a PO.`,
  "PO in part": (no) => `${no} is ordered in part.`,
  "PO uploaded": (no) => `${no} is ordered in full.`,
  Delivered: (no) => `${no} is delivered.`,
};

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
  const selling = firm.vendors
    .filter((v) => request.lines.some((l) => rateFor(v, l.material, l.sub)))
    .sort((a, b) => (rateFor(b, first.material, first.sub)?.on ?? "").localeCompare(rateFor(a, first.material, first.sub)?.on ?? ""));
  const others = firm.vendors.filter((v) => !selling.includes(v));
  const chosenId = vendorId ?? selling[0]?.id ?? "";
  const vendor = firm.vendors.find((v) => v.id === chosenId);
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
    const qty = numberFrom(v.qtyText);
    const rate = numberFrom(v.rateText);
    const gst = numberFrom(v.gstText);
    return { line, v, qty, rate, gst };
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
    if (files.length === 0) next.files = "Choose the PO file from Zoho Books.";
    if (!/^PO-\d{4}-\d{4}$/.test(number)) next.poNo = "Write the PO number as it is in Zoho Books, like PO-2026-0422.";
    else if (firm.pos.some((po) => po.no === number)) next.poNo = `${number} is already linked to a request.`;
    if (!vendor) next.vendor = "Choose the vendor on the PO.";
    const ordering = priced.filter((p) => p.v.qtyText.trim() !== "" && p.v.qtyText.trim() !== "0");
    if (ordering.length === 0) next.lines = "Write the quantity ordered on at least one line.";
    for (const p of ordering) {
      const unit = p.line.unit;
      if (!Number.isFinite(p.qty) || p.qty <= 0) next.lines = `Write the quantity of ${p.line.sub} ordered, in ${unit}.`;
      else if (p.qty > p.v.left) next.lines = `Only ${p.v.left.toLocaleString("en-IN")} ${unit} of ${p.line.sub} is still to order.`;
      else if (!Number.isFinite(p.rate) || p.rate <= 0) next.lines = `Write the rate before GST for ${p.line.sub}.`;
      else if (!Number.isFinite(p.gst) || p.gst < 0 || p.gst > 28) next.lines = `Write the GST for ${p.line.sub} as a percentage, like 18.`;
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

  // The select holds only the vendor's name, so a narrow column never cuts it; the chosen
  // vendor's last rate for the first line is said in the hint above it.
  const rateHint = (v: Vendor | undefined) => {
    const r = v && rateFor(v, first.material, first.sub);
    return r ? `Last rate ${rateWords(r.rate)} ${perUnit(r.unit)}, on ${formatShortDate(r.on)}.` : undefined;
  };

  return (
    <form
      className="@container grid gap-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div>
        <DropZone
          label="The PO from Zoho Books"
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
        <Field label="Vendor" hint={rateHint(vendor)} error={errors.vendor}>
          <select className={field} value={chosenId} onChange={(event) => chooseVendor(event.target.value)}>
            <option value="">Choose</option>
            <optgroup label="Have sold this before">
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

      <div className="grid gap-5">
        {priced.map(({ line, v, qty }) => {
          const item = firm.catalogue.find((c) => c.id === line.material);
          const before = request.pos.map((po) => po.lines.filter((l) => l.lineId === line.id).reduce((t, l) => t + l.qty, 0));
          const adding = Number.isFinite(qty) && qty > 0 ? Math.min(qty, v.left) : 0;
          return (
            <fieldset key={line.id} className="grid gap-3 border-t border-sand pt-4">
              <legend className="float-left w-full pb-2 text-17 font-semibold">
                {item?.name ?? line.material}, {line.sub}
              </legend>
              <div className="grid grid-cols-3 gap-3">
                <Field label={`Ordered, ${line.unit}`}>
                  <input
                    className={field}
                    inputMode="decimal"
                    autoComplete="off"
                    value={v.qtyText}
                    onChange={(event) => setLine(line.id, { qty: event.target.value })}
                  />
                </Field>
                <Field label="Rate before GST">
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
              {item && (
                <div className="grid gap-1">
                  <MaterialStack
                    item={item}
                    requested={line.qty}
                    ordered={[...before, adding]}
                    delivered={false}
                    width={160}
                    words="none"
                  />
                  <p className="text-15">{stackWords(item, line.qty, before.reduce((t, q) => t + q, 0) + adding, false)}</p>
                </div>
              )}
            </fieldset>
          );
        })}
        {errors.lines && (
          <p className="text-15 font-semibold text-brick" role="alert">
            {errors.lines}
          </p>
        )}
      </div>

      <dl className="sheet-rows ruled grid text-17">
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt>Before GST</dt>
          <dd className="figure">{inr(before)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt>GST</dt>
          <dd className="figure">{inr(gstTotal)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-2 font-semibold">
          <dt>With GST</dt>
          <dd className="figure">{inr(before + gstTotal)}</dd>
        </div>
      </dl>

      <div>
        <button ref={submitRef} type="submit" className="btn btn-primary w-full sm:w-auto" aria-disabled={pause.pending !== null}>
          Link PO
        </button>
      </div>
    </form>
  );
}

function MarkDelivered({ request, person }: { request: RequestView; person: PersonId }) {
  const demo = useDemo();
  const pause = usePause();
  return (
    <button
      type="button"
      className="btn btn-quiet w-full sm:w-auto"
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
      <>
        <StaffBoard
          place="Requests"
          headline="This request has not been raised yet."
          state={request?.queued ? "It is saved on the site engineer's phone and goes out when the signal is back." : undefined}
          chip={false}
          back={back}
        />
      </>
    );
  }

  const project = firm.project(request.projectId);
  const raiser = firm.person(request.by);
  const canBuy = procuresFor(me.id, project);
  // Who to hand over to: someone in this site's procurement the demo can show, else the first.
  const team = project?.team.procurement ?? ["prakash"];
  const buyer = firm.person(team.find((id) => id === "prakash" || id === "divya") ?? team[0]);
  const buyerDoes = request.status === "New" ? "marks this seen and links its PO" : "links its PO";
  const stamps = firm.stampsFor(`mr:${request.no}`);
  const newest = stamps[0];

  const state = `Raised ${formatStampShort(request.sentAt || request.at)}, needed on site by ${formatShortDate(request.neededBy)}.${
    request.late ? " It is late for site." : ""
  }`;

  return (
    <>
      <StaffBoard place="Requests" headline={HEADLINE[request.status](request.no)} state={state} chip={false} back={back} />

      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-8">
        <section className="grid content-start gap-8 lg:col-span-5" aria-label="What the site asked for">
          <p className="text-17">
            <ProjectLink id={request.projectId} name={request.projectName} className="py-3.5" />, milestone {request.n}. Raised by{" "}
            {raiser?.name ?? request.by}
            {raiser?.phone && (
              <>
                , <a href={`tel:${raiser.phone.replace(/\s/g, "")}`} className="link whitespace-nowrap py-3.5">{raiser.phone}</a>
              </>
            )}
            .
          </p>
          <div>
            <h2 className="register-title">What the site asked for</h2>
            <ul className="sheet-rows ruled">
              {request.lines.map((line) => {
                const item = firm.catalogue.find((c) => c.id === line.material);
                const ordered = request.ordered[line.id] ?? 0;
                const pos = request.pos.map((po) => po.lines.filter((l) => l.lineId === line.id).reduce((t, l) => t + l.qty, 0));
                return (
                  <li key={line.id} className="grid gap-2 py-3">
                    <p className="text-17 font-semibold">
                      {item?.name ?? line.material}, {line.sub}
                    </p>
                    {line.outsideEstimate && (
                      <p className="text-15">
                        Not in the agreed estimate{line.note ? `, ${line.note}` : ""}. The Project Head raises a cost revision for it.
                      </p>
                    )}
                    {item && (
                      <MaterialStack
                        item={item}
                        requested={line.qty}
                        ordered={pos}
                        delivered={request.status === "Delivered"}
                        width={160}
                      />
                    )}
                    {!item && <p className="text-15">{`${ordered} of ${line.qty} ${line.unit} ordered.`}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <h2 className="register-title">Where it has got to</h2>
            <div className="pt-4">
              <RequestLadder status={request.status} stamps={stamps} late={request.late} />
            </div>
          </div>
        </section>

        {/* The paper report needs a full width for its table: on a phone it follows what the site
            asked for; from lg it takes its own row under both columns. */}
        <details className="lg:order-last lg:col-span-12">
          <summary className="link inline-flex min-h-11 cursor-pointer items-center text-17">The material requirement report</summary>
          <div className="mt-3">
            <MaterialReport no={request.no} />
          </div>
        </details>

        <section className="grid content-start gap-5 lg:col-span-7" aria-label="Link the Zoho PO">
          <div>
            <h2 className="register-title">
              {request.status === "PO in part" ? "Link another PO" : request.status === "New" || request.status === "Seen" ? "Link the Zoho PO" : "The Zoho POs"}
            </h2>
            <p className="pt-2 text-15 text-ink-soft">POs are made in Zoho Books and linked here.</p>
          </div>

          {newest && (
            <div className="grid justify-items-start gap-1">
              <Stamp key={`${newest.at}-${newest.words}`} stamp={newest} />
              <CarbonLine stamp={newest} />
            </div>
          )}

          {request.pos.length > 0 && (
            <ul className="sheet-rows ruled">
              {request.pos.map((po) => (
                <li key={po.no} className="grid gap-1 py-3">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="text-17 font-semibold">
                      {po.no}, {po.vendor}
                    </span>
                    <span className="figure text-17">{withGstWords(po.total)}</span>
                  </p>
                  <p className="text-15 text-ink-soft">
                    {po.lineWords.join("; ")}. {beforeGstWords(po.amount)}, GST {inr(po.gst)}. {po.file}.{" "}
                    {po.billed ? "Billed." : "Not billed yet."}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {!canBuy ? (
            buyer && me.id !== buyer.id && (buyer.id === "prakash" || buyer.id === "divya") ? (
              <SeeAsLine words={`${buyer.name} ${buyerDoes}.`} person={{ id: buyer.id, first: buyer.first }} />
            ) : (
              <p className="text-15 text-ink-soft">
                {buyer?.name ?? "Procurement"} {buyerDoes}.
              </p>
            )
          ) : request.status === "New" ? (
            <div className="grid justify-items-start gap-3">
              <p className="text-17">
                Mark it seen first, so {raiser?.first ?? "the site"} knows it has reached you. Then link the PO here.
              </p>
              <MarkSeen no={request.no} person={me.id} primary className="w-full sm:w-auto" />
            </div>
          ) : request.status === "Seen" || request.status === "PO in part" ? (
            <LinkPo key={request.no} request={request} person={me.id} />
          ) : request.status === "PO uploaded" ? (
            <div className="grid justify-items-start gap-3">
              <p className="text-17">Every line is ordered. {raiser?.first ?? "The site"} marks it delivered when it arrives; you can too.</p>
              <MarkDelivered request={request} person={me.id} />
            </div>
          ) : (
            <p className="text-17">
              <StatusWord>Delivered</StatusWord>
              {request.deliveredAt ? ` on ${formatShortDate(datePart(request.deliveredAt))}` : ""}
              {request.deliveredBy ? `, marked by ${firm.person(request.deliveredBy)?.name ?? request.deliveredBy}` : ""}.
            </p>
          )}

          <p className="lettering text-ink-soft">Stock after delivery is not tracked in this portal yet.</p>
        </section>
      </div>
    </>
  );
}
