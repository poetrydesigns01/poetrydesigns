"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Peg, Seal, useOnHidden } from "@/components/craft/seal";
import { site, TODAY } from "@/lib/demo-data";
import { useProjection } from "@/lib/demo-store";
import { daysBetween, formatDate } from "@/lib/format";
import { BANDS, STOREYS } from "@/lib/house-model";
import type { ProjectedMilestone, StoreyGroup } from "@/lib/projection";

/** What the site has to say about one payment stage, as far as the sample data knows. */
function siteWords(milestone: ProjectedMilestone): string {
  const { workCompletedOn, paidOn, expected } = milestone;
  if (milestone.money === "paid") {
    const finished = workCompletedOn ? ` finished on ${formatDate(workCompletedOn)} and` : "";
    return `${milestone.name}${finished} paid${paidOn ? ` on ${formatDate(paidOn)}` : ""}.`;
  }
  if (milestone.money === "due" || milestone.money === "approved") {
    const day = daysBetween(site.curing.startedOn, TODAY);
    const curing = workCompletedOn === site.curing.startedOn && day >= 0 && day <= site.curing.days;
    return `The structure was finished${workCompletedOn ? ` on ${formatDate(workCompletedOn)}` : ""}.${
      curing ? ` Its slab is curing, day ${day} of ${site.curing.days}.` : ""
    }`;
  }
  if (milestone.money === "under-way") {
    return `The walls are going up.${expected ? ` This stage is expected to finish in ${expected}.` : ""}`;
  }
  return `Work here has not started.${expected ? ` It is expected in ${expected}.` : ""}`;
}

/** One row of the note. Where it has a page of its own, the whole row is the way to it. */
function NoteRow({ href, children }: { href?: string; children: ReactNode }) {
  const row = "flex min-h-11 items-start gap-2.5 py-1.5 text-15 leading-snug";
  return href ? (
    <Link href={href} className={`${row} group`}>
      {children}
    </Link>
  ) : (
    <div className={row}>{children}</div>
  );
}

/**
 * What she is looking at when the house is open at a floor: what is waiting for her there,
 * what she has agreed there, and what the site last reported. Everything in it is also in
 * the lists on the page, so the house is never the only way to reach it.
 */
export function FloorNote({ group, onClose }: { group: StoreyGroup; onClose: () => void }) {
  const projection = useProjection();
  const headingId = useId();
  const ref = useRef<HTMLElement>(null);
  // The note enters once, from the tap that opened the floor. A screen that is hidden and
  // shown again keeps it in the document, so it is simply there on the way back.
  const [fresh, setFresh] = useState(true);
  useOnHidden(ref, () => setFresh(false));

  const waiting = projection.waiting.filter((item) => item.group === group);
  const agreed = projection.agreed.filter((item) => item.group === group);
  const stages = [...new Set(STOREYS.filter((storey) => storey.group === group).map((storey) => storey.milestoneId))];
  const onSite = projection.milestones
    .filter((milestone) => stages.includes(milestone.id))
    .map(siteWords)
    .join(" ");

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") onClose();
  };

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      className={`pt-1 ${fresh ? "enter-row" : ""}`}
      style={{ transitionDelay: "160ms" }}
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={headingId} className="display text-22 leading-tight">
          {BANDS[group].label}
        </h2>
        <button
          type="button"
          className="link inline-flex min-h-11 shrink-0 cursor-pointer items-center px-1 text-15"
          onClick={onClose}
        >
          Close the house
        </button>
      </div>

      <h3 className="lettering mt-1 text-lime/75">Waiting for you here</h3>
      {waiting.length > 0 ? (
        <ul>
          {waiting.map((item) => (
            <li key={item.key}>
              <NoteRow href={item.href}>
                <span className="flex w-4 shrink-0 justify-center">
                  <Peg size={22} />
                </span>
                <span>
                  <span className="font-semibold underline decoration-1 underline-offset-4 group-hover:decoration-2">
                    {item.title}
                  </span>
                  {item.figure ? `, ${item.kind === "change" ? "+" : ""}${item.figure}` : ""}.
                </span>
              </NoteRow>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-1.5 text-15 leading-snug text-lime/80">Nothing is waiting for you on this floor.</p>
      )}

      <h3 className="lettering mt-3 text-lime/75">Agreed here</h3>
      {agreed.length > 0 ? (
        <ul className="py-0.5">
          {agreed.map((item) => (
            <li key={item.key}>
              <NoteRow href={item.href}>
                <span className="mt-[0.1875rem] flex w-4 shrink-0 justify-center">
                  <Seal size={16} />
                </span>
                <span>
                  <span className={`font-semibold${item.href ? " link" : ""}`}>{item.title}</span>.{" "}
                  <span className="text-lime/80">{item.detail}</span>
                </span>
              </NoteRow>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-1.5 text-15 leading-snug text-lime/80">Nothing is agreed for this floor yet.</p>
      )}

      <h3 className="lettering mt-3 text-lime/75">On site</h3>
      <p className="max-w-[68ch] py-1.5 text-15 leading-snug text-lime/80">{onSite}</p>
    </section>
  );
}
