"use client";

import { ClientPage, Sheet } from "@/components/page-band";
import { AgreementPages, type House } from "@/components/record/agreement-pages";
import { DecisionLog } from "@/components/record/decision-log";
import { useDemo, useFirm, useProjection } from "@/lib/demo-store";
import { datePart, formatDate, inr, inrDelta } from "@/lib/format";

// Her agreement and every decision since, for the house she is looking at. Nothing here can
// be changed: the agreement is view only, the value history only grows, and the log has no
// edit or delete controls.

const OTHER: Record<House, House> = { iyer: "iyer-cottage", "iyer-cottage": "iyer" };

export default function RecordPage() {
  const demo = useDemo();
  const firm = useFirm();
  const projection = useProjection();
  const house: House = demo.clientProject;
  const project = firm.project(house);
  const other = firm.project(OTHER[house]);
  if (!project) return null;

  const signedOn = project.signedOn ?? "";
  const area = Math.round(project.originalValue / project.ratePerSqFt);
  const now = house === "iyer" ? projection.agreedValue : project.contractValue;
  const signUp = project.milestones.find((m) => m.n === 0);
  // The Iyer log is the client's own view of it. For the cottage only her own decisions are
  // shown: staff lines on a project (bills, orders) are never for the client's eyes.
  const entries =
    house === "iyer"
      ? projection.log
      : firm.log.filter((entry) => entry.projectId === "iyer-cottage" && entry.kind === "client");

  return (
    <ClientPage
      head={
        <>
          <h1 className="display display-xl max-w-[16ch] text-balance">Your agreement and every decision</h1>
          <p className="mt-4 max-w-[52ch] text-17 text-lime/80">
            Nothing here can be edited or deleted, by you or by anyone at Poetry.
          </p>
          {other && (
            <button
              type="button"
              className="link mt-3 inline-flex min-h-11 items-center text-17 text-lime/80 hover:text-lime"
              onClick={() => demo.setClientProject(OTHER[house])}
            >
              See the record for {other.name}
            </button>
          )}
        </>
      }
    >
      <Sheet title="Your agreement">
        <p className="text-17">Signed on {formatDate(signedOn)}.</p>
        <div className="mt-5">
          <AgreementPages key={house} house={house} />
        </div>
      </Sheet>

      <Sheet title={house === "iyer" ? "What your home costs now" : "What your cottage costs now"} tone="sand" ruled>
        <ul className="sheet-rows">
          {project.valueHistory.map((row, i) => (
            <li key={`${row.label}-${row.at}`} className="flex items-baseline justify-between gap-4">
              <span className="min-w-0">
                <span className="block text-17">
                  {i === 0
                    ? `Signed, ${area.toLocaleString("en-IN")} sq ft at ${inr(project.ratePerSqFt)}`
                    : row.label}
                </span>
                {i > 0 && row.at && (
                  <span className="block text-15 text-ink-soft">Approved on {formatDate(datePart(row.at))}</span>
                )}
              </span>
              <span className="figure whitespace-nowrap text-17">{i === 0 ? inr(row.amount) : inrDelta(row.amount)}</span>
            </li>
          ))}
          <li className="flex items-baseline justify-between gap-4">
            <span className="text-17 font-semibold">Now, before GST</span>
            <span className="figure whitespace-nowrap text-22">{inr(now)}</span>
          </li>
        </ul>
        {signUp && (
          <p className="mt-5 text-15 text-ink-soft">
            Sign-up advance {inr(signUp.amount)} before GST
            {signUp.paidOn ? `, paid on ${formatDate(signUp.paidOn)}.` : "."}
          </p>
        )}
      </Sheet>

      <Sheet title="Every decision">
        <DecisionLog key={house} entries={entries} />
      </Sheet>
    </ClientPage>
  );
}
