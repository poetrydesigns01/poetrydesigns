"use client";

import { useRef, useState, type MouseEvent } from "react";
import { ChangeSheet } from "@/components/changes/change-sheet";
import { TryRow } from "@/components/changes/try-row";
import { DayRule } from "@/components/craft/day-rule";
import { Seal, useOnHidden } from "@/components/craft/seal";
import { StruckFigure } from "@/components/craft/struck-figure";
import { FocusTarget, Sheet, useFocusedId } from "@/components/home/sheet";
import { House } from "@/components/house/house";
import { HouseCaption } from "@/components/house/house-caption";
import { ClientPage } from "@/components/page-band";
import { client, contacts } from "@/lib/demo-data";
import { useDemo, useFirm, useProjection } from "@/lib/demo-store";
import { countWord, dayCount, formatDate, formatStamp, inr, listWords } from "@/lib/format";
import type { ProjectedChange, Projection } from "@/lib/projection";

// Changes: try it on the house. The table holds what the home costs, the house and when it
// is handed over, with a switch for each change that is waiting. Switching one on lowers
// the piece onto the house dry. The sheets beside it hold each change in words, and the
// two ways to answer: approve, or ask for changes.

function waitingSentence(count: number): string {
  if (count === 0) return "No changes are waiting for your decision.";
  if (count === 1) return "One change is waiting for your decision.";
  return `${countWord(count, true)} changes are waiting for your decision.`;
}

/** What the house shows, for a screen reader: the figure and the rule say the rest on screen. */
function caption(projection: Projection): string {
  const { tried, pending } = projection;
  if (tried.length > 0) {
    const names = listWords(tried.map((change) => change.short));
    return `Trying ${names}. ${tried.length === 1 ? "It is" : "They are"} placed on the house loose, because ${
      tried.length === 1 ? "it is" : "they are"
    } not approved.`;
  }
  return `Your home as agreed costs ${inr(projection.agreedValue)} before GST, with handover on ${formatDate(
    projection.handoverAgreed,
  )}.${pending.length > 0 ? " Switch a change on to see what it would do." : ""}`;
}

/** A change decided on this visit, in the table where its switch stood, so nothing moves. */
function SettledRow({ change }: { change: ProjectedChange }) {
  const approved = change.status === "approved";
  return (
    <p className="flex min-h-14 items-center justify-between gap-4 py-2 font-semibold">
      {approved ? `Approved: ${change.short}` : `Changes asked: ${change.short}`}
      {approved && (
        <span className="flex w-[3.75rem] shrink-0 justify-center">
          <Seal size={24} />
        </span>
      )}
    </p>
  );
}

/** A change decided on an earlier visit, or before today: one dated line that stays. */
function DecidedRow({ change, at, focused }: { change: ProjectedChange; at?: string; focused: boolean }) {
  const approved = change.status === "approved";
  const when = at ? formatStamp(at) : formatDate(change.decidedOn ?? change.raisedOn);
  return (
    <li>
      <FocusTarget on={focused} className="flex gap-3">
        <span className="flex h-[1.65rem] w-6 shrink-0 items-center" aria-hidden="true">
          {approved && <Seal size={24} />}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">{change.title}</h3>
          <p className="max-w-[58ch] text-ink-soft">
            {approved
              ? `Approved by ${client.name} on ${when}.${change.addendum ? ` ${change.addendum}.` : ""} It added ${inr(
                  change.cost,
                )} and ${change.delayDays > 0 ? dayCount(change.delayDays) : "no days"}.`
              : `You asked for changes on ${when}. Nothing was added.`}
          </p>
        </div>
      </FocusTarget>
    </li>
  );
}

export default function ChangesPage() {
  const demo = useDemo();
  const projection = useProjection();
  const firm = useFirm();
  const focusedId = useFocusedId();
  const tableRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  // Changes decided on this screen during this visit. Their sheets stay where they are, so
  // the receipt is not pulled out from under her; they move down to "Decided" next time.
  const [kept, setKept] = useState<string[]>([]);
  /** The mark on the house that the sheet under the pointer, or holding focus, is about. */
  const [pointed, setPointed] = useState<string | null>(null);

  useOnHidden(tableRef, () => {
    setKept([]);
    setPointed(null);
  });

  const keep = (id: string) => setKept((ids) => (ids.includes(id) ? ids : [...ids, id]));

  /**
   * A switch has been turned on. Below the two columns the strip that rises with a trial
   * would cover the day rule or the switch itself unless the table starts at the top of
   * the screen, so the page goes there in one jump, and only when it has to.
   */
  const afterSwitch = (event: MouseEvent<HTMLDivElement>) => {
    const pressed = event.target instanceof HTMLElement ? event.target.closest("[role=switch]") : null;
    const figure = figureRef.current;
    if (!pressed || pressed.getAttribute("aria-checked") === "true" || !figure) return;
    if (!window.matchMedia("(max-width: 1023.98px)").matches) return;
    const top = figure.getBoundingClientRect().top;
    const bottom = event.currentTarget.getBoundingClientRect().bottom;
    const bars = window.matchMedia("(max-width: 767.98px)").matches ? 196 : 84;
    if (top < 0 || bottom > window.innerHeight - bars) figure.scrollIntoView({ block: "start", behavior: "instant" });
  };

  const { pending, tried } = projection;
  const open = projection.changes.filter((change) => change.status === "pending" || kept.includes(change.id));
  const decided = projection.changes.filter((change) => change.status !== "pending" && !kept.includes(change.id));
  const trying = tried.length > 0;

  // "See it as" lands on a cost revision; the change it belongs to is outlined.
  const focusedChange = focusedId?.startsWith("rev:")
    ? firm.revisions.find((r) => `rev:${r.id}` === focusedId)?.changeId
    : undefined;

  // A change approved here takes its seal on the house, with the other marks standing back.
  const sealed = open.filter((change) => change.status === "approved");
  const pointedAt = open.find((change) => change.anchor === pointed && change.status === "pending");
  const highlight = pointedAt?.anchor ?? sealed[sealed.length - 1]?.anchor ?? null;

  const together = tried.length === 2 ? "both changes" : "these changes";
  const note = `with ${tried.length === 1 ? tried[0].short : together}, not approved`;
  const contact = contacts[0].name.split(" ")[0];

  return (
    <ClientPage
      tableRef={tableRef}
      head={
        // From 1024 px the first screen is the answer beside the house and its switches; the
        // sheets that hold each change in words start under it.
        <div className="lg:flex lg:min-h-[calc(100svh-9.5rem)] lg:flex-col lg:justify-center">
          <h1 className="display display-xl max-w-[16ch] text-balance">{waitingSentence(pending.length)}</h1>
          {pending.length > 0 && (
            <>
              <p className="mt-4 max-w-[58ch] text-17 text-lime/85">Try one on the house before you decide.</p>
              <a href="#waiting" className="link mt-3 inline-flex min-h-11 items-center self-start">
                Read each change
              </a>
            </>
          )}
        </div>
      }
      table={
        // The rule's own words are set at body size here, so the table keeps to the screen's few sizes.
        <div className="[&_.day-rule-moved]:text-17! [&_.day-rule-planned]:text-17!">
          {/* Room is kept for the tried figure, so the house never jumps. */}
          <div ref={figureRef} className={open.length > 0 ? "scroll-mt-2 min-h-[5.625rem] lg:min-h-[6.5rem]" : "scroll-mt-2"}>
            <p className="text-17 text-lime/80">Your home as agreed, before GST</p>
            <div className="leading-[1.15]">
              <StruckFigure size="lg" agreed={projection.agreedValue} tried={trying ? projection.triedValue : null} note={note} />
            </div>
          </div>

          {/* On a short phone the house gives way, so the figure, the house, the day rule and
              both switches stay on one screen above the strip that rises during a trial. */}
          <div className="mx-auto mt-1 w-full max-w-[max(13rem,calc((100svh_-_498px)_*_720_/_440))] lg:mt-3 lg:max-w-[max(80%,calc((100svh_-_540px)_*_720_/_440))]">
            <House
              scene={{
                only: open.map((change) => change.anchor),
                markers: sealed.length > 0 ? "all" : "needs-you",
                highlight,
              }}
            />
          </div>

          <DayRule className="lg:mt-3" base={projection.handoverAgreed} days={projection.triedDays} />

          {open.length > 0 && (
            <div className="mt-2 lg:mt-3" onClick={afterSwitch}>
              {open.map((change) =>
                change.status === "pending" ? <TryRow key={change.id} change={change} /> : <SettledRow key={change.id} change={change} />,
              )}
            </div>
          )}

          <HouseCaption visible={false} silent={trying}>
            {caption(projection)}
          </HouseCaption>
        </div>
      }
    >
      {/* Once nothing waits, the headline says so; the sheet keeps what was just decided and how changes work. */}
      <Sheet
        id="waiting"
        title={pending.length > 0 ? "Waiting for your decision" : open.length > 0 ? "Decided just now" : "How changes work"}
      >
        {open.length > 0 && (
          <div className="space-y-12">
            {open.map((change) => (
              <ChangeSheet
                key={change.id}
                change={change}
                tableRef={tableRef}
                focused={focusedChange === change.id}
                onDecided={keep}
                onPoint={setPointed}
              />
            ))}
          </div>
        )}
        {pending.length === 0 && (
          <p className={`max-w-[58ch] text-ink-soft${open.length > 0 ? " mt-10" : ""}`}>
            Anything outside your agreement is priced by the Project Head and appears here with its
            effect on handover. Tell {contact} what you would like.
          </p>
        )}
      </Sheet>

      {decided.length > 0 && (
        <Sheet title="Decided" tone="sand">
          <ul className="sheet-rows">
            {decided.map((change) => (
              <DecidedRow
                key={change.id}
                change={change}
                at={projection.approvedAt[change.anchor] ?? demo.changeDecisions[change.id]?.at}
                focused={focusedChange === change.id}
              />
            ))}
          </ul>
        </Sheet>
      )}
    </ClientPage>
  );
}
