"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { useOnHidden } from "@/components/craft/seal";
import { StruckFigure } from "@/components/craft/struck-figure";
import { FloorNote } from "@/components/home/floor-note";
import { Sheet } from "@/components/home/sheet";
import { WaitingList } from "@/components/home/waiting-list";
import { House } from "@/components/house/house";
import { HouseCaption } from "@/components/house/house-caption";
import { HouseLegend } from "@/components/house/house-legend";
import { ClientPage } from "@/components/page-band";
import { ThreadPost } from "@/components/thread/thread";
import { client, contacts, site, TODAY } from "@/lib/demo-data";
import { useDemo, useProjection } from "@/lib/demo-store";
import { countWord, dayCount, daysBetween, formatDate, inr, listWords } from "@/lib/format";
import { BANDS, STOPS, STOREYS } from "@/lib/house-model";
import type { StoreyGroup, WaitingItem } from "@/lib/projection";

// Iyer Residence home. It answers three questions and says each fact once: what needs her
// next (the headline, the one button and the one peg on the house), what she has agreed to,
// and who to call. Everything else is a link to the page that holds it.

// The floor bands of the house, in the order they are drawn: top to bottom.
const BAND_ORDER: StoreyGroup[] = ["second", "first", "ground"];

/** From this width the house stands beside the sheets, so a row can point at its peg. */
const besideTheSheets = () => window.matchMedia("(min-width: 1024px)").matches;

function headline(count: number): string {
  if (count === 0) return `Nothing needs you this week, ${client.firstName}.`;
  if (count === 1) return `One thing is waiting for you, ${client.firstName}.`;
  return `${countWord(count, true)} things are waiting for you, ${client.firstName}.`;
}

/** The item as it reads after "the next thing waiting for you:". */
function itemWords(item: WaitingItem): string {
  const title = item.title.charAt(0).toLowerCase() + item.title.slice(1);
  switch (item.kind) {
    case "stage":
      // "Accept the first floor structure as finished"
      return `accepting ${title.replace(/^accept /, "")}`;
    case "schedule":
      return `the change to your schedule for milestone ${item.key.split(":")[1]}`;
    default:
      return title.startsWith("the ") ? title : `the ${title}`;
  }
}

/** The peg's caption: what the one mark at rest stands for. */
function pegWords(item: WaitingItem | undefined): string {
  if (!item) return "Nothing is waiting for you. Every brass seal is something you agreed.";
  return `The brass peg marks the next thing waiting for you: ${itemWords(item)}.`;
}

function floorWords(label: string, waiting: number, agreed: number): string {
  const waitingWords =
    waiting === 0 ? "Nothing is waiting here" : waiting === 1 ? "One thing is waiting here" : `${countWord(waiting, true)} things are waiting here`;
  const agreedWords = agreed === 0 ? "nothing is agreed yet" : agreed === 1 ? "one is agreed" : `${countWord(agreed)} are agreed`;
  return `${label}. ${waitingWords} and ${agreedWords}.`;
}

function tel(phone: string) {
  return `tel:${phone.replace(/\s/g, "")}`;
}

export default function ClientHome() {
  const demo = useDemo();
  const projection = useProjection();
  const { waiting, pending } = projection;
  // The floor the house is open at, and the row under the pointer or the focus.
  const [focus, setFocus] = useState<StoreyGroup | null>(null);
  const [pointed, setPointed] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  // A pointer that was over a row when she left never reports leaving it.
  useOnHidden(tableRef, () => setPointed(null));
  // A tall floor note makes the table scroll inside itself. Keeping the room for that
  // scrollbar from the start means the house does not change size as a floor opens.
  useLayoutEffect(() => {
    tableRef.current?.style.setProperty("scrollbar-gutter", "stable");
  }, []);

  const bands = () => tableRef.current?.getElementsByClassName("band");

  /** Closing from inside the note hands the focus back to the floor it belonged to. */
  const closeFromNote = () => {
    const band = focus ? bands()?.[BAND_ORDER.indexOf(focus)] : undefined;
    if (band instanceof HTMLElement) band.focus({ preventScroll: true });
    setFocus(null);
  };

  const point = (anchor: string | null) => {
    if (anchor === null || besideTheSheets()) setPointed(anchor);
  };

  const builtUpTo = STOPS[projection.todayStop].builtUpTo;
  const underWay = STOREYS.find((storey) => storey.id === builtUpTo + 1);
  const curingDay = daysBetween(site.curing.startedOn, TODAY);
  const curing = curingDay >= 0 && curingDay <= site.curing.days;
  const next = waiting[0];
  const status = `${underWay ? `${underWay.label} walls going up. ` : ""}Handover ${formatDate(projection.handoverAgreed)}.`;
  const siteNote = `${underWay ? `${underWay.label} going up.` : "On site."}${
    curing ? ` Slab curing, day ${curingDay} of ${site.curing.days}` : ""
  }`;

  // At rest the house shows one peg: the next item. A row under the pointer shows its own
  // peg as well. With a floor open, every peg on that floor shows.
  const only = focus
    ? waiting.filter((item) => item.group === focus).map((item) => item.anchor)
    : next
      ? [next.anchor]
      : [];
  const caption = focus
    ? floorWords(
        BANDS[focus].label,
        waiting.filter((item) => item.group === focus).length,
        projection.agreed.filter((item) => item.group === focus).length,
      )
    : pegWords(next);

  // The newest word from someone on the team, with one photo at most.
  const latest = projection.posts.find((post) => post.kind === "post" && post.by !== "meera" && post.by !== "arjun");
  const { during } = projection.credits;
  const left = Math.max(0, projection.credits.left);
  const [first, head, office] = contacts;
  const tried = projection.tried;
  const triedNames = listWords(tried.map((change) => change.short));
  // "Would add" reads the same for the jacuzzi and for the larger windows.
  const pricedLine =
    pending.length === 0
      ? null
      : `${pending.length === 1 ? "One change is" : `${countWord(pending.length, true)} changes are`} priced. ${pending
          .map(
            (change) =>
              `${change.short.charAt(0).toUpperCase()}${change.short.slice(1)} would add ${inr(change.cost)}${
                change.delayDays > 0 ? ` and ${dayCount(change.delayDays)}` : ""
              }.`,
          )
          .join(" ")}`;

  // From 1024 px the head is the calm first screen beside the house: the answer and one
  // button, with the first row of what needs her just under it.
  const top = (
    <div className="lg:flex lg:min-h-[29rem] lg:flex-col lg:justify-center">
      <h1 className="display display-xl max-w-[13ch]">{headline(waiting.length)}</h1>
      <p className="mt-4 max-w-[56ch] text-17 text-lime/85 lg:mt-5">{status}</p>
      {next && (
        <Link href={next.href} className="btn btn-primary mt-5 self-start lg:mt-6">
          {next.cta}
        </Link>
      )}
    </div>
  );

  // The house keeps its place when a floor is opened: the note grows downwards from it,
  // and from 1024 px the table scrolls inside itself when the note is tall.
  const table = (
    <div className="flex flex-col">
      <House
        arrival
        interactive
        labels
        scene={{ only, highlight: pointed, markers: "needs-you", note: siteNote, focus }}
        onFocusChange={setFocus}
      />
      <div className="mt-4">
        <p aria-hidden="true" className="max-w-[58ch] text-17">
          {caption}
        </p>
        <HouseCaption visible={false}>{caption}</HouseCaption>
      </div>
      {focus && (
        <div className="mt-4">
          <FloorNote key={focus} group={focus} onClose={closeFromNote} />
        </div>
      )}
      {/* The note is what is read while a floor is open, so the legend stands aside for it. */}
      {!focus && (
        <div className="mt-2">
          <HouseLegend
            show={["built", "paid", "to-come", "line", "peg"]}
            open={!demo.taught.legend}
            onDone={demo.taught.legend ? undefined : () => demo.teach("legend")}
          />
        </div>
      )}
    </div>
  );

  return (
    <ClientPage head={top} table={table} tableRef={tableRef}>
      {/* What decision or payment is due next? */}
      <Sheet id="next" title="What needs you">
        <WaitingList items={waiting} projection={projection} onPoint={point} />
      </Sheet>

      {/* What have I agreed to? */}
      <Sheet title="What you have agreed to" tone="sand">
        <StruckFigure
          size="md"
          agreed={projection.agreedValue}
          tried={tried.length > 0 ? projection.triedValue : null}
          note={`with ${triedNames}, not approved`}
        />
        <p className="mt-1 max-w-[58ch] text-ink-soft">The approved value of your home, before GST.</p>
        <Link href="/client/record" className="link mt-3 inline-flex min-h-11 items-center font-semibold">
          Your agreement and every decision
        </Link>
        {pricedLine && (
          <>
            <p className="mt-3 max-w-[58ch]">{pricedLine}</p>
            <Link href="/client/changes" className="link inline-flex min-h-11 items-center">
              {pending.length === 1 ? "Try it on the house" : "Try them on the house"}
            </Link>
          </>
        )}
      </Sheet>

      {/* What is happening on site? */}
      {latest && (
        <Sheet title="Latest from site">
          <ThreadPost post={{ ...latest, photos: latest.photos.slice(0, 1) }} />
          <Link href="/client/updates" className="link mt-4 inline-flex min-h-11 items-center">
            All updates
          </Link>
        </Sheet>
      )}

      {/* Who to talk to */}
      <Sheet title="Your team and your hours">
        <p className="max-w-[58ch]">
          Start with {first.name}, {first.role.toLowerCase()}.{" "}
          <a href={tel(first.phone)} className="link inline-flex min-h-11 items-center whitespace-nowrap font-semibold">
            {first.phone}
          </a>
        </p>
        <ul className="mt-2">
          {[head, office].map((contact) => (
            <li key={contact.name} className="flex flex-wrap items-center justify-between gap-x-4">
              <span className="text-ink-soft">
                Then {contact === office ? "the director's desk at the office" : `${contact.name}, ${contact.role}`}
              </span>
              <a href={tel(contact.phone)} className="link inline-flex min-h-11 items-center whitespace-nowrap">
                {contact.phone}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-5 max-w-[58ch]">
          {left} of {during.granted} construction hours left.{projection.credits.low ? " You are running low." : ""}{" "}
          <Link href="/client/hours" className="link inline-flex min-h-11 items-center">
            See your hours
          </Link>
        </p>
      </Sheet>
    </ClientPage>
  );
}
