"use client";

import { ApproveControl } from "@/components/craft/approve-control";
import { useDemo, useFirm } from "@/lib/demo-store";
import { cottageEstimate } from "@/lib/firm-data";
import { formatDate, formatStamp, inr, listWords } from "@/lib/format";

// Her two decisions on the cottage: the final estimate, which becomes Addendum 1 to the
// agreement, and then the payment schedule worked out on it. Each is one approve control:
// tap for two steps or hold, then the five-second pause, then the receipt with the time.

export function EstimateDecision() {
  const demo = useDemo();
  const firm = useFirm();
  const approved = firm.cottage.estimate === "approved";
  const at = firm.cottage.approvedAt;
  const emailed = listWords(cottageEstimate.emailed.map((id) => firm.person(id)?.name ?? id));

  return (
    <ApproveControl
      label="Hold to approve the final estimate"
      confirmTitle="Approve the final estimate for Iyer Farm Cottage?"
      what="Your approval of the final estimate for Iyer Farm Cottage"
      confirmBody={`${inr(cottageEstimate.total)} with GST for the house. It becomes Addendum 1 to your agreement.`}
      approved={approved}
      onApprove={(note?: string) =>
        demo.record({ kind: "estimate.approved", projectId: "iyer-cottage", note: note || undefined, by: "meera" })
      }
      receipt={
        at ? (
          <p>
            Approved by Meera Iyer on {formatStamp(at)}. Recorded as Addendum 1 to your Iyer Farm Cottage agreement,
            dated {formatDate(at)}. Posted in Updates. {emailed} were emailed.
          </p>
        ) : null
      }
    />
  );
}

export function ScheduleDecision() {
  const demo = useDemo();
  const firm = useFirm();
  const estimateApproved = firm.cottage.estimate === "approved";
  const approved = firm.cottage.schedule === "approved";
  const at = demo.events.find((e) => e.kind === "cottage-schedule.approved")?.at;
  const head = firm.person(firm.project("iyer-cottage")?.team.head ?? "lakshmi");

  if (!estimateApproved && !approved) {
    return <p className="text-17 text-ink-soft">Approve the estimate first. The schedule is worked out on it.</p>;
  }

  return (
    <ApproveControl
      label="Hold to approve the schedule"
      confirmTitle="Approve the payment schedule for Iyer Farm Cottage?"
      what="Your approval of the payment schedule for Iyer Farm Cottage"
      confirmBody={`Sign-up and ten milestones on ${inr(cottageEstimate.amount)} before GST. Each falls due once its work is finished and you accept it.`}
      approved={approved}
      onApprove={() => demo.record({ kind: "cottage-schedule.approved", by: "meera" })}
      receipt={
        at ? (
          <p>
            Approved by Meera Iyer on {formatStamp(at)}.{head ? ` ${head.name} was emailed.` : ""}
          </p>
        ) : null
      }
    />
  );
}
