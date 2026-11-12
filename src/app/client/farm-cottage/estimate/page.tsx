"use client";

import Link from "next/link";
import { EstimateDecision, ScheduleDecision } from "@/components/cottage/cottage-decisions";
import { Sheet } from "@/components/home/sheet";
import { ClientPage } from "@/components/page-band";
import { usePause } from "@/components/register/recording-pause";
import { EstimateSheet } from "@/components/reports/estimate-sheet";
import { useFirm } from "@/lib/demo-store";
import { cottageEstimate } from "@/lib/firm-data";
import { formatStamp, inr } from "@/lib/format";

// The cottage's final estimate as Poetry issued it, then her two decisions: the estimate,
// which becomes Addendum 1, and the payment schedule on it. On a phone the estimate is long,
// so while it is undecided a slim bar above the tab bar takes her to the decision.

export default function CottageEstimatePage() {
  const firm = useFirm();
  const pause = usePause();
  const estimateApproved = firm.cottage.estimate === "approved";
  const at = firm.cottage.approvedAt;

  return (
    <ClientPage
      head={
        <>
          <h1 className="display display-xl max-w-[18ch] text-balance">
            {estimateApproved
              ? "Your final estimate is approved."
              : `${inr(cottageEstimate.total)} for your cottage, with GST.`}
          </h1>
          <p className="mt-4 max-w-[52ch] text-17 text-lime/80">
            {estimateApproved && at
              ? `Recorded as Addendum 1 on ${formatStamp(at)}.`
              : "This is the house itself. Approving it makes it Addendum 1 to your agreement."}
          </p>
          <Link
            href="/client/farm-cottage"
            className="link mt-3 inline-flex min-h-11 items-center text-17 text-lime/80 hover:text-lime"
          >
            Back to the cottage
          </Link>
        </>
      }
    >
      <Sheet title="The estimate">
        <EstimateSheet projectId="iyer-cottage" quiet />
        {/* Below 1024 px, while undecided: a slim bar above the tab bar while the estimate is read. It
            belongs to this sheet, so it leaves with the estimate and never sits over the decision. */}
        {!estimateApproved && pause.pending === null && (
          <div className="no-print sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom)+var(--trial-h,0px))] z-10 -mx-4 mt-6 border-t border-sand bg-paper sm:-mx-8 lg:hidden">
            <div className="flex min-h-14 items-center justify-between gap-3 px-4 sm:px-8">
              <p className="text-15">Ready to decide?</p>
              <a href="#decide" className="btn btn-quiet min-h-11 px-4">
                Go to your decision
              </a>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet id="decide" title="Your decision">
        <EstimateDecision />
      </Sheet>

      <Sheet id="schedule" title="Your payment schedule" tone="sand">
        <p className="mb-5 max-w-[58ch] text-17">
          Eleven payments on {inr(cottageEstimate.amount)} before GST, as set out at the end of the estimate. Your
          sign-up is already paid.
        </p>
        <ScheduleDecision />
      </Sheet>
    </ClientPage>
  );
}
