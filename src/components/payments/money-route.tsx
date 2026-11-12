import type { ReactNode } from "react";
import { Seal } from "@/components/craft/seal";
import { formatDate } from "@/lib/format";
import type { ProjectedMilestone } from "@/lib/projection";

// The route one payment takes, in five stops, shown above its demand letter. Each stop is a
// sentence with a small drawn mark. It is not part of the letter and is not printed.

type MarkKind = "block" | "seal" | "sheet" | "ring" | "pointed";

const JOINTS = "M0.5 9.5h27M9.5 0.5v9M19.5 0.5v9M4.5 9.5v9M14.5 9.5v9M24.5 9.5v9";

function RouteMark({ kind }: { kind: MarkKind }) {
  if (kind === "seal") return <Seal size={24} />;
  if (kind === "sheet") {
    return (
      <svg viewBox="0 0 20 24" className="h-6 w-5" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">
        <path d="M0.5 0.5h13l6 6v17h-19zM13.5 0.5v6h6" style={{ fill: "var(--color-paper)" }} />
        <path d="M4 11.5h12M4 15.5h12M4 19.5h7" />
      </svg>
    );
  }
  if (kind === "ring") {
    return (
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10.5" strokeDasharray="3 3" />
      </svg>
    );
  }
  // A block as it is built, with open joints, or pointed in lime once it is paid for.
  return (
    <svg viewBox="0 0 28 19" className="h-[19px] w-7" aria-hidden="true" focusable="false" fill="none">
      <rect x="0.5" y="0.5" width="27" height="18" style={{ fill: "var(--color-laterite)" }} />
      <path
        d={JOINTS}
        shapeRendering="crispEdges"
        style={{ stroke: kind === "pointed" ? "var(--color-lime)" : "rgb(42 26 18 / 0.7)" }}
      />
      <rect x="0.5" y="0.5" width="27" height="18" stroke="currentColor" />
    </svg>
  );
}

export function MoneyRoute({
  milestone,
  approvedOn,
}: {
  milestone: ProjectedMilestone;
  /** ISO date she approved this payment on. */
  approvedOn: string;
}) {
  const paid = milestone.money === "paid";
  const stops: { kind: MarkKind; words: ReactNode; waiting?: boolean }[] = [
    {
      kind: "block",
      words: milestone.workCompletedOn ? `Work finished on ${formatDate(milestone.workCompletedOn)}.` : "Work finished.",
    },
    { kind: "seal", words: `You approved on ${formatDate(approvedOn)}.` },
    {
      kind: "sheet",
      words: (
        <>
          Letter <span className="whitespace-nowrap">{milestone.letterNo}</span> written.
        </>
      ),
    },
    paid
      ? { kind: "pointed", words: "Your bank released the payment." }
      : { kind: "ring", words: "Your bank releases the payment. Waiting.", waiting: true },
    paid
      ? { kind: "pointed", words: milestone.paidOn ? `Paid on ${formatDate(milestone.paidOn)}.` : "Paid." }
      : { kind: "ring", words: "We mark it paid. Waiting.", waiting: true },
  ];

  return (
    <section className="no-print mb-8" aria-labelledby={`route-${milestone.id}`}>
      <h2 id={`route-${milestone.id}`} className="text-17 font-semibold">
        The route of this payment
      </h2>
      {/* Side by side once there is room; the stop that names the letter is a little wider. */}
      <ol className="mt-3 md:grid md:grid-cols-[1fr_1fr_1.35fr_1fr_1fr] md:gap-x-4">
        {stops.map((stop, index) => (
          <li
            key={index}
            className={`flex items-center gap-3 py-1.5 md:block md:py-3 ${
              stop.waiting ? "text-ink-soft" : ""
            }`}
          >
            <span className="flex h-6 w-7 shrink-0 items-center justify-center md:justify-start">
              <RouteMark kind={stop.kind} />
            </span>
            <p className="text-15 leading-snug md:mt-2">
              <span className="figure mr-1.5">{index + 1}.</span>
              {stop.words}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
