/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { APPRAISED_IDS } from "@/components/admin/appraisal-data";
import { AppraisalReport } from "@/components/admin/appraisal-report";
import type { PersonId } from "@/lib/firm-data";

// One person's appraisal for a period, printable. `?period=cycle|quarter|year`. The seed's
// people are built ahead; anyone added in this tab under People ("new-<name>") opens on demand,
// and the report itself says "Not found" for an id the tab does not know.
const PERSON_ID = /^[a-z][a-z0-9-]{0,80}$/;

export function generateStaticParams() {
  return APPRAISED_IDS.map((person) => ({ person }));
}

export default function AdminAppraisalPage({
  params,
  searchParams,
}: {
  params: Promise<{ person: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense>
      <ReportFromParams params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportFromParams({
  params,
  searchParams,
}: {
  params: Promise<{ person: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = (await params).person;
  if (!PERSON_ID.test(id)) notFound();
  const period = (await searchParams).period;
  return <AppraisalReport person={id as PersonId} initialPeriod={typeof period === "string" ? period : undefined} />;
}
