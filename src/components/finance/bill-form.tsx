"use client";

import { useRef, useState } from "react";
import { field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { PoView } from "@/lib/firm";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { addDays, formatShortDate, inr } from "@/lib/format";
import { rupeesFrom } from "./shared";

// Entering a vendor's bill: money out, against one project and one milestone, before GST
// with the GST in its own field. Choosing the PO it answers fills in the vendor, the
// milestone and the PO's amount, and moves that PO from committed to spent once recorded.

type Draft = {
  projectId: ProjectId | "";
  poNo: string;
  n: string;
  vendorId: string;
  billNo: string;
  amount: string;
  gst: string;
  gstTouched: boolean;
  on: string;
};

function draftFrom(po: PoView | undefined, projectId: ProjectId | ""): Draft {
  return {
    projectId: po?.projectId ?? projectId,
    poNo: po?.no ?? "",
    n: po ? String(po.n) : "",
    vendorId: po?.vendorId ?? "",
    billNo: "",
    amount: po ? String(po.amount) : "",
    gst: po ? String(po.gst) : "",
    gstTouched: false,
    on: TODAY,
  };
}

export function BillForm({
  person,
  preset,
  projectId = "",
  onDone,
  submitLabel = "Enter bill",
}: {
  person: PersonId;
  /** The PO this bill answers, when it is known. */
  preset?: PoView;
  /** The project to start on, from the project switch. */
  projectId?: ProjectId | "";
  onDone?: () => void;
  submitLabel?: string;
}) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const submitRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(preset, projectId));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const projects = firm.projects.filter((p) => p.phase !== "draft");
  const project = draft.projectId ? firm.project(draft.projectId) : undefined;
  const openPos = firm.pos.filter((po) => po.projectId === draft.projectId && (!po.billed || po.no === draft.poNo));
  const vendor = firm.vendors.find((v) => v.id === draft.vendorId);
  const amount = rupeesFrom(draft.amount);
  const gst = rupeesFrom(draft.gst);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const setAmount = (text: string) =>
    setDraft((d) => {
      const value = rupeesFrom(text);
      return {
        ...d,
        amount: text,
        gst: d.gstTouched || !Number.isFinite(value) ? d.gst : String(Math.round(value * 0.18)),
      };
    });

  const choosePo = (no: string) => {
    const po = firm.pos.find((x) => x.no === no);
    if (!po) {
      set({ poNo: "" });
      return;
    }
    set({
      poNo: po.no,
      n: String(po.n),
      vendorId: po.vendorId,
      amount: String(po.amount),
      gst: String(po.gst),
      gstTouched: false,
    });
  };

  const readBack =
    project && vendor && draft.n !== "" && Number.isFinite(amount) && amount > 0
      ? `${draft.billNo.trim() || "A bill"} from ${vendor.name} for ${project.name}, ${
          draft.n === "0" ? "sign-up" : `milestone ${draft.n}`
        }: ${inr(amount)} before GST${Number.isFinite(gst) ? `, GST ${inr(gst)}` : ""}${draft.poNo ? `, against ${draft.poNo}` : ""}.`
      : "";

  const submit = () => {
    if (pause.pending !== null) return;
    const next: typeof errors = {};
    if (!project) next.projectId = "Choose the project.";
    if (draft.n === "") next.n = "Choose the milestone the bill belongs to.";
    if (!vendor) next.vendorId = "Choose the vendor.";
    if (!draft.billNo.trim()) next.billNo = "Write the bill number from the vendor's bill.";
    if (!Number.isFinite(amount) || amount <= 0) next.amount = "Write the amount before GST, in rupees.";
    if (!Number.isFinite(gst) || gst < 0) next.gst = "Write the GST, in rupees. Write 0 if there is none.";
    if (!draft.on || draft.on > TODAY) next.on = "The date cannot be after today.";
    setErrors(next);
    if (Object.keys(next).length > 0 || !project || !vendor) return;

    const { record } = demo;
    const billNo = draft.billNo.trim();
    const poNo = draft.poNo || undefined;
    const n = Number(draft.n);
    const on = draft.on;
    const projectId = project.id;
    const vendorId = vendor.id;
    pause.start({
      what: `Bill ${billNo}, ${inr(amount)} before GST`,
      origin: submitRef.current,
      commit: () => {
        record({ kind: "bill.entered", projectId, n, vendorId, poNo, billNo, amount, gst, on, by: person });
        setDraft(draftFrom(undefined, projectId));
        setErrors({});
        onDone?.();
      },
    });
  };

  return (
    <form
      className="@container grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-4 @lg:grid-cols-2 @5xl:grid-cols-4">
        <Field label="Project" error={errors.projectId}>
          <select
            className={field}
            value={draft.projectId}
            onChange={(event) => setDraft(draftFrom(undefined, event.target.value as ProjectId))}
          >
            <option value="">Choose</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Linked PO" hint="Optional.">
          <select
            className={field}
            value={draft.poNo}
            disabled={!project}
            onChange={(event) => choosePo(event.target.value)}
          >
            <option value="">No PO</option>
            {openPos.map((po) => (
              <option key={po.no} value={po.no}>
                {po.no}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Milestone" error={errors.n}>
          <select
            className={field}
            value={draft.n}
            disabled={!project}
            onChange={(event) => set({ n: event.target.value })}
          >
            <option value="">Choose</option>
            {project?.milestones.map((m) => (
              <option key={m.n} value={String(m.n)}>
                {m.n === 0 ? "Sign-up" : `Milestone ${m.n}`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vendor" error={errors.vendorId}>
          <select className={field} value={draft.vendorId} onChange={(event) => set({ vendorId: event.target.value })}>
            <option value="">Choose</option>
            {firm.vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bill number" error={errors.billNo}>
          <input
            className={field}
            autoComplete="off"
            autoFocus={!!preset}
            value={draft.billNo}
            aria-invalid={errors.billNo ? true : undefined}
            onChange={(event) => set({ billNo: event.target.value })}
          />
        </Field>
        <Field label="Amount before GST" error={errors.amount}>
          <input
            className={field}
            inputMode="numeric"
            autoComplete="off"
            value={draft.amount}
            aria-invalid={errors.amount ? true : undefined}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
        <Field label="GST" hint="18% unless you change it." error={errors.gst}>
          <input
            className={field}
            inputMode="numeric"
            autoComplete="off"
            value={draft.gst}
            aria-invalid={errors.gst ? true : undefined}
            onChange={(event) => set({ gst: event.target.value, gstTouched: true })}
          />
        </Field>
        <Field label="Bill date" error={errors.on}>
          <input
            className={field}
            type="date"
            value={draft.on}
            min={addDays(TODAY, -90)}
            max={TODAY}
            onChange={(event) => set({ on: event.target.value })}
          />
        </Field>
      </div>
      {readBack && (
        <p className="text-15">
          {readBack}
          {draft.on !== TODAY && ` Dated ${formatShortDate(draft.on)}.`}
        </p>
      )}
      <div>
        <button
          ref={submitRef}
          type="submit"
          className="btn btn-primary w-full sm:w-auto"
          aria-disabled={pause.pending !== null}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
