"use client";

import { useRef, useState } from "react";
import { field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { Count, GlassTable, Icon, Panel, Segments } from "@/components/admin/glass-kit";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm, useViewer } from "@/lib/demo-store";
import { vendors as seedVendors, type CatalogueItem, type PersonId, type Vendor } from "@/lib/firm-data";
import { addDays, formatShortDate } from "@/lib/format";
import { focusReturn } from "./focus-return";
import { numberFrom, perUnit, rateWords } from "./shared";

// The vendor book: one table of who sells what, where they are, how to reach them and the
// last rate paid, before GST. Narrowed to one material, the cheapest per size is marked.
// Anyone in procurement can add a vendor; only the admin can delete one.

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** The unit a vendor's rate is in, from the catalogue's unit. */
function rateUnit(item: CatalogueItem): string {
  if (item.unit === "bags") return "bag";
  if (item.unit === "nos") return "each";
  if (item.unit === "lengths") return "length";
  return item.unit;
}

type Draft = { name: string; area: string; phone: string; gstin: string; material: string; sub: string; rate: string; on: string };
const EMPTY: Draft = { name: "", area: "", phone: "", gstin: "", material: "", sub: "", rate: "", on: TODAY };

function AddVendor({ person, onDone }: { person: PersonId; onDone: () => void }) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const submitRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const item = firm.catalogue.find((c) => c.id === draft.material);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const submit = () => {
    if (pause.pending !== null) return;
    const next: typeof errors = {};
    const gstin = draft.gstin.trim().toUpperCase();
    const rate = numberFrom(draft.rate);
    if (!draft.name.trim()) next.name = "Write the vendor's name.";
    else if (firm.vendors.some((v) => v.name.toLowerCase() === draft.name.trim().toLowerCase()))
      next.name = "This vendor is already in the book.";
    if (!draft.area.trim()) next.area = "Write where they are, like Peenya.";
    if (draft.phone.replace(/\D/g, "").length < 10) next.phone = "Write a phone number with at least 10 digits.";
    if (!GSTIN.test(gstin)) next.gstin = "A GSTIN has 15 characters, like 29ABCDE1234F1Z5.";
    if (!item) next.material = "Choose a material they sell.";
    if (item && !draft.sub) next.sub = "Choose the size or grade.";
    if (!Number.isFinite(rate) || rate <= 0) next.rate = "Write the last rate before GST, in rupees.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !item) return;

    const { record } = demo;
    const base = { name: draft.name.trim(), gstin, phone: draft.phone.trim(), area: draft.area.trim() };
    const rates = [{ material: item.id, sub: draft.sub, rate, unit: rateUnit(item), on: draft.on }];
    pause.start({
      what: `${base.name}, added to the vendor book`,
      origin: submitRef.current,
      commit: () => {
        const added = getDemoSnapshot().events.filter((e) => e.kind === "vendor.added").length;
        const vendor: Vendor = { id: `v${String(seedVendors.length + added + 1).padStart(2, "0")}`, ...base, rates };
        record({ kind: "vendor.added", vendor, by: person });
        setDraft(EMPTY);
        setErrors({});
        onDone();
      },
    });
  };

  return (
    <form
      className="glass-strong grid gap-4 p-4 sm:p-5"
      aria-label="Add vendor"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <h2 className="text-17 font-semibold">New vendor</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Vendor name" error={errors.name}>
          <input className={field} autoComplete="off" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Area" error={errors.area}>
          <input className={field} autoComplete="off" value={draft.area} onChange={(e) => set({ area: e.target.value })} />
        </Field>
        <Field label="Phone" error={errors.phone}>
          <input className={field} type="tel" autoComplete="off" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="GSTIN" error={errors.gstin}>
          <input className={field} autoComplete="off" value={draft.gstin} onChange={(e) => set({ gstin: e.target.value })} />
        </Field>
        <Field label="Material" error={errors.material}>
          <select className={field} value={draft.material} onChange={(e) => set({ material: e.target.value, sub: "" })}>
            <option value="">Choose</option>
            {firm.catalogue.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Size or grade" error={errors.sub}>
          <select className={field} value={draft.sub} disabled={!item} onChange={(e) => set({ sub: e.target.value })}>
            <option value="">Choose</option>
            {item?.subs.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </Field>
        <Field label={item ? `Last rate before GST, ${perUnit(rateUnit(item))}` : "Last rate before GST"} error={errors.rate}>
          <input className={field} inputMode="decimal" autoComplete="off" value={draft.rate} onChange={(e) => set({ rate: e.target.value })} />
        </Field>
        <Field label="Rate date">
          <input
            className={field}
            type="date"
            value={draft.on}
            min={addDays(TODAY, -365)}
            max={TODAY}
            onChange={(e) => set({ on: e.target.value })}
          />
        </Field>
      </div>
      <div>
        <button ref={submitRef} type="submit" className="btn btn-primary w-full sm:w-auto" aria-disabled={pause.pending !== null}>
          Add vendor
        </button>
      </div>
    </form>
  );
}

export function VendorBook() {
  const firm = useFirm();
  const me = useViewer("finance");
  const [adding, setAdding] = useState(false);
  const [material, setMaterial] = useState<string>("all");
  const anchorRef = useRef<HTMLDivElement>(null);
  const live = firm.vendors.filter((v) => !v.deleted);
  const materials = firm.catalogue.filter((c) => live.some((v) => v.rates.some((r) => r.material === c.id)));
  const item = materials.find((m) => m.id === material);
  const rows = item ? live.filter((v) => v.rates.some((r) => r.material === item.id)) : live;
  // The cheapest last rate per size of the chosen material.
  const cheapest = new Map<string, number>();
  if (item)
    for (const v of rows)
      for (const r of v.rates)
        if (r.material === item.id) cheapest.set(r.sub, Math.min(cheapest.get(r.sub) ?? Infinity, r.rate));
  const ratesOf = (v: Vendor) => v.rates.filter((r) => !item || r.material === item.id);
  const nameOf = (id: string) => firm.catalogue.find((c) => c.id === id)?.name ?? id;
  const latest = (v: Vendor) => {
    const rates = ratesOf(v);
    return rates.length > 0 ? rates.reduce((a, b) => (b.on > a.on ? b : a)) : undefined;
  };
  const best = (v: Vendor) => !!item && ratesOf(v).some((r) => cheapest.get(r.sub) === r.rate);

  return (
    <>
      <StaffBoard place="Vendors" headline={`${live.length} vendors`} chip={false} />

      <div ref={anchorRef} tabIndex={-1} className="mt-6 grid gap-5 outline-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Segments<string>
            label="Material"
            value={material}
            onChange={setMaterial}
            options={[{ id: "all", label: "All" }, ...materials.map((m) => ({ id: m.id, label: m.name }))]}
          />
          <button
            type="button"
            className="btn btn-glass min-h-12 gap-2"
            aria-expanded={adding}
            onClick={() => setAdding((a) => !a)}
          >
            {!adding && <Icon name="plus" />}
            {adding ? "Close" : "Add vendor"}
          </button>
        </div>

        {adding && (
          <AddVendor
            person={me.id}
            onDone={() => {
              setAdding(false);
              focusReturn(anchorRef.current)();
            }}
          />
        )}

        <Panel title={item ? item.name : "Every vendor"} aside={<Count n={rows.length} />} strong>
          <GlassTable<Vendor>
            caption="Vendors"
            rows={rows}
            rowKey={(v) => v.id}
            wide="lg"
            chip={(v) => (best(v) ? <StatusChip tone="done">Cheapest</StatusChip> : null)}
            columns={[
              {
                label: "Vendor",
                cell: (v) => (
                  <span className="grid min-w-0">
                    <span>{v.name}</span>
                    <span className="inline-flex items-center gap-1 text-13 font-normal text-ink-soft">
                      <Icon name="pin" className="size-3" />
                      {v.area}
                    </span>
                  </span>
                ),
              },
              {
                label: item ? "Last rate" : "Sells",
                cell: (v) => (
                  <ul className="grid gap-0.5">
                    {ratesOf(v).map((r) => (
                      <li key={`${r.material}-${r.sub}`} className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-ink-soft">{item ? r.sub : `${nameOf(r.material)}, ${r.sub}`}</span>
                        <span className={`figure ${cheapest.get(r.sub) === r.rate ? "font-semibold text-kota" : ""}`}>
                          {rateWords(r.rate)}
                        </span>
                        <span className="text-13 text-ink-soft">{perUnit(r.unit)}</span>
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                label: "Updated",
                width: "w-24",
                cell: (v) => {
                  const r = latest(v);
                  return <span className="text-13 font-normal">{r ? formatShortDate(r.on) : "–"}</span>;
                },
              },
              {
                label: "Phone",
                width: "w-40",
                cell: (v) => (
                  <a
                    href={`tel:${v.phone.replace(/\s/g, "")}`}
                    className="link inline-flex min-h-11 items-center whitespace-nowrap font-normal"
                  >
                    {v.phone}
                  </a>
                ),
              },
              { label: "GSTIN", width: "w-44", phone: false, cell: (v) => <span className="text-13 font-normal">{v.gstin}</span> },
              // "Cheapest" only means something once the book is narrowed to one material.
              ...(item
                ? [
                    {
                      label: "Best",
                      width: "w-28",
                      phone: false as const,
                      cell: (v: Vendor) => (best(v) ? <StatusChip tone="done">Cheapest</StatusChip> : null),
                    },
                  ]
                : []),
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
