"use client";

import { PaperSheet } from "@/components/register/paper-sheet";
import { SampleTag } from "@/components/register/sample-tag";
import { useFirm } from "@/lib/demo-store";
import { formatDate, formatStamp } from "@/lib/format";

// The material requirement report: one request on an A4 sheet, the way a vendor or the
// office file would want it. It prints alone, without the screen around it.

export function MaterialReport({ no }: { no: string }) {
  const firm = useFirm();
  const request = firm.requests.find((r) => r.no === no);
  if (!request) return <p className="text-17 text-ink-soft">This request has not been raised yet.</p>;

  const project = firm.project(request.projectId);
  const milestone = project?.milestones.find((m) => m.n === request.n);
  const raiser = firm.person(request.by);
  const title = `Material requirement report ${request.no}`;
  const outside = request.lines.some((line) => line.outsideEstimate);

  return (
    <div className="grid justify-items-start gap-4">
      <PaperSheet title={title}>
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink pb-3">
          <p className="display text-22">Poetry Designs</p>
          <p className="lettering text-ink-soft">{request.no}</p>
        </header>
        <h2 className="mt-6 text-22 font-semibold">Material requirement report</h2>

        <dl className="mt-5 grid gap-x-6 gap-y-2 text-15 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <dt className="text-ink-soft">Project</dt>
          <dd className="font-semibold">{project?.name ?? request.projectName}</dd>
          <dt className="text-ink-soft">Address</dt>
          <dd>{project?.address}</dd>
          <dt className="text-ink-soft">Project code</dt>
          <dd>
            {project?.code || "Not given yet"} <SampleTag />
          </dd>
          <dt className="text-ink-soft">Milestone</dt>
          <dd>
            {milestone ? `${milestone.n}, ${milestone.name}` : `Milestone ${request.n}`}
          </dd>
          <dt className="text-ink-soft">Needed on site by</dt>
          <dd className="font-semibold">{formatDate(request.neededBy)}</dd>
          <dt className="text-ink-soft">Raised by</dt>
          <dd>
            {raiser?.name ?? request.by}, {formatStamp(request.at)}
          </dd>
        </dl>

        <table className="mt-8 w-full border-collapse text-15">
          <caption className="sr-only">Materials requested</caption>
          <thead>
            <tr className="border-b border-ink text-left">
              <th scope="col" className="py-2 pr-3 font-semibold">
                Material
              </th>
              <th scope="col" className="py-2 pr-3 font-semibold">
                Grade or size
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">
                Quantity
              </th>
              <th scope="col" className="whitespace-nowrap py-2 font-semibold">
                Unit
              </th>
            </tr>
          </thead>
          <tbody>
            {request.lines.map((line) => {
              const item = firm.catalogue.find((c) => c.id === line.material);
              return (
                <tr key={line.id} className="border-b border-sand align-top">
                  <td className="py-2.5 pr-3">
                    <span className="font-semibold">{item?.name ?? line.material}</span>
                    {line.outsideEstimate && (
                      <span className="mt-0.5 block font-semibold">
                        Not in the agreed estimate{line.note ? `: ${line.note}` : ""}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">{line.sub}</td>
                  <td className="figure py-2.5 pr-3 text-right text-17">{line.qty.toLocaleString("en-IN")}</td>
                  <td className="whitespace-nowrap py-2.5">{line.unit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {outside && (
          <p className="mt-4 text-15">Lines marked as not in the agreed estimate need a cost revision before they are billed to the client.</p>
        )}
        <p className="lettering mt-10 text-ink-soft">Printed from the Poetry Designs portal.</p>
      </PaperSheet>
      <button type="button" className="btn btn-quiet no-print" onClick={() => window.print()}>
        Print or save as PDF
      </button>
    </div>
  );
}
