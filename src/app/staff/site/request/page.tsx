import { Suspense } from "react";
import { RequestFormFromParams } from "@/components/site/request-form";

// A material request from site. A task card's Request link fills it in through the address.
export default function SiteRequestPage() {
  return (
    <Suspense>
      <RequestFormFromParams />
    </Suspense>
  );
}
