import { Suspense } from "react";
import { RequestDetail } from "@/components/site/request-detail";
import { REQUEST_NUMBERS } from "@/lib/firm-data";

// The seed requests, and the numbers the demo will hand out next, so a request raised in
// this tab can be opened too.
export function generateStaticParams() {
  return REQUEST_NUMBERS.map((no) => ({ no }));
}

export default function SiteRequestPage({ params }: PageProps<"/staff/site/requests/[no]">) {
  return (
    <Suspense>
      <RequestFromParams params={params} />
    </Suspense>
  );
}

async function RequestFromParams({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  return <RequestDetail no={no} />;
}
