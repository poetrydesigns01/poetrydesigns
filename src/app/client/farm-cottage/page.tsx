"use client";

import Link from "next/link";
import { NeedRow } from "@/components/cottage/need-row";
import { PlotOutline } from "@/components/instruments/plot-outline";
import { ClientPage, Sheet } from "@/components/page-band";
import { client, withGst } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import { cottageEstimate } from "@/lib/firm-data";
import { formatDate, formatStamp, hours, inr } from "@/lib/format";

// Meera's second house, in design. Nothing is built yet, so the table holds the plot as it
// was set out, and her seal lands on it once she approves the final estimate. The page
// answers what needs her (the estimate, then the schedule), what she has agreed to, her
// hours before construction and who to call.

export default function FarmCottageHome() {
  const demo = useDemo();
  const firm = useFirm();
  const cottage = firm.project("iyer-cottage");
  const estimateApproved = firm.cottage.estimate === "approved";
  const scheduleApproved = firm.cottage.schedule === "approved";
  const scheduleAt = demo.events.find((e) => e.kind === "cottage-schedule.approved")?.at;
  const credits = firm.credits.find((c) => c.projectId === "iyer-cottage");
  if (!cottage) return null;

  const signUp = cottage.milestones.find((m) => m.n === 0);
  const poc = firm.person(cottage.team.poc);
  const head = firm.person(cottage.team.head);
  const beforeLeft = credits ? credits.before.granted - credits.before.used : 0;

  let headline: string;
  let sentence: string;
  let primary: { label: string; href: string } | null = null;
  if (!estimateApproved) {
    headline = `Your final estimate is ready, ${client.firstName}.`;
    sentence = `It is valid until ${formatDate(cottageEstimate.validUntil)}.`;
    primary = { label: "Review the estimate", href: "/client/farm-cottage/estimate" };
  } else if (!scheduleApproved) {
    headline = `Your payment schedule is ready, ${client.firstName}.`;
    sentence = "The estimate is approved. The schedule sets when each payment falls due.";
    primary = { label: "Review the schedule", href: "/client/farm-cottage/estimate#schedule" };
  } else {
    headline = `Nothing needs you on the cottage, ${client.firstName}.`;
    sentence = "Your estimate and payment schedule are approved. The drawings come next.";
  }

  return (
    <ClientPage
      head={
        <>
          <h1 className="display display-xl max-w-[16ch] text-balance">{headline}</h1>
          <p className="mt-4 max-w-[52ch] text-17 text-lime/80">{sentence}</p>
          {primary && (
            <Link href={primary.href} className="btn btn-primary mt-6">
              {primary.label}
            </Link>
          )}
        </>
      }
      table={
        <div className="mx-auto grid w-full max-w-[26rem] gap-4 py-2 lg:max-w-[max(26rem,min(44rem,90%))] lg:pt-10">
          {/* Drawn at 280 and let grow with the table: the full column on a laptop, up to 704 px on a wide screen. */}
          <div className="mx-auto w-full max-w-[280px] lg:mx-0 lg:max-w-none [&_svg]:w-full">
            <PlotOutline pegs={4} size={280} tone="dark" sealed={estimateApproved} />
          </div>
          <p className="max-w-[40ch] text-17 text-lime/80">
            Your plot at {cottage.place}, set out. Nothing is built yet.
            {estimateApproved && " The seal marks the estimate you approved."}
          </p>
        </div>
      }
    >
      <Sheet title="What needs you">
        {estimateApproved && scheduleApproved ? (
          <p className="max-w-[58ch] text-17">
            All done for now. We email you when a drawing or a payment is ready.
          </p>
        ) : (
          <div className="sheet-rows">
            {!estimateApproved && (
              <NeedRow
                href="/client/farm-cottage/estimate"
                title="The estimate for your cottage"
                figure={inr(cottageEstimate.total)}
                line="With GST, for the house. Approving it makes it Addendum 1 to your agreement."
              />
            )}
            <NeedRow
              href="/client/farm-cottage/estimate#schedule"
              title="When each payment falls due"
              line={
                estimateApproved
                  ? `Sign-up and ten milestones on ${inr(cottageEstimate.amount)} before GST.`
                  : `Sign-up and ten milestones on ${inr(cottageEstimate.amount)} before GST, once the estimate is approved.`
              }
            />
          </div>
        )}
      </Sheet>

      <Sheet title="What you have agreed to" tone="sand">
        <ul className="sheet-rows max-w-[58ch] text-17">
          <li>
            Agreement signed on {formatDate(cottage.signedOn ?? "")}, {inr(cottage.originalValue)} before GST.
          </li>
          {signUp && (
            <li>
              Sign-up {inr(withGst(signUp.amount).total)} with GST
              {signUp.paidOn ? `, paid on ${formatDate(signUp.paidOn)}.` : "."}
            </li>
          )}
          {estimateApproved && firm.cottage.approvedAt && (
            <li>
              The final estimate, approved on {formatStamp(firm.cottage.approvedAt)} as Addendum 1. Your cottage is now{" "}
              {inr(cottage.contractValue)} before GST.
            </li>
          )}
          {scheduleApproved && scheduleAt && <li>The payment schedule, approved on {formatStamp(scheduleAt)}.</li>}
          <li>
            <Link
              href="/client/record"
              onClick={() => demo.setClientProject("iyer-cottage")}
              className="link inline-flex min-h-11 items-center font-semibold"
            >
              Your agreement and every decision
            </Link>
          </li>
        </ul>
      </Sheet>

      <Sheet title="Your hours">
        {credits && (
          <p className="max-w-[58ch] text-17">
            {hours(beforeLeft).split(" ")[0]} of {credits.before.granted} hours left before construction.
          </p>
        )}
      </Sheet>

      <Sheet title="Your team">
        <ul className="sheet-rows max-w-[58ch] text-17">
          {poc && (
            <li>
              Start with {poc.name}, client relations.{" "}
              <a href={`tel:${poc.phone.replace(/\s/g, "")}`} className="link inline-flex min-h-11 items-center whitespace-nowrap">
                {poc.phone}
              </a>
            </li>
          )}
          {head && (
            <li>
              Then {head.name}, Project Head.{" "}
              <a href={`tel:${head.phone.replace(/\s/g, "")}`} className="link inline-flex min-h-11 items-center whitespace-nowrap">
                {head.phone}
              </a>
            </li>
          )}
        </ul>
      </Sheet>
    </ClientPage>
  );
}
