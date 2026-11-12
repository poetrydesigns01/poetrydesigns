"use client";

import { dayWords } from "@/components/admin/admin-data";
import { RequestLadder } from "@/components/instruments/request-ladder";
import { Register, RegisterRow } from "@/components/register/register";
import { SampleTag } from "@/components/register/sample-tag";
import { useFirm } from "@/lib/demo-store";
import { ageWords, type RequestView } from "@/lib/firm";
import type { ProjectId } from "@/lib/firm-data";
import { formatStampShort, inr } from "@/lib/format";

// Every material request on the project, newest first, with where it has got to (the
// ladder says the status, so the sentence does not) and the
// purchase orders linked to it: vendor, quantities, rates, GST and the uploaded file.
// Estimates, requests and orders are kept together here, per project.

function turnOf(r: RequestView): string {
  if (r.status === "Delivered") return "Delivered";
  if (r.status === "PO uploaded") return "With site";
  return "With procurement";
}

export function ProjectMaterials({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  const requests = firm.requests.filter((r) => r.projectId === projectId).sort((a, b) => b.at.localeCompare(a.at));
  // The sample tag goes beside the first file on the screen only.
  const taggedNo = requests.find((r) => r.pos.length > 0)?.no;

  return (
    <Register
      title="Material requests and orders"
      empty="No material has been requested on this project yet."
      limit={8}
    >
      {requests.map((r) => {
        const raiser = firm.person(r.by)?.name ?? r.by;
        const firstFile = r.no === taggedNo;
        return (
          <RegisterRow
            key={r.no}
            id={`mr:${r.no}`}
            margin={turnOf(r)}
            marginSub={r.status === "Delivered" ? undefined : ageWords(r.days)}
            title={`${r.no}, milestone ${r.n}`}
            sentence={
              <>
                {r.queued ? "Saved with no signal and not sent yet. " : ""}
                {r.lineWords.join("; ")}.{r.outside ? " One line is not in the agreed estimate." : ""} Needed by{" "}
                {dayWords(r.neededBy)}. Raised by {raiser}, {formatStampShort(r.at)}.
                {r.stillToOrder ? ` ${r.stillToOrder}.` : ""}
              </>
            }
            instrument={<RequestLadder status={r.status} stamps={firm.stampsFor(`mr:${r.no}`)} late={r.late} />}
          >
            {r.pos.length > 0 && (
              <ul className="grid gap-3 border-t border-sand pt-3">
                {r.pos.map((po) => (
                  <li key={po.no} className="grid gap-0.5">
                    <p className="text-17 font-semibold">
                      {po.no}, {po.vendor}
                    </p>
                    <p className="max-w-[56ch] text-15 text-ink-soft">
                      {po.lineWords.join("; ")}. {inr(po.amount)} before GST, GST {inr(po.gst)}, {inr(po.total)} with
                      GST. Uploaded by {firm.person(po.by)?.name ?? po.by} on {dayWords(po.at)}.{" "}
                      {po.billed ? "Billed." : "Not billed yet."}
                    </p>
                    <p className="flex flex-wrap items-baseline gap-x-2 text-15">
                      <span>{po.file.replace(/ \(sample\)$/, "")}</span>
                      {firstFile && po === r.pos[0] && <SampleTag>Sample file</SampleTag>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </RegisterRow>
        );
      })}
    </Register>
  );
}
