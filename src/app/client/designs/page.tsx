"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Seal, useOnHidden } from "@/components/craft/seal";
import { SheetThumb } from "@/components/designs/sheet-thumb";
import { FocusTarget, Sheet, useFocusedId } from "@/components/home/sheet";
import { House } from "@/components/house/house";
import { HouseCaption } from "@/components/house/house-caption";
import { ClientPage } from "@/components/page-band";
import { client } from "@/lib/demo-data";
import { useDemo, useProjection } from "@/lib/demo-store";
import { countWord, datePart, formatDate, formatShortDate, formatStamp } from "@/lib/format";
import type { ProjectedDesign } from "@/lib/projection";

// Designs: what is waiting for her word, each row one link to the sheet, and below them
// every decision she has made, each kept with its version, date and time.

function headline(waiting: number): string {
  if (waiting === 0) return "No designs are waiting for you.";
  if (waiting === 1) return "One design is waiting for you.";
  return `${countWord(waiting, true)} designs are waiting for you.`;
}

/** Since when, and the date that keeps the site moving. */
function waitingLine({ design, latest }: ProjectedDesign): string {
  const since = `Since ${formatShortDate(latest.uploadedOn)}.`;
  if (!design.decideBy) return since;
  return `${since} Decide by ${formatShortDate(design.decideBy)}${design.slips ? ` ${design.slips}` : ""}.`;
}

export default function DesignsPage() {
  const demo = useDemo();
  const { designs, approvedAt, log } = useProjection();
  const focused = useFocusedId();
  /** The mark on the house that belongs to the row under the pointer or the focus. */
  const [highlight, setHighlight] = useState<string | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  useOnHidden(paperRef, () => setHighlight(null));

  const waiting = designs.filter((row) => row.status === "awaiting");
  const decided = designs.filter((row) => row.status !== "awaiting");
  // A design that is waiting again keeps the answer she gave its earlier version.
  const earlier = waiting.flatMap((row) =>
    row.design.versions
      .filter((v) => v.version < row.latest.version && v.decidedOn && v.status !== "awaiting")
      .map((v) => {
        // The time she answered is in the record, on that day and for that version.
        const entry = log.find(
          (e) => e.kind === "client" && datePart(e.at) === v.decidedOn && e.action.includes(`version ${v.version}.`),
        );
        const when = entry ? formatStamp(entry.at) : formatDate(v.decidedOn ?? "");
        return {
          key: `${row.design.id}:v${v.version}`,
          row,
          words:
            v.status === "approved"
              ? `Approved by ${client.name} on ${when}, version ${v.version}.`
              : `Changes asked on ${when}, version ${v.version}.`,
        };
      }),
  );

  // The house stands beside the list only from 1024 px, so only then does a row point at it.
  const point = (anchor: string | null) => {
    if (anchor === null || window.matchMedia("(min-width: 1024px)").matches) setHighlight(anchor);
  };

  /** One decision, said once: who, when, which version. */
  const decidedLine = ({ design, latest, status, date }: ProjectedDesign): string => {
    const at = demo.designDecisions[design.id]?.at ?? (status === "approved" ? approvedAt[design.anchor] : undefined);
    const when = at ? formatStamp(at) : formatDate(date);
    return status === "approved"
      ? `Approved by ${client.name} on ${when}, version ${latest.version}.`
      : `Changes asked on ${when}, version ${latest.version}.`;
  };

  const rowProps = (row: ProjectedDesign) => ({
    href: `/client/designs/${row.design.id}`,
    onPointerEnter: (event: { pointerType: string }) => {
      if (event.pointerType === "mouse") point(row.design.anchor);
    },
    onPointerLeave: () => point(null),
    onFocus: () => point(row.design.anchor),
    onBlur: () => point(null),
  });

  return (
    <ClientPage
      head={<h1 className="display display-xl max-w-[16ch] text-balance">{headline(waiting.length)}</h1>}
      table={
        <>
          <House labels phoneMarks="pegs" scene={{ only: designs.map((row) => row.design.anchor), highlight }} />
          <HouseCaption visible={false}>
            Each drawing is marked on the part of the house it describes. A standing peg is waiting for you. A flat seal is
            approved.
          </HouseCaption>
        </>
      }
    >
      <div ref={paperRef}>
        {waiting.length > 0 && (
          <section aria-label="Waiting for you" className="bg-lime">
            <div className="sheet-inner px-4 py-8 sm:px-8 sm:py-10">
              <ul className="sheet-rows">
                {waiting.map((row) => (
                  <li key={row.design.id}>
                    <FocusTarget on={focused === `design:iyer:${row.design.id}`}>
                      <Link
                        {...rowProps(row)}
                        className="group -mx-2 grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-x-4 px-2 py-1 hover:bg-sand-2/60"
                      >
                        <SheetThumb design={row.design} version={row.latest.version} loose />
                        <span className="min-w-0">
                          <span className="block text-22 font-semibold leading-snug underline decoration-transparent decoration-1 underline-offset-4 group-hover:decoration-current">
                            {row.design.title}
                          </span>
                          <span className="mt-1 block max-w-[58ch] text-ink-soft">{waitingLine(row)}</span>
                        </span>
                      </Link>
                    </FocusTarget>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <Sheet title="Decided" tone="sand">
          <p className="mb-5 max-w-[58ch]">Every version and every decision is kept.</p>
          {decided.length === 0 && earlier.length === 0 ? (
            <p className="max-w-[58ch] text-ink-soft">Nothing is decided yet.</p>
          ) : (
            <ul className="sheet-rows">
              {decided.map((row) => (
                <li key={row.design.id}>
                  <FocusTarget on={focused === `design:iyer:${row.design.id}`}>
                    <Link {...rowProps(row)} className="group -mx-2 flex items-start gap-3 px-2 py-1 hover:bg-paper/60">
                      <span className="hidden h-[1.65rem] w-4 shrink-0 items-center lg:flex" aria-hidden="true">
                        {row.status === "approved" && <Seal size={16} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug underline decoration-transparent decoration-1 underline-offset-4 group-hover:decoration-current">
                          {row.design.title}
                        </span>
                        <span className="block max-w-[58ch] text-ink-soft">{decidedLine(row)}</span>
                      </span>
                    </Link>
                  </FocusTarget>
                </li>
              ))}
              {earlier.map(({ key, row, words }) => (
                <li key={key}>
                  <Link {...rowProps(row)} className="group -mx-2 flex items-start gap-3 px-2 py-1 hover:bg-paper/60">
                    <span className="hidden h-[1.65rem] w-4 shrink-0 lg:block" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block font-semibold leading-snug underline decoration-transparent decoration-1 underline-offset-4 group-hover:decoration-current">
                        {row.design.title}
                      </span>
                      <span className="block max-w-[58ch] text-ink-soft">{words}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Sheet>
      </div>
    </ClientPage>
  );
}
