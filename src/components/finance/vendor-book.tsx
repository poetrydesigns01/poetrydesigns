"use client";

import { useRef, useState } from "react";
import { field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { SampleTag } from "@/components/register/sample-tag";
import { StaffBoard } from "@/components/register/staff-board";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm, useViewer } from "@/lib/demo-store";
import { vendors as seedVendors, type CatalogueItem, type PersonId, type Vendor } from "@/lib/firm-data";
import { addDays, formatShortDate } from "@/lib/format";
import { focusReturn } from "./focus-return";
import { RateScale } from "./rate-scale";
import { numberFrom, perUnit, rateWords } from "./shared";

// The vendor book: for each material, who sells it, where they are, how to reach them and
// what was last paid, before GST. A rate scale per size shows at a glance who is cheapest.
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
      className="grid gap-4 border-t border-sand pt-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
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
  const demo = useDemo();
  const me = useViewer("finance");
  const pause = usePause();
  const [adding, setAdding] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const materials = firm.catalogue.filter((c) => firm.vendors.some((v) => v.rates.some((r) => r.material === c.id)));
  // The sample tag goes beside the first GSTIN on the screen only.
  const firstMaterial = materials[0];
  const taggedKey = firstMaterial
    ? `${firstMaterial.id}:${firm.vendors.find((v) => v.rates.some((r) => r.material === firstMaterial.id))?.id}`
    : "";

  return (
    <>
      <StaffBoard
        place="Vendors"
        headline={`${firm.vendors.length} vendors across ${materials.length} materials.`}
        state="Every rate here is the last one paid, before GST."
        chip={false}
      />

      <div className="mt-6 grid justify-items-start gap-3">
        <button
          ref={addRef}
          type="button"
          className="btn btn-quiet"
          aria-expanded={adding}
          onClick={() => {
            if (adding && pause.pending !== null && pause.pending.rowId === null) pause.cancel();
            setAdding((a) => !a);
          }}
        >
          {adding ? "Close" : "Add vendor"}
        </button>
        {adding && (
          <div className="w-full">
            <AddVendor
              person={me.id}
              onDone={() => {
                setAdding(false);
                focusReturn(addRef.current)();
              }}
            />
          </div>
        )}
        <p className="text-15 text-ink-soft">Only admin can delete a vendor.</p>
      </div>

      <div className="mt-10 grid gap-10 min-[1360px]:grid-cols-2 min-[1360px]:gap-8">
        {materials.map((item) => {
          const sellers = firm.vendors.filter((v) => v.rates.some((r) => r.material === item.id));
          // One scale per size that more than one vendor has quoted for.
          const subs = item.subs
            .map((sub) => ({
              sub,
              rates: sellers.flatMap((v) =>
                v.rates.filter((r) => r.material === item.id && r.sub === sub).map((r) => ({ vendor: v.name, rate: r.rate, unit: r.unit })),
              ),
            }))
            .filter((s) => s.rates.length > 1);
          return (
            <div key={item.id} className="grid content-start gap-4">
              <Register title={item.name}>
                {sellers.map((v) => {
                  const rates = v.rates.filter((r) => r.material === item.id);
                  const latest = rates.reduce((a, b) => (b.on > a.on ? b : a));
                  const first = `${item.id}:${v.id}` === taggedKey;
                  return (
                    <RegisterRow
                      key={v.id}
                      id={`vendor:${item.id}:${v.id}`}
                      margin={formatShortDate(latest.on)}
                      title={v.name}
                      stamps={demo.events.flatMap((e) =>
                        e.kind === "vendor.added" && e.vendor.id === v.id ? [{ words: "Vendor added", at: e.at, by: e.by }] : [],
                      )}
                      sentence={
                        <>
                          {rates.map((r) => `${r.sub}, ${rateWords(r.rate)} ${perUnit(r.unit)}`).join("; ")}. {v.area}.{" "}
                          <a href={`tel:${v.phone.replace(/\s/g, "")}`} className="link whitespace-nowrap py-3.5">
                            {v.phone}
                          </a>
                          . GSTIN {v.gstin}
                          {first && (
                            <>
                              {" "}
                              <SampleTag />
                            </>
                          )}
                        </>
                      }
                    />
                  );
                })}
              </Register>
              {subs.map((s) => {
                const cheapest = s.rates.reduce((a, b) => (b.rate < a.rate ? b : a));
                return (
                  <figure key={s.sub} className="grid gap-1">
                    <RateScale rates={s.rates} />
                    <figcaption className="lettering text-ink-soft">
                      {s.sub}: cheapest is {cheapest.vendor}, {rateWords(cheapest.rate)} {perUnit(cheapest.unit)}, of{" "}
                      {s.rates.length} quotes.
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
