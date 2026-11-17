/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useState } from "react";
import { EmailPreview } from "@/components/register/email-preview";
import { StaffBoard } from "@/components/register/staff-board";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import { emailRules } from "@/lib/firm-data";
import { formatShortDate, formatStampShort, inr } from "@/lib/format";
import { vendorWhat } from "./admin-data";
import { CatalogueTab } from "./catalogue-tab";
import { Count, GlassTable, Icon, Panel, Segments } from "./glass-kit";
import { TemplatesTab } from "./templates-tab";
import { StruckNote, TwoStepDelete } from "./two-step-delete";
import { WorkflowTab } from "./workflow-tab";

// The admin's setup: the project workflow, category templates, the material catalogue, vendors, the email rules
// and the platform. One tab at a time.

type Tab = "workflow" | "templates" | "catalogue" | "vendors" | "emails" | "platform";

const TABS: { id: Tab; label: string }[] = [
  { id: "workflow", label: "Workflow" },
  { id: "templates", label: "Templates" },
  { id: "catalogue", label: "Catalogue" },
  { id: "vendors", label: "Vendors" },
  { id: "emails", label: "Emails" },
  { id: "platform", label: "Platform" },
];

const HEADLINES: Record<Tab, string> = {
  workflow: "Project workflow",
  templates: "Category templates",
  catalogue: "Material catalogue",
  vendors: "Vendors",
  emails: "Email rules",
  platform: "Platform",
};

export function SetupPage() {
  const [tab, setTab] = useState<Tab>("workflow");
  return (
    <>
      <StaffBoard place="Setup" headline={HEADLINES[tab]} chip={false} />
      <div className="mt-6 grid gap-5">
        <Segments<Tab> label="Setup" value={tab} onChange={setTab} options={TABS} />
        {tab === "workflow" && <WorkflowTab />}
        {tab === "templates" && <TemplatesTab />}
        {tab === "catalogue" && <CatalogueTab />}
        {tab === "vendors" && <VendorsTab />}
        {tab === "emails" && <EmailsTab />}
        {tab === "platform" && <PlatformTab />}
      </div>
    </>
  );
}

/** "each" for things counted in pieces, "per bag" otherwise. */
function perWords(unit: string): string {
  return unit === "each" || unit === "nos" ? "each" : `per ${unit}`;
}

function VendorsTab() {
  const firm = useFirm();
  const materialName = (id: string) => firm.catalogueAll.find((item) => item.id === id)?.name ?? id;
  const live = firm.vendors.filter((v) => !v.deleted).length;
  return (
    <Panel title="Vendors" aside={<Count n={live} />} strong>
      <ul className="grid gap-1">
        {firm.vendors.map((v) => {
          const gone = v.deleted;
          return (
            <li key={v.id} className={`glass-row grid gap-3 px-3 py-3 ${gone ? "opacity-70" : ""}`}>
              <div className="grid items-start gap-3 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]">
                <div className="grid min-w-0 gap-0.5">
                  <span className="text-15 font-semibold">{gone ? <s>{v.name}</s> : v.name}</span>
                  <span className="inline-flex items-center gap-1 text-13 text-ink-soft">
                    <Icon name="pin" className="size-3" />
                    {v.area}
                  </span>
                  <span className="text-13 text-ink-soft">{v.gstin}</span>
                </div>
                {gone ? (
                  <div className="grid justify-items-start gap-1">
                    <StatusChip tone="locked">Deleted</StatusChip>
                    <StruckNote by={firm.person(gone.by)?.name ?? gone.by} at={formatStampShort(gone.at)} reason={gone.reason} />
                  </div>
                ) : (
                  <ul className="grid gap-0.5 text-15">
                    {v.rates.map((r) => (
                      <li key={`${r.material}-${r.sub}`} className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-ink-soft">
                          {materialName(r.material)}, {r.sub}
                        </span>
                        <span className="figure">{inr(r.rate)}</span>
                        <span className="text-13 text-ink-soft">
                          {perWords(r.unit)} · {formatShortDate(r.on)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {!gone && (
                  <div className="md:justify-self-end">
                    <TwoStepDelete
                      quiet
                      question={`Delete ${v.name}?`}
                      what={vendorWhat(v.name)}
                      target={{ kind: "vendor", vendorId: v.id }}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function EmailsTab() {
  return (
    <div className="grid gap-5">
      <Panel title="Who is emailed" aside={<Count n={emailRules.length} />} strong>
        <GlassTable<{ event: string; to: string }>
          caption="Email rules"
          rows={emailRules}
          rowKey={(r) => r.event}
          columns={[
            { label: "When", cell: (r) => r.event },
            { label: "Emailed to", cell: (r) => <span className="font-normal text-ink-soft">{r.to}</span> },
          ]}
        />
      </Panel>
      <Panel title="Samples">
        <div className="grid gap-1 px-1">
          <EmailPreview
            label="Payment raised"
            to="Meera Iyer, meera.iyer@example.com"
            subject="Iyer Residence: instalment 3 demand letter"
            body={[
              "Hello Meera,",
              "The demand letter for instalment 3 is raised: ₹10,27,780 with GST.",
              "Open the portal to see it and mark the payment made once you have paid.",
            ]}
          />
          <EmailPreview
            label="Material request raised"
            to="Prakash Hegde, procurement"
            subject="MR-2026-0142, Iyer Residence: cement, OPC 53 grade, 50 bags"
            body={["Suresh Gowda raised a material request for Iyer Residence.", "Cement, OPC 53 grade, 50 bags. Needed by 14 Nov."]}
          />
          <EmailPreview
            label="Hours added"
            to="Meera Iyer and Divya Shenoy"
            subject="Iyer Residence: 5 advisory hours added"
            body={["5 hours were added to your advisory time after your payment was received."]}
          />
        </div>
      </Panel>
    </div>
  );
}

function PlatformTab() {
  const tiles: { label: string; value: string; chip: { words: string; tone: "done" | "locked" } }[] = [
    { label: "Backup", value: "Today, 2:00 am", chip: { words: "Done", tone: "done" } },
    { label: "Purchase orders", value: "Zoho Books", chip: { words: "Uploaded here", tone: "done" } },
  ];
  const later = ["Stock tracking", "POs inside the portal", "Vendor portal", "WhatsApp", "Phone apps", "Payment gateway"];
  return (
    <div className="grid gap-5">
      <section aria-label="Status" className="grid gap-3 sm:grid-cols-2">
        {tiles.map((t) => (
          <div key={t.label} className="glass grid content-start gap-1 p-4">
            <p className="lettering text-ink-soft">{t.label}</p>
            <p className="text-17 font-semibold">{t.value}</p>
            <StatusChip tone={t.chip.tone} className="justify-self-start">
              {t.chip.words}
            </StatusChip>
          </div>
        ))}
      </section>
      <Panel title="Not in phase 1">
        <div className="flex flex-wrap gap-1.5 px-1">
          {later.map((words) => (
            <StatusChip key={words} tone="locked">
              {words}
            </StatusChip>
          ))}
        </div>
      </Panel>
    </div>
  );
}
