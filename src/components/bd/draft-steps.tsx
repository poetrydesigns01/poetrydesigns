"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { ProgrammeStrip } from "@/components/instruments/programme-strip";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { DropZone } from "@/components/register/drop-zone";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { SampleTag } from "@/components/register/sample-tag";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import { estimate, type DraftView, type StripCell } from "@/lib/firm";
import type { CategoryId, PersonId, Template } from "@/lib/firm-data";
import { formatDate, formatStampShort, inr } from "@/lib/format";
import { coordinateWords, draftName, parseMaps } from "./bd-words";

// The four steps of opening a client's workspace. Each step is a form that keeps what was
// typed while the screen is away, and "Save as draft" records it after the pause. A step
// counts as done once it holds what the workspace needs: the client and site, the
// estimate, the signed agreement, and the Project Head.

export type StepNo = 1 | 2 | 3 | 4;

export const STEP_NAMES: Record<StepNo, string> = {
  1: "Client and site",
  2: "Category and estimate",
  3: "Agreement and schedule",
  4: "Team and hours",
};

/** What a saved step 1 may also hold for a project already being built. */
type Step1Saved = NonNullable<DraftView["step1"]> & { paidUpTo?: number; usedBefore?: number; usedDuring?: number };
type Step3Saved = NonNullable<DraftView["step3"]> & {
  contractValue?: number;
  signUp?: { amount: number; on: string; reference: string };
};
type Step4Saved = NonNullable<DraftView["step4"]> & { handoff?: string };

export type StepProps = {
  draft: DraftView;
  /** The workspace is open: the steps are a record now and cannot be changed here. */
  locked: boolean;
  onSaved: (step: StepNo) => void;
};

/** Which steps hold what the workspace needs, as the record counts them. */
export function stepsDone(draft: DraftView): Record<StepNo, boolean> {
  return {
    1: Boolean(draft.step1),
    2: Boolean(draft.step2),
    3: Boolean(draft.step3?.agreementFile),
    4: Boolean(draft.step4?.head),
  };
}

/** The money in a draft as the estimate works it out, from what step 1 and step 2 hold. */
function estimateOf(draft: DraftView, step2: NonNullable<DraftView["step2"]>, templates: Template[], perimeter?: number) {
  return estimate({
    projectId: "kulkarni",
    name: draftName(draft),
    clients: draft.step1?.clients ?? [],
    category: step2.category,
    area: step2.area,
    rate: step2.rate,
    addOns: step2.addOns,
    plotPerimeter: perimeter ?? draft.step1?.plotPerimeter ?? 0,
    partB: step2.partB,
    issuedOn: TODAY,
    milestones: templateIn(templates, step2.category).milestones,
  });
}

// ---- Saving ----

/** "Save as draft", the pause, and the receipt of the last save of this step. */
function SaveStep({
  draft,
  step,
  locked,
  check,
  data,
  onSaved,
}: {
  draft: DraftView;
  step: StepNo;
  locked: boolean;
  /** An error in words, or "" when the step can be saved. */
  check: () => string;
  data: () => Record<string, unknown>;
  onSaved: (step: StepNo) => void;
}) {
  const demo = useDemo();
  const pause = usePause();
  const [error, setError] = useState("");
  const last = demo.events.findLast((e) => e.kind === "draft.saved" && e.draftId === draft.id && e.step === step);
  const savedSeed = !last && draft[`step${step}`] !== undefined && draft.startedAt;
  const receipt = last ? last.at : savedSeed ? draft.startedAt : "";
  const waiting = pause.pending !== null;

  if (locked) return null;
  return (
    <div className="grid justify-items-start gap-2 border-t border-sand pt-4">
      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="submit"
          className="btn btn-quiet w-full sm:w-auto"
          aria-disabled={waiting}
          onClick={(event) => {
            event.preventDefault();
            if (waiting) return;
            const problem = check();
            setError(problem);
            if (problem) return;
            const payload = data();
            const { record } = demo;
            pause.start({
              what: `${STEP_NAMES[step]} for ${draftName(draft)}`,
              origin: event.currentTarget,
              commit: () => {
                record({ kind: "draft.saved", draftId: draft.id, step, data: payload, by: "rohan" });
                onSaved(step);
              },
            });
          }}
        >
          Save as draft
        </button>
        {receipt && <p className="lettering text-ink-soft">Saved. {formatStampShort(receipt)}.</p>}
      </div>
    </div>
  );
}

/** A step's sheet: its title with the sheet's rule, then its fields. Locked, it is a record. */
function StepSheet({ step, locked, children }: { step: StepNo; locked: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="grid gap-6">
      <div className="border-b border-ink pb-2">
        <p className="lettering text-ink-soft">Step {step} of 4</p>
        <h2 id={id} className="text-22 font-semibold">
          {STEP_NAMES[step]}
        </h2>
      </div>
      {locked && (
        <p className="text-15 text-ink-soft">The workspace is open, so this is kept as it was saved. The admin changes it from here on.</p>
      )}
      <form onSubmit={(event) => event.preventDefault()} className="grid gap-6">
        <fieldset disabled={locked} className="grid min-w-0 gap-6">
          {children}
        </fieldset>
      </form>
    </section>
  );
}

function NumberInput({
  value,
  onChange,
  unit,
  step = 1,
  id,
}: {
  value: number;
  onChange: (n: number) => void;
  unit?: string;
  step?: number;
  id?: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step={step}
        className={`${field} max-w-44`}
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
      />
      {unit && <span className="text-15 text-ink-soft">{unit}</span>}
    </span>
  );
}

// ---- Step 1, client and site ----

export function StepClient({ draft, locked, onSaved }: StepProps) {
  const saved = draft.step1 as Step1Saved | undefined;
  const ids = useId();
  const [name, setName] = useState(draft.step1?.name ?? (draft.id === "kulkarni" ? "Kulkarni Eco Home" : ""));
  const [owners, setOwners] = useState<[string, string]>([saved?.clients[0] ?? "", saved?.clients[1] ?? ""]);
  const [email, setEmail] = useState(saved?.email ?? "");
  const [phone, setPhone] = useState(saved?.phone ?? "");
  const [address, setAddress] = useState(saved?.address ?? "");
  const [maps, setMaps] = useState(saved?.maps ?? "");
  const [perimeter, setPerimeter] = useState(saved?.plotPerimeter ?? 0);
  const [underWay, setUnderWay] = useState(saved?.underWay ?? false);
  const [paidUpTo, setPaidUpTo] = useState(saved?.paidUpTo ?? 0);
  const [usedBefore, setUsedBefore] = useState(saved?.usedBefore ?? 12);
  const [usedDuring, setUsedDuring] = useState(saved?.usedDuring ?? 0);
  const pin = parseMaps(maps);
  const firm = useFirm();
  const milestones = templateIn(firm.templates, draft.step2?.category ?? "city-villa").milestones;

  const mapsError = maps.trim() && !pin ? "Paste a Google Maps link with a pin." : "";

  const check = () => {
    if (!name.trim()) return "Give the project a name.";
    if (!owners[0].trim()) return "Add the owner's name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Add the email the invite goes to.";
    if (phone.replace(/\D/g, "").length < 10) return "Add a phone number with at least 10 digits.";
    if (!address.trim()) return "Add the site address.";
    if (!pin) return "Paste a Google Maps link with a pin.";
    if (!(perimeter > 0)) return "Add the plot perimeter in feet.";
    return "";
  };

  return (
    <StepSheet step={1} locked={locked}>
      <Field label="Project name" hint="As the client and the team will see it">
        <input type="text" className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Owner">
          <input
            type="text"
            className={field}
            autoComplete="off"
            value={owners[0]}
            onChange={(e) => setOwners([e.target.value, owners[1]])}
          />
        </Field>
        <Field label="Second owner" hint="If the agreement names two">
          <input
            type="text"
            className={field}
            autoComplete="off"
            value={owners[1]}
            onChange={(e) => setOwners([owners[0], e.target.value])}
          />
        </Field>
        <Field label="Email" hint="The invite goes here">
          <input type="email" className={field} autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Phone">
          <input type="tel" className={field} autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>
      <Field label="Site address">
        <textarea rows={2} className={`${field} py-2`} value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Google Maps link" hint="Drop a pin on the plot, then copy its link" error={mapsError || undefined}>
          <input
            type="url"
            inputMode="url"
            className={field}
            value={maps}
            aria-describedby={`${ids}-pin`}
            onChange={(e) => setMaps(e.target.value)}
          />
        </Field>
        <Field label="Plot perimeter">
          <NumberInput value={perimeter} onChange={setPerimeter} unit="ft" />
        </Field>
      </div>
      <p id={`${ids}-pin`} className="-mt-3 text-15 text-ink-soft" aria-live="polite">
        {pin ? coordinateWords(pin.lat, pin.lng) : ""}
      </p>

      <div className="grid gap-4">
        <div>
          <Chip pressed={underWay} onClick={() => setUnderWay(!underWay)}>
            Already being built
          </Chip>
        </div>
        {underWay && (
          <div className="grid gap-6 border-l border-laterite pl-4 sm:grid-cols-3">
            <Field label="Paid up to milestone">
              <select className={field} value={paidUpTo} onChange={(e) => setPaidUpTo(Number(e.target.value))}>
                <option value={-1}>Nothing paid yet</option>
                <option value={0}>Sign-up</option>
                {milestones.map((m) => (
                  <option key={m.n} value={m.n}>
                    {m.n}. {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hours used before construction">
              <NumberInput value={usedBefore} onChange={setUsedBefore} step={0.5} />
            </Field>
            <Field label="Hours used during construction">
              <NumberInput value={usedDuring} onChange={setUsedDuring} step={0.5} />
            </Field>
            <p className="text-15 text-ink-soft sm:col-span-3">Earlier approvals are imported and marked Imported.</p>
          </div>
        )}
      </div>

      <SaveStep
        draft={draft}
        step={1}
        locked={locked}
        check={check}
        onSaved={onSaved}
        data={() => ({
          name: name.trim(),
          clients: owners.map((o) => o.trim()).filter(Boolean),
          email: email.trim(),
          phone: phone.trim(),
          address: address.trim(),
          maps: maps.trim(),
          lat: pin?.lat ?? 0,
          lng: pin?.lng ?? 0,
          plotPerimeter: perimeter,
          underWay,
          ...(underWay ? { paidUpTo, usedBefore, usedDuring } : {}),
        })}
      />
    </StepSheet>
  );
}

// ---- Step 2, category and estimate ----

type PartBRow = { id: string; name: string; formula: string; on: boolean; amount: number; computed: boolean };

/** A category's template as the admin left it, or the first one if it has gone. */
function templateIn(templates: Template[], id: CategoryId): Template {
  return templates.find((t) => t.id === id) ?? templates[0];
}

function partBRows(template: Template, saved: NonNullable<DraftView["step2"]> | undefined): PartBRow[] {
  return template.partB.map((item) => {
    const kept = saved?.partB.find((p) => p.id === item.id);
    const usual = item.id === "compound" || item.id === "sump";
    return {
      id: item.id,
      name: item.name,
      formula: item.formula,
      on: saved ? Boolean(kept) : usual,
      amount: kept?.amount ?? item.fixed ?? 0,
      computed: item.id === "compound",
    };
  });
}

export function StepEstimate({ draft, locked, onSaved }: StepProps) {
  const saved = draft.step2;
  const ids = useId();
  const { templates } = useFirm();
  const templateOf = (id: CategoryId) => templateIn(templates, id);
  const [category, setCategory] = useState<CategoryId>(saved?.category ?? "city-villa");
  const [area, setArea] = useState(saved?.area ?? 0);
  const [rate, setRate] = useState(saved?.rate ?? templateOf(saved?.category ?? "city-villa").ratePerSqFt);
  const [addOns, setAddOns] = useState(saved?.addOns ?? []);
  const [partB, setPartB] = useState<PartBRow[]>(() => partBRows(templateOf(saved?.category ?? "city-villa"), saved));
  const perimeter = draft.step1?.plotPerimeter ?? 0;
  const template = templateOf(category);

  const step2 = {
    category,
    area,
    rate,
    addOns: addOns.filter((a) => a.name.trim() && a.amount > 0),
    partB: partB.filter((p) => p.on && (p.computed || p.amount > 0)).map((p) => ({ id: p.id, name: p.name, amount: p.amount })),
  };
  const result = estimateOf(draft, step2, templates, perimeter);
  const wall = result.partB.items.find((item) => item.name === partB.find((p) => p.computed)?.name);

  const check = () => {
    if (!(area > 0)) return "Add the built-up area.";
    if (!(rate > 0)) return "Add the rate per sq ft.";
    if (addOns.some((a) => (a.name.trim() === "") !== (a.amount === 0))) return "Give every add-on a name and an amount, or remove it.";
    if (partB.some((p) => p.on && p.computed) && !(perimeter > 0)) return "Add the plot perimeter in step 1 first: the compound wall is worked out from it.";
    return "";
  };

  const choose = (id: CategoryId) => {
    setCategory(id);
    // Choosing a category loads its template rate; the area stays as typed.
    setRate(templateOf(id).ratePerSqFt);
  };

  return (
    <StepSheet step={2} locked={locked}>
      <ChipGroup label="Category" columns={2}>
        {templates.map((t) => (
          <Chip key={t.id} pressed={category === t.id} onClick={() => choose(t.id)} detail={`${inr(t.ratePerSqFt)} per sq ft`}>
            {t.name}
          </Chip>
        ))}
      </ChipGroup>
      {template.note && <p className="-mt-3 text-15 text-ink-soft">{template.note}</p>}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Built-up area">
          <NumberInput value={area} onChange={setArea} unit="sq ft" step={50} />
        </Field>
        <Field label="Rate before GST" hint={`The template rate is ${inr(template.ratePerSqFt)}`}>
          <NumberInput value={rate} onChange={setRate} unit="₹ per sq ft" step={50} />
        </Field>
      </div>

      <fieldset className="grid min-w-0 gap-3">
        <legend className="mb-1 text-15 font-semibold">Add-ons</legend>
        {addOns.length === 0 && <p className="text-15 text-ink-soft">None. Add-ons are priced into Part A.</p>}
        {addOns.map((addOn, i) => (
          <div key={i} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
            <label className="block">
              <span className="block text-15 text-ink-soft">Add-on {i + 1}</span>
              <input
                type="text"
                className={`${field} mt-1`}
                value={addOn.name}
                onChange={(e) => setAddOns(addOns.map((a, j) => (j === i ? { ...a, name: e.target.value } : a)))}
              />
            </label>
            <label className="block">
              <span className="block text-15 text-ink-soft">Amount before GST</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                className={`${field} mt-1`}
                value={addOn.amount}
                onChange={(e) =>
                  setAddOns(addOns.map((a, j) => (j === i ? { ...a, amount: Math.max(0, Number(e.target.value) || 0) } : a)))
                }
              />
            </label>
            <button type="button" className="btn btn-quiet" onClick={() => setAddOns(addOns.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="btn btn-quiet" onClick={() => setAddOns([...addOns, { name: "", amount: 0 }])}>
            Add an add-on
          </button>
        </div>
      </fieldset>

      <fieldset className="grid min-w-0 gap-3">
        <legend className="mb-1 text-15 font-semibold">
          Part B, the work around the house <SampleTag>Billing to be confirmed</SampleTag>
        </legend>
        <ul className="grid gap-4">
          {partB.map((row, i) => {
            const set = (patch: Partial<PartBRow>) => setPartB(partB.map((p, j) => (j === i ? { ...p, ...patch } : p)));
            return (
              <li key={row.id} className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <Chip pressed={row.on} onClick={() => set({ on: !row.on })} detail={row.computed ? undefined : row.formula}>
                  {row.name}
                </Chip>
                {row.computed ? (
                  <p className="text-15 text-ink-soft">
                    {row.on && wall ? (
                      <>
                        {wall.formula}, <span className="figure text-17 text-ink">{inr(wall.amount)}</span>
                      </>
                    ) : (
                      row.formula
                    )}
                  </p>
                ) : (
                  <label className="block">
                    <span className="sr-only">{row.name}, amount before GST</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={5000}
                      disabled={!row.on}
                      className={`${field} disabled:opacity-60`}
                      value={row.amount}
                      onChange={(e) => set({ amount: Math.max(0, Number(e.target.value) || 0) })}
                    />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <section aria-labelledby={`${ids}-sum`} className="grid gap-1 bg-sand-2 px-4 py-4">
        <h3 id={`${ids}-sum`} className="text-17 font-semibold">
          The estimate as it stands
        </h3>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-15">
          <dt>Part A, the house, with GST</dt>
          <dd className="figure text-right text-17">{inr(result.partA.total)}</dd>
          <dt>Part B, with GST</dt>
          <dd className="figure text-right text-17">{inr(result.partB.total)}</dd>
          <dt className="font-semibold">Grand total, with GST</dt>
          <dd className="figure text-right text-22">{inr(result.grandTotal)}</dd>
        </dl>
        <p className="text-15 text-ink-soft">
          GST at 18%. Valid until {formatDate(result.validUntil)}, 15 days from today.
        </p>
        {draft.id === "kulkarni" && (
          <p className="text-15">
            <Link href="/staff/bd/estimate/kulkarni" className="link inline-flex min-h-11 items-center">
              Open the estimate to download
            </Link>{" "}
            <span className="text-ink-soft">(as last saved)</span>
          </p>
        )}
      </section>

      <SaveStep draft={draft} step={2} locked={locked} check={check} onSaved={onSaved} data={() => step2} />
    </StepSheet>
  );
}

// ---- Step 3, agreement and schedule ----

/** Sign-up and ten milestones on Part A, all still to come: the eleven cells of the strip. */
function scheduleCells(rows: { n: number; name: string }[]): StripCell[] {
  return rows.map((row) => ({
    n: row.n,
    label: row.n === 0 ? "Sign-up" : String(row.n),
    state: "to-come",
    words: row.n === 0 ? "Sign-up, to come" : `Milestone ${row.n}, ${row.name}, to come`,
  }));
}

export function StepAgreement({ draft, locked, onSaved }: StepProps) {
  const saved = draft.step3 as Step3Saved | undefined;
  const surname = (draft.step1?.clients[0] ?? "Client").split(" ").slice(-1)[0];
  const [files, setFiles] = useState<string[]>(saved?.agreementFile ? [saved.agreementFile] : []);
  const [signedOn, setSignedOn] = useState(saved?.signedOn ?? TODAY);
  const { templates } = useFirm();
  const step2 = draft.step2;
  const result = step2 ? estimateOf(draft, step2, templates) : null;
  const value = result?.partA.amount ?? 0;
  const [signUpAmount, setSignUpAmount] = useState(saved?.signUp?.amount ?? result?.schedule[0]?.total ?? 0);
  const [signUpOn, setSignUpOn] = useState(saved?.signUp?.on ?? TODAY);
  const [reference, setReference] = useState(saved?.signUp?.reference ?? "");

  const check = () => {
    if (!result) return "Save the category and estimate in step 2 first: the contract value comes from it.";
    if (files.length === 0) return "Choose the signed agreement.";
    // A draft agreement is the usual slip: the workspace must open on the signed one.
    if (files.some((f) => /unsigned/i.test(f))) return "This is the unsigned draft. Choose the signed agreement.";
    if (!signedOn) return "Add the date it was signed.";
    return "";
  };

  return (
    <StepSheet step={3} locked={locked}>
      <DropZone
        label="Signed agreement (PDF)"
        accept="pdf"
        samples={[`${surname} agreement signed.pdf`, `${surname} agreement, unsigned draft.pdf`]}
        chosen={files}
        onChoose={setFiles}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Signed on">
          <input type="date" className={field} value={signedOn} max={TODAY} onChange={(e) => setSignedOn(e.target.value)} />
        </Field>
        <div>
          <p className="text-15 font-semibold">Contract value</p>
          {result ? (
            <>
              <p className="figure mt-1.5 text-22">{inr(value)}</p>
              <p className="text-15 text-ink-soft">Part A before GST, from the estimate. Change it in step 2.</p>
            </>
          ) : (
            <p className="mt-1.5 text-15 text-ink-soft">Comes from the estimate in step 2.</p>
          )}
        </div>
      </div>

      <fieldset className="grid min-w-0 gap-6 sm:grid-cols-3">
        <legend className="mb-3 text-15 font-semibold">Sign-up received</legend>
        <Field label="Amount with GST">
          <NumberInput value={signUpAmount} onChange={setSignUpAmount} step={1000} />
        </Field>
        <Field label="Received on">
          <input type="date" className={field} value={signUpOn} max={TODAY} onChange={(e) => setSignUpOn(e.target.value)} />
        </Field>
        <Field label="Reference" hint="UTR or cheque number">
          <input type="text" className={field} autoComplete="off" value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
      </fieldset>

      {result && (
        <section aria-label="Payment schedule" className="grid gap-3">
          <p className="text-15 font-semibold">
            Payment schedule <SampleTag>Sample milestones</SampleTag>
          </p>
          <ProgrammeStrip cells={scheduleCells(result.schedule)} size={264} label="Sign-up and ten milestones, all to come." />
          <table className="w-full border-collapse text-15">
            <caption className="sr-only">Sign-up and ten milestones on Part A, with GST</caption>
            <tbody>
              {result.schedule.map((row) => (
                <tr key={row.n} className="border-t border-sand align-baseline">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                    {row.n === 0 ? "Sign-up" : `${row.n}. ${row.name}`}
                  </th>
                  <td className="py-1.5 pr-3 text-right text-ink-soft">{row.percent}%</td>
                  <td className="figure whitespace-nowrap py-1.5 text-right text-17">{inr(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <SaveStep
        draft={draft}
        step={3}
        locked={locked}
        check={check}
        onSaved={onSaved}
        data={() => ({
          agreementFile: files[0],
          signedOn,
          contractValue: value,
          signUp: { amount: signUpAmount, on: signUpOn, reference: reference.trim() },
        })}
      />
    </StepSheet>
  );
}

// ---- Step 4, team and hours ----

export function StepTeam({ draft, locked, onSaved }: StepProps) {
  const firm = useFirm();
  const saved = draft.step4 as Step4Saved | undefined;
  const seedTeam = draft.id === "kulkarni" ? firm.projects.find((p) => p.id === "kulkarni")?.team : undefined;
  const staff = (role: string, seniorOnly = false) =>
    firm.people.filter((p) => p.role === role && p.active && (!seniorOnly || p.senior));
  // Who buys for a site: the procurement team, less anyone given the accounts (the
  // accountant sits in the team but records money; she does not raise POs).
  const buyers = staff("finance").filter((p) => p.teams.includes("Procurement") && !p.access.includes("finance"));

  const [poc, setPoc] = useState<PersonId | "">(saved?.poc ?? seedTeam?.poc ?? "");
  const [head, setHead] = useState<PersonId | "">(saved?.head ?? seedTeam?.head ?? "");
  const [architects, setArchitects] = useState<PersonId[]>(saved?.architects ?? seedTeam?.architects ?? []);
  const [engineer, setEngineer] = useState<PersonId | "">(saved?.engineers?.[0] ?? seedTeam?.engineers[0] ?? "");
  const [procurement, setProcurement] = useState<PersonId | "">(saved?.procurement?.[0] ?? seedTeam?.procurement[0] ?? "");
  const [before, setBefore] = useState(saved?.credits?.before ?? 12);
  const [during, setDuring] = useState(saved?.credits?.during ?? 8);
  const [handoff, setHandoff] = useState(saved?.handoff ?? "");

  const check = () => {
    if (!poc) return "Choose the point of contact.";
    if (!head) return "Choose the Project Head.";
    if (!procurement) return "Choose who buys for this site.";
    return "";
  };

  const select = (value: string, set: (v: PersonId | "") => void, options: { id: PersonId; name: string; title: string }[], none: string) => (
    <select className={field} value={value} onChange={(e) => set(e.target.value as PersonId | "")}>
      <option value="">{none}</option>
      {options.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
  // The chosen person's title, under the label, so the select itself only has to hold a name.
  const titleOf = (id: string, otherwise?: string) => (id ? firm.person(id as PersonId)?.title : undefined) ?? otherwise;

  return (
    <StepSheet step={4} locked={locked}>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Point of contact" hint={titleOf(poc)}>
          {select(poc, setPoc, staff("bd"), "Choose a person")}
        </Field>
        <Field label="Project Head" hint={titleOf(head, "Senior architects only")}>
          {select(head, setHead, staff("architect", true), "Choose a person")}
        </Field>
        <Field label="Site engineer" hint={titleOf(engineer)}>
          {select(engineer, setEngineer, staff("site"), "Not chosen yet")}
        </Field>
        <Field label="Procurement" hint={titleOf(procurement)}>
          {select(procurement, setProcurement, buyers, "Choose a person")}
        </Field>
      </div>
      <ChipGroup label="Architects">
        {staff("architect").map((p) => (
          <Chip
            key={p.id}
            pressed={architects.includes(p.id)}
            onClick={() => setArchitects(architects.includes(p.id) ? architects.filter((a) => a !== p.id) : [...architects, p.id])}
          >
            {p.name}
          </Chip>
        ))}
      </ChipGroup>
      <fieldset className="grid min-w-0 gap-3">
        <legend className="mb-1 text-15 font-semibold">Advisory hours</legend>
        <p className="text-15 text-ink-soft">20 by default: 12 before construction and 8 during. Change them if the agreement says otherwise.</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Before construction">
            <NumberInput value={before} onChange={setBefore} unit="hours" step={0.5} />
          </Field>
          <Field label="During construction">
            <NumberInput value={during} onChange={setDuring} unit="hours" step={0.5} />
          </Field>
        </div>
      </fieldset>
      <Field label="Hand-off note for the Project Head" hint="What the client cares about, and anything promised">
        <textarea rows={3} className={`${field} py-2`} value={handoff} onChange={(e) => setHandoff(e.target.value)} />
      </Field>
      <SaveStep
        draft={draft}
        step={4}
        locked={locked}
        check={check}
        onSaved={onSaved}
        data={() => ({
          poc: poc || undefined,
          head: head || undefined,
          architects,
          engineers: engineer ? [engineer] : [],
          procurement: procurement ? [procurement] : [],
          credits: { before, during },
          handoff: handoff.trim(),
        })}
      />
    </StepSheet>
  );
}
