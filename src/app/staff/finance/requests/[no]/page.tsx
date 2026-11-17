/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requestNumberOf } from "@/app/staff/request-guard";
import { RequestDetail } from "@/components/finance/request-detail";
import { REQUEST_NUMBERS } from "@/lib/firm-data";

// One material request: its lines and report on the left, the Zoho PO linked on the right.
// Numbers raised in the demo are built ahead, so a request sent in this tab can open.
export function generateStaticParams() {
  return REQUEST_NUMBERS.map((no) => ({ no }));
}

export default function FinanceRequestPage({ params }: PageProps<"/staff/finance/requests/[no]">) {
  return (
    <Suspense>
      <DetailFromParams params={params} />
    </Suspense>
  );
}

async function DetailFromParams({ params }: { params: Promise<{ no: string }> }) {
  const no = requestNumberOf((await params).no);
  if (!no) notFound();
  return <RequestDetail no={no} />;
}
