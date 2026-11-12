"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { AskForChanges } from "@/components/changes/ask-changes";
import { Watermark } from "@/components/changes/watermark";
import { ApproveControl, DECISION_BAR } from "@/components/craft/approve-control";
import { useOnHidden } from "@/components/craft/seal";
import { RevisionList, RevisionMarks } from "@/components/designs/revision-marks";
import { FloorPlan, REVISIONS } from "@/components/floor-plan";
import { House } from "@/components/house/house";
import { HouseCaption } from "@/components/house/house-caption";
import { Status } from "@/components/page-band";
import { client, TODAY, type Design } from "@/lib/demo-data";
import { useDemo, useProjection } from "@/lib/demo-store";
import { formatDate, formatStamp, listWords } from "@/lib/format";
import { TODAY_STOP } from "@/lib/house-model";
import { groupOf, type StoreyGroup } from "@/lib/projection";

// One drawing or specification, shown and never handed over. The sheet takes the room;
// one row of controls sits over it (under it on a phone), and the decision sits beside it,
// or along the bottom of a phone screen while it is still open.

/** The documents of the kitchen specification package, each a table of rows. Sample text. */
const DOCUMENTS: Record<string, [string, string][]> = {
  "Kitchen specification sheet": [
    ["Counter", "20 mm black galaxy granite with a half-round edge, 600 mm deep"],
    ["Cabinets", "Marine plywood carcass with matt laminate shutters and soft-close hinges"],
    ["Wall tiles", "300 by 600 mm glazed ceramic up to 600 mm above the counter"],
    ["Water points", "Hot and cold at the sink, one point for the purifier, one for the dishwasher"],
  ],
  "Sink and hob data sheet": [
    ["Sink", "Stainless steel double bowl with drain board, 1,150 by 500 mm"],
    ["Tap", "Wall-mounted sink mixer with a swivel spout"],
    ["Hob", "Four-burner built-in glass hob with auto ignition"],
    ["Gas line", "Copper line from the utility, with a shut-off valve under the counter"],
  ],
  "Chimney data sheet": [
    ["Chimney", "900 mm wall-mounted, filterless, 1,200 cubic metres per hour"],
    ["Duct", "150 mm round duct to the outside wall, with a back-draught flap"],
    ["Power", "One 16 A point above the counter, 2,100 mm from the floor"],
  ],
};

const FLOORS: Record<StoreyGroup, string> = {
  second: "second floor",
  first: "first floor",
  ground: "ground floor",
};

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** One choice in the row of controls. The one in use is filled. */
function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} className="chip" onClick={onClick}>
      {children}
    </button>
  );
}

export function DesignViewer({ design }: { design: Design }) {
  const projection = useProjection();
  const demo = useDemo();

  const projected = projection.designs.find((row) => row.design.id === design.id);
  const shownDesign = projected?.design ?? design;
  const latest = projected?.latest ?? design.versions[design.versions.length - 1];
  const status = latest.status;
  const revisions = REVISIONS[design.id];
  const group = groupOf(design.anchor);
  /** The floor the house panel opens at. The elevation is the whole front, so it stays shut. */
  const openFloor = design.drawing === "elevation" ? null : group;
  const isSheet = design.drawing !== "spec";
  const documents = design.documents ?? [];

  /** "changed" draws the latest version over the one before it. */
  const [view, setView] = useState<number | "changed">(latest.version);
  const [larger, setLarger] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [asBuilt, setAsBuilt] = useState(false);
  const [doc, setDoc] = useState(0);

  // An approve control makes everything inside this element follow a hold.
  const bodyRef = useRef<HTMLDivElement>(null);
  const placeRefs = useRef<Record<number, HTMLElement | null>>({});
  useOnHidden(bodyRef, () => setSelected(null));

  const watermark = `${client.name}, ${formatDate(TODAY)}, view only`;
  const earlier = shownDesign.versions.slice(0, -1).reverse();
  const shown = view === "changed" ? latest.version : view;
  const decision = demo.designDecisions[design.id];
  const decidedAt = decision?.at ? formatStamp(decision.at) : formatDate(latest.decidedOn ?? TODAY);
  const headTo = listWords([...new Set([latest.uploadedBy, "Vikram Desai"])]);

  const choose = (n: number | null) => {
    setSelected(n);
    // In the larger drawing the place may be off to one side; bring it into the box.
    if (n !== null && larger) placeRefs.current[n]?.scrollIntoView({ block: "nearest", inline: "center" });
  };

  const frame =
    status === "awaiting" ? "border-2 border-dashed border-brass" : status === "approved" ? "border-2 border-ink" : "border-2 border-ink/35";

  const houseCaption =
    design.drawing === "elevation" ? "This drawing shows the whole front of the house." : `This ${design.kind.toLowerCase()} is for the ${FLOORS[group]}.`;

  const controls = (
    <div className="flex flex-wrap gap-2 print:hidden" role="group" aria-label="How the sheet is shown">
      {isSheet && (
        <>
          <Choice on={!larger} onClick={() => setLarger(false)}>
            Fit
          </Choice>
          <Choice on={larger} onClick={() => setLarger(true)}>
            Larger
          </Choice>
        </>
      )}
      {revisions &&
        [...shownDesign.versions.map((v) => v.version), "changed" as const].map((option) => (
          <Choice
            key={option}
            on={view === option}
            onClick={() => {
              setView(option);
              setSelected(null);
            }}
          >
            {option === "changed" ? "What changed" : `Version ${option}`}
          </Choice>
        ))}
      {design.drawing === "elevation" && (
        <>
          <Choice on={!asBuilt} onClick={() => setAsBuilt(false)}>
            As designed
          </Choice>
          <Choice on={asBuilt} onClick={() => setAsBuilt(true)}>
            As built today
          </Choice>
        </>
      )}
      {documents.length > 0 &&
        documents.map((name, index) => (
          <Choice key={name} on={doc === index} onClick={() => setDoc(index)}>
            {name}
          </Choice>
        ))}
    </div>
  );

  return (
    <>
      <section className="on-dark bg-rosewood text-lime">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-8 sm:pb-10 sm:pt-6">
          <Link href="/client/designs" className="link inline-flex min-h-11 items-center text-lime/80">
            Back to all designs
          </Link>
          <h1 className="display display-lg mt-2 max-w-3xl">
            {design.title}, version {latest.version}
          </h1>
          <p className="mt-3 max-w-[58ch] text-17 text-lime/85">{latest.note}</p>
        </div>
      </section>

      <div
        ref={bodyRef}
        className="mx-auto grid max-w-6xl gap-x-12 gap-y-8 px-4 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]"
      >
        {/* The sheet. It is shown, never handed over. */}
        <section aria-label={design.kind === "Drawing" ? "The drawing" : "The specification"} className="min-w-0 lg:row-span-3">
          <div className="max-lg:hidden">{controls}</div>

          <div className="relative mt-4 print:hidden">
            <p className="lettering mb-1 text-ink-soft">{design.sheet}</p>
            <div
              className={`relative bg-paper ${frame}`}
              onContextMenu={(event) => event.preventDefault()}
              onDragStart={(event) => event.preventDefault()}
            >
              {status === "awaiting" && (
                <div aria-hidden="true" className="hold-in pointer-events-none absolute -inset-0.5 z-[2] border-2 border-ink" />
              )}
              <div
                className={larger ? "overflow-x-auto" : "overflow-hidden"}
                tabIndex={larger ? 0 : undefined}
                role={larger ? "group" : undefined}
                aria-label={larger ? "Drawing, scrolls sideways" : undefined}
              >
                <div className="relative select-none" style={larger ? { minWidth: "max(760px, 130%)" } : undefined}>
                  {design.drawing === "plan" && (
                    <>
                      <FloorPlan
                        designId={design.id}
                        title={design.title}
                        sheet={design.sheet}
                        version={shown}
                        changedFrom={view === "changed" ? latest.version - 1 : undefined}
                      />
                      {revisions && view === "changed" && (
                        <RevisionMarks changes={revisions.changes} selected={selected} onSelect={choose} placeRefs={placeRefs} />
                      )}
                    </>
                  )}
                  {design.drawing === "elevation" && (
                    <div className="px-3 py-8 sm:px-8">
                      <House tone="light" flat labels scene={{ stop: asBuilt ? TODAY_STOP : 10, markers: "none", money: false }} />
                    </div>
                  )}
                  {design.drawing === "spec" && (
                    <div className="px-5 py-6 sm:px-10 sm:py-10">
                      <p className="display text-22">{documents[doc] ?? design.title}</p>
                      <p className="text-ink-soft">Iyer Residence, sheet {design.sheet}</p>
                      <dl className="mt-5">
                        {(DOCUMENTS[documents[doc]] ?? DOCUMENTS["Kitchen specification sheet"]).map(([item, spec], index) => (
                          <div
                            key={item}
                            className={`grid gap-x-6 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]${index > 0 ? " border-t border-sand" : ""}`}
                          >
                            <dt className="font-semibold">{item}</dt>
                            <dd>{spec}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                  <Watermark text={watermark} />
                </div>
              </div>
            </div>
          </div>
          <p className="hidden print:block">This sheet opens in the portal only and is not printed.</p>

          {documents.length > 1 && (
            <div className="mt-3 flex items-center justify-between gap-4 print:hidden">
              <p className="text-15 text-ink-soft">
                Document {doc + 1} of {documents.length}
              </p>
              <div className="flex gap-2">
                <button type="button" className="btn btn-quiet" aria-disabled={doc === 0 || undefined} onClick={() => setDoc(Math.max(0, doc - 1))}>
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-quiet"
                  aria-disabled={doc === documents.length - 1 || undefined}
                  onClick={() => setDoc(Math.min(documents.length - 1, doc + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 lg:hidden">{controls}</div>

          {design.drawing === "elevation" && (
            <HouseCaption visible={false} tag={asBuilt ? "Today" : "Forecast"}>
              {asBuilt ? "As built today." : "As designed, at handover."}
            </HouseCaption>
          )}

          {revisions && view === "changed" && (
            <div className="mt-5 print:hidden">
              <h2 className="text-15 font-semibold">What changed from version {latest.version - 1}</h2>
              <div className="mt-2 max-w-xl">
                <RevisionList changes={revisions.changes} selected={selected} onSelect={choose} />
              </div>
            </div>
          )}

          {/* On a phone the bar along the bottom keeps to its buttons, so when it is needed is said here. */}
          {status === "awaiting" && design.neededBefore && (
            <p className="mt-4 max-w-[58ch] font-semibold lg:hidden">Needed {design.neededBefore}.</p>
          )}

          <p className="mt-4 max-w-[58ch] text-ink-soft">
            This opens here only and cannot be downloaded. Your name and today&rsquo;s date are marked across it.
          </p>
        </section>

        {/* The decision. While it is open, it rides along the bottom of a phone screen. */}
        <section
          aria-label="Your decision"
          className={`min-w-0 lg:col-start-2 lg:row-start-1 ${status === "awaiting" ? DECISION_BAR : ""}`}
        >
          {status === "awaiting" && design.neededBefore && (
            <p className="mb-3 max-w-[58ch] max-lg:hidden">Needed {design.neededBefore}.</p>
          )}
          {status !== "changes-requested" ? (
            <ApproveControl
              confirmTitle={`Approve ${lowerFirst(design.title)}, version ${latest.version}?`}
              confirmBody="This is recorded with your name, the date and the time."
              what={`Your approval of the ${lowerFirst(design.title)}, version ${latest.version}`}
              note
              approved={status === "approved"}
              onApprove={(note) => demo.decideDesign(design.id, "approved", undefined, note)}
              receipt={
                <p>
                  Approved by {client.name} on {decidedAt}, version {latest.version}. {headTo} were emailed.
                </p>
              }
              holdTarget={design.anchor}
              scopeRef={bodyRef}
              secondary={
                <AskForChanges
                  what={`Your request for changes to the ${lowerFirst(design.title)}`}
                  onSend={(comment) => demo.decideDesign(design.id, "changes-requested", comment)}
                />
              }
            />
          ) : (
            <div role="status">
              <p>
                You asked for changes on {decidedAt}, version {latest.version}. {latest.uploadedBy} will upload a new version.
              </p>
              {latest.comment && <p className="mt-2 text-ink-soft">You wrote: {latest.comment}</p>}
            </div>
          )}
        </section>

        <section aria-label="On your house" className="min-w-0 lg:col-start-2">
          {/* The room above the house is for the storeys that lift where it is open. */}
          <div
            className="on-dark bg-rosewood px-4 pb-4 text-lime"
            style={{ paddingTop: openFloor ? "calc(var(--part) + 1rem)" : "1.5rem" }}
          >
            <House className="house-capped" scene={{ only: [design.anchor], focus: openFloor, stringLabel: false }} />
            <HouseCaption visible={false}>{houseCaption}</HouseCaption>
          </div>
        </section>

        {earlier.length > 0 && (
          <section className="min-w-0 lg:col-start-2">
            <h2 className="display text-22">Earlier versions</h2>
            <ol className="mt-3 border-t border-ink">
              {earlier.map((version, index) => (
                <li key={version.version} className={`py-4${index > 0 ? " border-t border-sand" : ""}`}>
                  <p>
                    Version {version.version}, uploaded by {version.uploadedBy} on {formatDate(version.uploadedOn)}.
                  </p>
                  {version.decidedOn && (
                    <p className="text-ink-soft">
                      {version.status === "approved" ? <Status tone="done">Approved</Status> : "Changes asked"} on{" "}
                      {formatDate(version.decidedOn)}.
                    </p>
                  )}
                  {version.comment && <p className="mt-1 text-ink-soft">You wrote: {version.comment}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </>
  );
}
