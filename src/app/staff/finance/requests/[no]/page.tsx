import { Suspense } from "react";
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
  const { no } = await params;
  return <RequestDetail no={decodeURIComponent(no)} />;
}
