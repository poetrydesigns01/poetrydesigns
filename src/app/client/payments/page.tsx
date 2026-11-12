"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { AskForChanges } from "@/components/changes/ask-changes";
import { ApproveControl, DECISION_BAR } from "@/components/craft/approve-control";
import { Seal, useOnHidden } from "@/components/craft/seal";
import { FocusTarget, Sheet, useFocusedId } from "@/components/home/sheet";
import { House } from "@/components/house/house";
import { HouseCaption } from "@/components/house/house-caption";
import { SamplePhoto } from "@/components/instruments/sample-photo";
import { ClientPage } from "@/components/page-band";
import { PaymentRule, withHandover } from "@/components/payments/payment-rule";
import { SawnCell } from "@/components/payments/sawn-cell";
import { paidWords, Schedule } from "@/components/payments/schedule";
import { SampleTag } from "@/components/register/sample-tag";
import { client, milestones as seedMilestones, TODAY } from "@/lib/demo-data";
import { useDemo, useProjection } from "@/lib/demo-store";
import { formatDate, formatShortDate, formatStamp, inr } from "@/lib/format";
import { STOPS, TODAY_STOP } from "@/lib/house-model";
import type { ProjectedMilestone } from "@/lib/projection";

const LAST_STOP = STOPS.length - 1;
/** The milestone waiting when the demo starts. Its approval has its own writer in the store. */
const SEED_DUE = seedMilestones.find((m) => m.status === "awaiting-approval")?.id ?? -1;
/** When she approved the schedule as it was signed. */
const SCHEDULE_APPROVED_AT = "2026-01-14T18:20";
// The house, the rule and its buttons share one width, so each division sits under the house.
const INSTRUMENT = "mx-auto w-full max-w-[calc(max(34svh,180px)*720/440)] lg:max-w-[calc(58svh*720/440)]";

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** The sentence under the house for one stop of the rule, with its tag and any letter to open. */
function captionFor(stop: number, milestone: ProjectedMilestone): { tag: string; words: string; letter: boolean } {
  const amount = inr(milestone.agreedTotal);
  const buys = STOPS[stop].buys;

  if (stop < TODAY_STOP || milestone.money === "paid") {
    const when = milestone.paidOn ? `On ${formatDate(milestone.paidOn)} you` : "You";
    return {
      tag: stop < TODAY_STOP ? "Looking back" : "Today",
      words:
        milestone.id === 0
          ? `${when} paid the sign-up advance of ${amount}. ${buys.charAt(0).toUpperCase()}${buys.slice(1)}.`
          : `${when} paid ${amount} for ${buys}.`,
      letter: Boolean(milestone.letterNo),
    };
  }
  if (stop === TODAY_STOP) {
    return { tag: "Today", words: `Today the house stands here, at the ${lowerFirst(milestone.name)}.`, letter: false };
  }
  // Nothing after today is promised: every later stop is a forecast.
  const when = milestone.expected ?? "Later";
  return { tag: "Forecast", words: `In ${when}: ${buys}. ${amount}.`, letter: false };
}

function StepButton({
  off,
  label,
  className = "",
  onClick,
  children,
}: {
  /** Nothing further that way. It stays in the tab order, so focus is never dropped. */
  off?: boolean;
  /** The full name, where the words on the button are shortened for a phone. */
  label?: string;
  className?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`btn btn-quiet ${className}${off ? " opacity-45" : ""}`}
      style={{ paddingInline: "0.875rem" }}
      aria-label={label}
      aria-disabled={off || undefined}
      onClick={() => {
        if (!off) onClick();
      }}
    >
      {children}
    </button>
  );
}

export default function PaymentsPage() {
  const demo = useDemo();
  const projection = useProjection();
  const focused = useFocusedId();
  const tableRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLInputElement>(null);
  const [stop, setStop] = useState(TODAY_STOP);

  // Coming back to this screen, the rule rests on today.
  useOnHidden(tableRef, () => setStop(TODAY_STOP));

  const milestones = withHandover(projection.milestones, projection.handoverAgreed);
  // The payment that is waiting or approved; once paid in this tab, it stays here to say so.
  const current =
    milestones.find((m) => m.money === "due") ??
    milestones.find((m) => m.money === "approved") ??
    [...milestones].reverse().find((m) => m.money === "paid" && m.approvedAt?.startsWith(TODAY));
  const approved = current !== undefined && current.money !== "due";
  const accepted = Boolean(current?.acceptedAt);
  const stage = projection.stage && projection.stage.n === current?.id ? projection.stage : null;
  const change = projection.scheduleChange;
  const shown = milestones[stop];
  const caption = captionFor(stop, shown);
  const valueMoved = current ? current.agreedAmount !== current.amount : false;

  const goTo = (next: number) => setStop(Math.min(Math.max(next, 0), LAST_STOP));
  const backToToday = () => {
    setStop(TODAY_STOP);
    // The button goes once the rule is back on today, so focus moves to the rule.
    ruleRef.current?.focus({ preventScroll: true });
  };

  /** From a row of the schedule. Below the two columns the table is far above, so go to it. */
  const showOnHouse = (next: number) => {
    goTo(next);
    const table = tableRef.current;
    if (table && window.matchMedia("(max-width: 1023.98px)").matches) {
      ruleRef.current?.focus({ preventScroll: true });
      table.scrollIntoView({ block: "start" });
    }
  };

  const approve = (note?: string) => {
    if (!current) return;
    if (current.id === SEED_DUE) demo.approvePayment(note);
    else demo.record({ kind: "payment.approved", projectId: "iyer", n: current.id, note, by: "meera" });
    setStop(TODAY_STOP);
  };

  // What the head says: the one big figure while a payment waits, the letter once approved.
  const stillToPay = projection.stillToPay - (current && current.money !== "paid" ? current.agreedTotal : 0);
  // Money already in for the payment under way counts as paid, before the rest of it arrives.
  const partIn = current && current.money !== "paid" ? current.received : 0;
  const headline =
    change?.status === "waiting" && (!current || current.money === "paid")
      ? "A change to your schedule is waiting for you."
      : !current
        ? "Nothing is waiting for your approval."
        : current.money === "due"
          ? `${inr(current.agreedTotal)} is waiting for your approval.`
          : current.money === "approved"
            ? "Your demand letter is ready for your bank."
            : `The ${lowerFirst(current.name)} is paid.`;
  const sentence =
    partIn > 0 && current
      ? `Paid so far ${inr(projection.paid + partIn)}. Still to pay ${inr(current.agreedTotal - partIn)} of this payment and ${inr(stillToPay)} after it.`
      : `Paid so far ${inr(projection.paid)}. Still to pay${current && current.money !== "paid" ? " after this" : ""} ${inr(stillToPay)}.`;

  // The receipt under the approval, with the money as it comes in.
  const receipts = current ? projection.receiptsFor(current.id) : [];
  const moneyLine = !current
    ? ""
    : current.money === "paid"
      ? `Paid on ${formatShortDate(current.paidOn ?? TODAY)}: ${paidWords(receipts)}.`
      : current.received > 0
        ? `Part paid: ${paidWords(receipts)} on ${formatShortDate(receipts[receipts.length - 1]?.on ?? TODAY)}.`
        : "Waiting for your bank.";

  const decided = demo.events.filter((e) => e.kind === "schedule.decided" && e.projectId === "iyer");
  const lastDecision = decided[decided.length - 1];
  const changeMilestone = change ? milestones.find((m) => m.id === change.n) : undefined;
  const scheduleTagHere = !current;

  return (
    <ClientPage
      tableRef={tableRef}
      head={
        <>
          <h1 className="display display-xl max-w-[16ch] text-balance">{headline}</h1>
          <p className="mt-4 max-w-[58ch] text-17 text-lime/85">{sentence}</p>
        </>
      }
      table={
        <>
          <House labels scene={{ only: [`pay:${current?.id ?? TODAY_STOP}`], stop, markers: stop === TODAY_STOP ? "all" : "none" }} />

          <div className={`${INSTRUMENT} mt-4`}>
            <PaymentRule stop={stop} onChange={goTo} milestones={milestones} inputRef={ruleRef} />
            {/* The two steps keep their places; the way back to today comes and goes at the far end. */}
            <div className="mt-3 flex gap-2">
              <StepButton off={stop === 0} label="Earlier payment" onClick={() => goTo(stop - 1)}>
                Earlier<span className="max-sm:hidden">&nbsp;payment</span>
              </StepButton>
              <StepButton off={stop === LAST_STOP} label="Later payment" onClick={() => goTo(stop + 1)}>
                Later<span className="max-sm:hidden">&nbsp;payment</span>
              </StepButton>
              {stop !== TODAY_STOP && (
                <StepButton className="ml-auto" onClick={backToToday}>
                  Back to today
                </StepButton>
              )}
            </div>
          </div>

          {/* Today is what the head and the sheets already say, so it is spoken, not shown. */}
          <div className="mt-4 min-h-[6.5rem] sm:min-h-[3.5rem]">
            <HouseCaption tag={caption.tag} visible={caption.tag !== "Today"}>
              {caption.words}
            </HouseCaption>
            {caption.letter && stop !== TODAY_STOP && (
              <Link href={`/client/payments/letter/${shown.id}`} className="link inline-flex min-h-11 items-center text-15">
                Open this demand letter
              </Link>
            )}
          </div>
        </>
      }
    >
      {current && (
        <Sheet id="due" title={current.money === "due" ? "Ready for your approval" : current.money === "paid" ? "Paid" : "Approved"}>
          <FocusTarget on={focused === `pay:iyer:${current.id}`}>
            <h3 className="flex flex-wrap items-baseline gap-x-3 text-22 font-semibold leading-snug">
              Milestone {current.id}, {lowerFirst(current.name)}
              <SampleTag>Sample stage names</SampleTag>
            </h3>

            {accepted && current.acceptedAt ? (
              <p className="mt-3 flex items-start gap-2">
                <span className="mt-1 shrink-0">
                  <Seal size={16} />
                </span>
                You accepted it as finished on {formatStamp(current.acceptedAt)}.
              </p>
            ) : (
              <div className="mt-4">
                <p className="font-semibold">Accept the {lowerFirst(current.name)} as finished</p>
                <p className="mt-1 max-w-[58ch] text-ink-soft">
                  {stage?.doneBy ? `${stage.doneBy} marked it done` : "The site marked it done"}
                  {current.workCompletedOn ? ` on ${formatDate(current.workCompletedOn)}` : ""}. Accepting it is a
                  separate record from approving the payment.
                </p>
              </div>
            )}
            {stage && stage.photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {stage.photos.slice(0, 3).map((kind, i) => (
                  <SamplePhoto key={`${kind}-${i}`} kind={kind} tag={i === 0} />
                ))}
              </div>
            )}
            {!accepted && (
              <div className={`mt-5 ${DECISION_BAR}`}>
                <ApproveControl
                  label="Hold to accept"
                  confirmTitle={`Accept the ${lowerFirst(current.name)} as finished?`}
                  confirmBody="This says the work is done as agreed. It is recorded with your name, the date and the time, apart from the payment."
                  what={`Your acceptance of the ${lowerFirst(current.name)}`}
                  approved={false}
                  onApprove={() => demo.record({ kind: "stage.accepted", projectId: "iyer", n: current.id, by: "meera" })}
                  receipt={null}
                  holdTarget={`pay:${current.id}`}
                  scopeRef={tableRef}
                />
              </div>
            )}

            {current.raisedAt && (
              <p className="mt-4 max-w-[58ch] text-ink-soft">
                Raised by {current.raisedBy ?? "the Project Head"}, Project Head, on {formatStamp(current.raisedAt)}.
              </p>
            )}

            <details className="mt-3">
              <summary className="link inline-flex min-h-11 cursor-pointer items-center">How this amount is worked out</summary>
              <p className="max-w-[58ch] pb-2">
                {valueMoved
                  ? `${current.percent}% of the value as signed, with the approved changes that fall in this payment, is ${inr(current.agreedAmount)}.`
                  : `${current.percent}% of ${inr(projection.agreedValue)} is ${inr(current.agreedAmount)}.`}{" "}
                GST at 18% is {inr(current.agreedTotal - current.agreedAmount)}. Total {inr(current.agreedTotal)}.
              </p>
            </details>

            <div className={`mt-4 ${accepted && current.money === "due" ? DECISION_BAR : ""}`}>
              <ApproveControl
                label={`Hold to approve ${inr(current.agreedTotal)}`}
                confirmTitle={`Approve ${inr(current.agreedTotal)} for the ${lowerFirst(current.name)}?`}
                confirmBody="Approving writes a demand letter for your bank. It moves no money, and it is recorded with your name, the date and the time."
                what={`Your approval of ${inr(current.agreedTotal)}`}
                note
                disabled={accepted ? undefined : "Accept the stage first."}
                approved={approved}
                onApprove={approve}
                receipt={
                  <p>
                    Approved by {client.name} on {current.approvedAt ? formatStamp(current.approvedAt) : formatDate(TODAY)}.{" "}
                    {moneyLine}
                  </p>
                }
                holdTarget={`pay:${current.id}`}
                scopeRef={tableRef}
              />
            </div>

            {approved && current.letterNo && (
              <Link href={`/client/payments/letter/${current.id}`} className="btn btn-primary mt-5">
                Open demand letter
              </Link>
            )}
          </FocusTarget>
        </Sheet>
      )}

      {change && changeMilestone && (
        <Sheet id="schedule-change" title="A change to your schedule">
          <FocusTarget on={focused === `sched:iyer:${change.n}`}>
            <p className="max-w-[58ch]">
              {change.by} {change.status === "approved" ? "proposed" : "proposes"} paying milestone {change.n}, {lowerFirst(changeMilestone.name)}, in two parts
              {change.parts[0] === change.parts[1] ? ` of ${change.parts[0]}% each` : ` of ${change.parts[0]}% and ${change.parts[1]}%`}.{" "}
              {change.reason}
            </p>
            <ul className="mt-4 grid gap-1">
              <li className="flex flex-wrap justify-between gap-x-4">
                <span className="text-ink-soft">Before</span>
                <span>one payment of {inr(changeMilestone.agreedTotal)}</span>
              </li>
              <li className="flex flex-wrap justify-between gap-x-4">
                <span className="text-ink-soft">After</span>
                <span>
                  {change.totals[0] === change.totals[1]
                    ? `two payments of ${inr(change.totals[0])}`
                    : `two payments, ${inr(change.totals[0])} and ${inr(change.totals[1])}`}
                </span>
              </li>
            </ul>
            <div className="mt-5">
              <SawnCell n={change.n} parts={change.parts} cut={change.status === "approved" ? "made" : "proposed"} />
            </div>
            <div className={`mt-5 ${change.status === "waiting" ? DECISION_BAR : ""}`}>
              {change.status === "changes-asked" ? (
                <p className="max-w-[58ch]">
                  You asked for changes on {lastDecision ? formatStamp(lastDecision.at) : formatDate(TODAY)}. {change.by} will
                  reply in Updates.
                </p>
              ) : (
                <ApproveControl
                  label="Hold to approve the split"
                  confirmTitle={`Pay milestone ${change.n} in two parts?`}
                  confirmBody="Your schedule changes, and nothing else does. It is recorded with your name, the date and the time."
                  what={`Your approval of the split of milestone ${change.n}`}
                  approved={change.status === "approved"}
                  onApprove={() =>
                    demo.record({ kind: "schedule.decided", projectId: "iyer", n: change.n, status: "approved", by: "meera" })
                  }
                  receipt={
                    <p>
                      Approved by {client.name} on {lastDecision ? formatStamp(lastDecision.at) : formatDate(TODAY)}.
                      Milestone {change.n} is now paid as {change.n}a and {change.n}b.
                    </p>
                  }
                  secondary={
                    <AskForChanges
                      what={`Your request for changes to the split of milestone ${change.n}`}
                      prompt="What would you like changed in this split?"
                      onSend={(comment) =>
                        demo.record({
                          kind: "schedule.decided",
                          projectId: "iyer",
                          n: change.n,
                          status: "changes-asked",
                          comment,
                          by: "meera",
                        })
                      }
                    />
                  }
                />
              )}
            </div>
          </FocusTarget>
        </Sheet>
      )}

      <Sheet title="The full schedule" tone="sand">
        <p className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-start gap-2">
            <span className="mt-1 shrink-0">
              <Seal size={16} />
            </span>
            You approved this schedule on {formatStamp(SCHEDULE_APPROVED_AT)}.
          </span>
          {scheduleTagHere && <SampleTag>Sample stage names</SampleTag>}
        </p>
        <Schedule
          milestones={milestones}
          stop={stop}
          onShow={showOnHouse}
          receiptsFor={projection.receiptsFor}
          focused={focused === `pay:iyer:${current?.id}` ? null : focused}
        />
      </Sheet>
    </ClientPage>
  );
}
