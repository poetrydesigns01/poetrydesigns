"use client";

import { useState } from "react";
import { Chip, ChipGroup } from "@/components/register/chips";
import { EmailPreview } from "@/components/register/email-preview";
import { SampleTag } from "@/components/register/sample-tag";
import { StaffBoard } from "@/components/register/staff-board";
import { useFirm } from "@/lib/demo-store";
import { emailRules } from "@/lib/firm-data";
import { formatStampShort, inr } from "@/lib/format";
import { dayWords, vendorWhat } from "./admin-data";
import { CatalogueTab } from "./catalogue-tab";
import { TemplatesTab } from "./templates-tab";
import { StruckNote, TwoStepDelete } from "./two-step-delete";

// The admin's setup: category templates, the material catalogue, vendors, the email rules,
// and the platform's status. One tab at a time; the choice is kept on the page.

type Tab = "templates" | "catalogue" | "vendors" | "emails" | "platform";

const TABS: { id: Tab; label: string }[] = [
  { id: "templates", label: "Templates" },
  { id: "catalogue", label: "Catalogue" },
  { id: "vendors", label: "Vendors" },
  { id: "emails", label: "Emails" },
  { id: "platform", label: "Platform" },
];

const HEADLINES: Record<Tab, string> = {
  templates: "Four category templates.",
  catalogue: "The material catalogue.",
  vendors: "Vendors and their last rates.",
  emails: "Who is emailed for what.",
  platform: "The platform.",
};

const STATES: Record<Tab, string> = {
  templates: "The milestones, shares and rate a new project starts from.",
  catalogue: "What site engineers can request, with units and subcategories.",
  vendors: "Procurement keeps the rates up to date. Only admin can delete a vendor.",
  emails: "Emails go out only for these events. This demo sends none.",
  platform: "What runs behind the portal.",
};

export function SetupPage() {
  const [tab, setTab] = useState<Tab>("templates");
  return (
    <>
      <StaffBoard place="Setup" headline={HEADLINES[tab]} state={STATES[tab]} chip={false} />
      <div className="mt-8 grid gap-8">
        <ChipGroup label="Show">
          {TABS.map((t) => (
            <Chip key={t.id} pressed={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </Chip>
          ))}
        </ChipGroup>
        {tab === "templates" && <TemplatesTab />}
        {tab === "catalogue" && <CatalogueTab />}
        {tab === "vendors" && <VendorsTab />}
        {tab === "emails" && <EmailsTab />}
        {tab === "platform" && <PlatformTab />}
      </div>
    </>
  );
}

/** "each" for things counted in pieces, "per bag" otherwise, as procurement says it after the rate. */
function perWords(unit: string): string {
  return unit === "each" || unit === "nos" ? "each" : `per ${unit}`;
}

function VendorsTab() {
  const firm = useFirm();
  const materialName = (id: string) => firm.catalogueAll.find((item) => item.id === id)?.name ?? id;
  return (
    <section aria-label="Vendors" className="grid gap-3">
      <h2 className="register-title flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span>Vendors</span>
        <SampleTag>GSTIN, phone and area are samples</SampleTag>
      </h2>
      <ul className="sheet-rows ruled">
        {firm.vendors.map((v) => {
          const gone = v.deleted;
          return (
            <li key={v.id} className="grid gap-2 py-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4">
              <div className="min-w-0">
                <p className={`text-17 font-semibold ${gone ? "text-ink-soft" : ""}`}>
                  {gone ? <s>{v.name}</s> : v.name}
                </p>
                <p className="max-w-[56ch] text-15 text-ink-soft">
                  {v.area}. GSTIN {v.gstin}. <span className="whitespace-nowrap">{v.phone}</span>.
                </p>
                {!gone && v.rates.length > 0 && (
                  <div className="mt-1 max-w-[40rem]">
                    <ul className="grid text-15">
                      {v.rates.map((r) => (
                        <li
                          key={`${r.material}-${r.sub}`}
                          className="flex flex-wrap items-baseline justify-between gap-x-4 border-t border-sand py-1"
                        >
                          <span className="min-w-0">
                            {materialName(r.material)}, {r.sub}
                          </span>
                          <span className="whitespace-nowrap">
                            {inr(r.rate)} {perWords(r.unit)}
                            <span className="text-ink-soft">, {dayWords(r.on)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="lettering text-ink-soft">All before GST.</p>
                  </div>
                )}
                {gone && (
                  <StruckNote
                    by={firm.person(gone.by)?.name ?? gone.by}
                    at={formatStampShort(gone.at)}
                    reason={gone.reason}
                  />
                )}
              </div>
              {!gone && (
                <TwoStepDelete
                  question={`Delete ${v.name}?`}
                  what={vendorWhat(v.name)}
                  target={{ kind: "vendor", vendorId: v.id }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EmailsTab() {
  return (
    <section aria-label="Emails" className="grid gap-6">
      <div>
        <h2 className="register-title">The email rules</h2>
        <table className="mt-2 w-full border-collapse text-15">
          <thead className="sr-only sm:not-sr-only">
            <tr className="border-b border-sand">
              <th scope="col" className="py-2 pr-4 text-left font-semibold">
                When
              </th>
              <th scope="col" className="py-2 text-left font-semibold">
                Emailed to
              </th>
            </tr>
          </thead>
          <tbody>
            {emailRules.map((rule) => (
              <tr key={rule.event} className="grid border-b border-sand py-2 sm:table-row sm:py-0">
                <th scope="row" className="pr-4 text-left font-semibold sm:py-2.5 sm:align-top">
                  {rule.event}
                </th>
                <td className="text-ink-soft sm:py-2.5 sm:align-top">{rule.to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-1">
        <h3 className="text-17 font-semibold">Sample emails</h3>
        <EmailPreview
          label="See a sample email: payment raised"
          to="Meera Iyer, meera.iyer@example.com"
          subject="Iyer Residence: milestone 3 is ready for your approval"
          body={[
            "Hello Meera,",
            "Suresh Gowda marked the first floor structure finished on 6 Nov, and Vikram Desai has raised the payment for milestone 3, ₹10,27,780 with GST.",
            "Open the portal to accept the stage and approve the payment. Your demand letter for the bank is written once you approve.",
          ]}
        />
        <EmailPreview
          label="See a sample email: material request raised"
          to="Prakash Hegde, procurement"
          subject="MR-2026-0142, Iyer Residence: cement, OPC 53 grade, 50 bags"
          body={[
            "Suresh Gowda raised a material request for Iyer Residence, milestone 4.",
            "Cement, OPC 53 grade, 50 bags. Needed by 14 Nov.",
            "Open the request in the portal to mark it seen and link the PO.",
          ]}
        />
        <EmailPreview
          label="See a sample email: hours added"
          to="Meera Iyer and Divya Shenoy"
          subject="Iyer Residence: 5 advisory hours added"
          body={[
            "Rohan Menon added 5 hours to your advisory time after your payment of ₹25,000 before GST was received.",
            "You can see your hours, and every session, on the Hours page of the portal.",
          ]}
        />
      </div>
    </section>
  );
}

function PlatformTab() {
  return (
    <section aria-label="Platform" className="grid max-w-[68ch] gap-4">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-17">
        Backed up today at 2:00 am. <SampleTag>Demo</SampleTag>
      </p>
      <p className="text-17">
        Signing in, short-lived links and email sending are back-end work and are not part of this demo.
      </p>
      <details>
        <summary className="lettering inline-flex min-h-11 cursor-pointer items-center underline decoration-1 underline-offset-4">
          Not in phase 1
        </summary>
        <p className="text-15 text-ink-soft">
          Stock beyond the delivered mark, making POs inside the portal, a vendor portal, WhatsApp messages, phone apps
          and a payment gateway. POs are made in Zoho Books and uploaded here.
        </p>
      </details>
    </section>
  );
}
