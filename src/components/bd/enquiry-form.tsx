/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { usePause } from "@/components/register/recording-pause";
import { StaffBoard } from "@/components/register/staff-board";
import type { AssetClass, EnquiryCapture, Facing, ProductPreference, ServiceKind } from "@/lib/bd-data";
import { TODAY } from "@/lib/demo-data";
import { DESK_HREF } from "@/lib/desk";
import { useDemo, useFirm, type EnquiryInput } from "@/lib/demo-store";
import { formatDate } from "@/lib/format";
import {
  ASSET_WORDS,
  CAPTURE_WORDS,
  FACING_WORDS,
  PRODUCT_WORDS,
  phoneKey,
  SERVICE_WORDS,
  UNDER_DISCUSSION,
} from "@/lib/prospects";
import { budgetWords } from "./bd-words";
import { Segmented } from "./bd-ui";
import { ME } from "./prospect-bits";

// The preliminary enquiry, as on Poetry's paper form, so BD can prepare before the meeting.
// The phone and email are checked as they are typed: one held by anyone in the last twelve
// months blocks the save and says who holds it.

type Req = "owner" | "phone" | "locality" | "plotDimensions" | "plotArea" | "facing" | "bedrooms" | "budget";

const REQUIRED_WORDS: Record<Req, string> = {
  owner: "Add the owner's name",
  phone: "Add a 10-digit phone",
  locality: "Add the locality",
  plotDimensions: "Add the dimensions",
  plotArea: "Add the area",
  facing: "Choose the facing",
  bedrooms: "Add the BHK",
  budget: "Add the budget",
};

/** Digits only, for the number fields kept as text so they can be empty. */
function num(text: string): number {
  const n = Number(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid min-w-0 gap-4 border-t border-ink/10 pt-4 first:border-t-0 first:pt-0">
      <legend className="lettering float-left mb-1 w-full text-ink-soft">{title}</legend>
      <div className="grid items-start gap-4 sm:grid-cols-2 [&>label]:h-auto">{children}</div>
    </fieldset>
  );
}

export function EnquiryForm() {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const router = useRouter();
  const submitRef = useRef<HTMLButtonElement>(null);

  const [owner, setOwner] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [occupation, setOccupation] = useState("");
  const [familySize, setFamilySize] = useState("");
  const [dob, setDob] = useState("");
  const [layoutName, setLayoutName] = useState("");
  const [locality, setLocality] = useState("");
  const [plotNo, setPlotNo] = useState("");
  const [plotDimensions, setPlotDimensions] = useState("");
  const [plotArea, setPlotArea] = useState("");
  const [areaTyped, setAreaTyped] = useState(false);
  const [facing, setFacing] = useState<Facing | null>(null);
  const [service, setService] = useState<ServiceKind>("turnkey");
  const [assetClass, setAssetClass] = useState<AssetClass>("villa");
  const [product, setProduct] = useState<ProductPreference>("conventional");
  const [bedrooms, setBedrooms] = useState("");
  const [carParks, setCarParks] = useState("");
  const [budgetLakh, setBudgetLakh] = useState("");
  const [startBy, setStartBy] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [capture, setCapture] = useState<EnquiryCapture>("office");
  const [enquiredOn, setEnquiredOn] = useState(TODAY);
  const [tried, setTried] = useState(false);
  // Once registered, the enquiry holds its own phone: say so, not "blocked", while the page moves on.
  const [saved, setSaved] = useState(false);

  const duplicate = saved ? null : firm.findDuplicate(phone, email);
  const heldWords = duplicate ? `Already registered by ${duplicate.holderName}` : undefined;
  const me = firm.person(ME);
  const waiting = pause.pending !== null;

  const missing: Req[] = [];
  if (!owner.trim()) missing.push("owner");
  if (!phoneKey(phone)) missing.push("phone");
  if (!locality.trim()) missing.push("locality");
  if (!plotDimensions.trim()) missing.push("plotDimensions");
  if (!(num(plotArea) > 0)) missing.push("plotArea");
  if (!facing) missing.push("facing");
  if (!(num(bedrooms) > 0)) missing.push("bedrooms");
  if (!(num(budgetLakh) > 0)) missing.push("budget");
  const errorOf = (key: Req) => (tried && missing.includes(key) ? REQUIRED_WORDS[key] : undefined);

  const onDimensions = (value: string) => {
    setPlotDimensions(value);
    if (areaTyped) return;
    const numbers = value.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    setPlotArea(numbers.length === 2 ? String(Math.round(numbers[0] * numbers[1])) : "");
  };

  const submit = () => {
    setTried(true);
    if (saved || waiting || duplicate || missing.length > 0 || !facing) return;
    const enquiry: EnquiryInput = {
      owner: owner.trim(),
      layoutName: layoutName.trim(),
      locality: locality.trim(),
      service,
      assetClass,
      occupation: occupation.trim(),
      plotDimensions: /ft|m\b/i.test(plotDimensions) ? plotDimensions.trim() : `${plotDimensions.trim()} ft`,
      plotArea: Math.round(num(plotArea)),
      facing,
      startBy: startBy ? `${startBy}-01` : "",
      email: email.trim(),
      phone: phone.trim(),
      bedrooms: Math.round(num(bedrooms)),
      carParks: Math.round(num(carParks)),
      product,
      budget: Math.round(num(budgetLakh) * 100000),
      referredBy: referredBy.trim(),
      enquiredOn,
      familySize: Math.round(num(familySize)),
      dob: dob || undefined,
      plotNo: plotNo.trim() || undefined,
      capture,
    };
    const { registerProspect } = demo;
    pause.start({
      what: `Enquiry, ${enquiry.owner}`,
      origin: submitRef.current,
      commit: () => {
        const result = registerProspect(enquiry, ME, ME);
        if (!result.ok) return;
        setSaved(true);
        router.push(DESK_HREF.prospect(result.id));
      },
    });
  };

  const text = (value: string, set: (v: string) => void, extra: Record<string, string> = {}) => (
    <input className={field} value={value} autoComplete="off" onChange={(e) => set(e.target.value)} {...extra} />
  );

  return (
    <>
      <StaffBoard
        place={UNDER_DISCUSSION}
        headline="New enquiry"
        back={{ label: `Back to ${UNDER_DISCUSSION}`, href: DESK_HREF.prospects }}
        chip={false}
      />

      <form
        className="mt-6 grid items-start gap-4 lg:mt-8 min-[1200px]:grid-cols-[minmax(0,1fr)_20rem]"
        noValidate
        aria-label="New enquiry"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="glass-strong grid min-w-0 gap-6 p-4 sm:p-6">
          <Section title="Owner">
            <Field label="Plot owner" error={errorOf("owner")}>
              {text(owner, setOwner, { autoComplete: "name" })}
            </Field>
            <Field label="Phone" error={duplicate?.on === "phone" ? heldWords : errorOf("phone")}>
              <input
                className={`${field} ${duplicate?.on === "phone" ? "ring-2 ring-brick/60" : ""}`}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={phone}
                aria-invalid={duplicate?.on === "phone" || undefined}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="Email" error={duplicate?.on === "email" ? heldWords : undefined}>
              <input
                className={`${field} ${duplicate?.on === "email" ? "ring-2 ring-brick/60" : ""}`}
                type="email"
                inputMode="email"
                autoComplete="off"
                value={email}
                aria-invalid={duplicate?.on === "email" || undefined}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Occupation">{text(occupation, setOccupation)}</Field>
            <Field label="Family size">{text(familySize, setFamilySize, { inputMode: "numeric" })}</Field>
            <Field label="Date of birth">
              <input type="date" className={field} value={dob} max={TODAY} onChange={(e) => setDob(e.target.value)} />
            </Field>
          </Section>

          <Section title="Plot">
            <Field label="Layout or community">{text(layoutName, setLayoutName)}</Field>
            <Field label="Locality" error={errorOf("locality")}>
              {text(locality, setLocality)}
            </Field>
            <Field label="Plot no.">{text(plotNo, setPlotNo)}</Field>
            <Field label="Dimensions, ft" error={errorOf("plotDimensions")}>
              {text(plotDimensions, onDimensions, { placeholder: "40 x 60" })}
            </Field>
            <Field label="Area, sq ft" error={errorOf("plotArea")}>
              {text(
                plotArea,
                (v) => {
                  setPlotArea(v);
                  setAreaTyped(v.trim() !== "");
                },
                { inputMode: "numeric" },
              )}
            </Field>
            <div className="grid content-start gap-1.5">
              <Segmented
                label="Facing"
                showLabel
                invalid={Boolean(errorOf("facing"))}
                options={(Object.keys(FACING_WORDS) as Facing[]).map((f) => ({ id: f, label: f, title: FACING_WORDS[f] }))}
                value={facing}
                onChange={(f) => setFacing(f)}
              />
              {errorOf("facing") && (
                <p className="text-15 font-semibold text-brick" role="alert">
                  {errorOf("facing")}
                </p>
              )}
            </div>
          </Section>

          <Section title="Home">
            <Segmented
              label="Service"
              showLabel
              options={(Object.keys(SERVICE_WORDS) as ServiceKind[]).map((s) => ({ id: s, label: SERVICE_WORDS[s] }))}
              value={service}
              onChange={(s) => setService(s)}
            />
            <Segmented
              label="Product"
              showLabel
              options={(Object.keys(PRODUCT_WORDS) as ProductPreference[]).map((s) => ({ id: s, label: PRODUCT_WORDS[s] }))}
              value={product}
              onChange={(s) => setProduct(s)}
            />
            <Segmented
              className="sm:col-span-2"
              label="Asset class"
              showLabel
              options={(Object.keys(ASSET_WORDS) as AssetClass[]).map((s) => ({ id: s, label: ASSET_WORDS[s] }))}
              value={assetClass}
              onChange={(s) => setAssetClass(s)}
            />
            <Field label="Bedrooms (BHK)" error={errorOf("bedrooms")}>
              {text(bedrooms, setBedrooms, { inputMode: "numeric" })}
            </Field>
            <Field label="Car parks">{text(carParks, setCarParks, { inputMode: "numeric" })}</Field>
            <Field label="Budget, ₹ lakh" hint={num(budgetLakh) > 0 ? budgetWords(num(budgetLakh) * 100000) : undefined} error={errorOf("budget")}>
              {text(budgetLakh, setBudgetLakh, { inputMode: "decimal" })}
            </Field>
            <Field label="Start building">
              <input type="month" className={field} value={startBy} min={TODAY.slice(0, 7)} onChange={(e) => setStartBy(e.target.value)} />
            </Field>
          </Section>

          <Section title="Source">
            <Field label="Referred by">{text(referredBy, setReferredBy)}</Field>
            <Field label="Date of enquiry">
              <input type="date" className={field} value={enquiredOn} max={TODAY} onChange={(e) => setEnquiredOn(e.target.value || TODAY)} />
            </Field>
            <Segmented
              className="sm:col-span-2"
              label="Taken"
              showLabel
              options={(Object.keys(CAPTURE_WORDS) as EnquiryCapture[]).map((s) => ({ id: s, label: CAPTURE_WORDS[s] }))}
              value={capture}
              onChange={(s) => setCapture(s)}
            />
          </Section>
        </div>

        <aside className="grid gap-3 min-[1200px]:sticky min-[1200px]:top-6">
          <section aria-live="polite" aria-label="Duplicate check" className={duplicate ? "glass-strong grid gap-2 p-4 ring-2 ring-brick/50" : "glass grid gap-2 p-4"}>
            {duplicate ? (
              <>
                <span className="glass-chip chip-late justify-self-start">Blocked</span>
                <p className="text-17 font-semibold text-ink">
                  Already registered by {duplicate.holderName} on {formatDate(duplicate.since)}
                </p>
                <p className="text-13 text-ink-soft">
                  {duplicate.name} · same {duplicate.on} · held to {formatDate(duplicate.until)}
                </p>
                {duplicate.kind === "prospect" && duplicate.holder === ME ? (
                  <Link href={DESK_HREF.prospect(duplicate.ref)} className="btn btn-glass min-h-11 justify-self-start px-4 text-15">
                    Open {duplicate.name}
                  </Link>
                ) : (
                  <p className="text-13 text-ink-soft">Only the admin can reassign</p>
                )}
              </>
            ) : (
              <>
                <span className={`glass-chip justify-self-start ${phoneKey(phone) || email.includes("@") ? "chip-done" : ""}`}>
                  {phoneKey(phone) || email.includes("@") ? "Not registered" : "Phone and email checked live"}
                </span>
                <p className="text-13 text-ink-soft">Advisor · {me?.name ?? "Rohan Menon"}</p>
              </>
            )}
          </section>

          {tried && missing.length > 0 && !duplicate && (
            <p className="glass px-4 py-3 text-15 font-semibold text-brick" role="alert">
              {missing.length === 1 ? REQUIRED_WORDS[missing[0]] : `${missing.length} fields to fill`}
            </p>
          )}

          <button
            ref={submitRef}
            type="submit"
            className="btn btn-primary min-h-12 w-full"
            aria-disabled={duplicate || waiting ? true : undefined}
          >
            {saved ? "Registered" : duplicate ? "Cannot register" : "Register enquiry"}
          </button>
        </aside>
      </form>
    </>
  );
}
