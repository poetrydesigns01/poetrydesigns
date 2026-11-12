"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ApproveControl } from "@/components/craft/approve-control";
import { DayRule } from "@/components/craft/day-rule";
import { RollingFigure } from "@/components/craft/rolling-figure";
import { Peg, Seal } from "@/components/craft/seal";
import { StruckFigure } from "@/components/craft/struck-figure";
import { TrySwitch } from "@/components/craft/try-switch";
import { House, type HouseScene } from "@/components/house/house";
import { HouseCaption } from "@/components/house/house-caption";
import { HouseLegend, type LegendKey } from "@/components/house/house-legend";
import { HouseMark, markForStop } from "@/components/house/house-mark";
import { Sheet, Status } from "@/components/page-band";
import { TrialStrip } from "@/components/trial-strip";
import { PegGlyph, SealGlyph } from "@/components/instruments/glyphs";
import { MaterialStack } from "@/components/instruments/material-stack";
import { PlotOutline } from "@/components/instruments/plot-outline";
import { ProgrammeStrip } from "@/components/instruments/programme-strip";
import { markOf, ProjectMark } from "@/components/instruments/project-mark";
import { RequestLadder } from "@/components/instruments/request-ladder";
import { SamplePhoto } from "@/components/instruments/sample-photo";
import { courseWords, TaskCourse } from "@/components/instruments/task-course";
import { TeakCut, teakWords } from "@/components/instruments/teak-cut";
import { stampNow } from "@/lib/clock";
import { client, TODAY, withGst } from "@/lib/demo-data";
import {
  DEMO_STORAGE_KEY,
  resetDemo,
  setStorageKey,
  useDemo,
  useFirm,
  useProjection,
  type DemoState,
  type FirmEvent,
  type NewEvent,
} from "@/lib/demo-store";
import { deriveFirm } from "@/lib/firm";
import {
  courses,
  firmCatalogue,
  type CatalogueItem,
  type PersonId,
  type PhotoKind,
  type ProjectId,
} from "@/lib/firm-data";
import { formatDate, inr, inrSigned, listWords, percent } from "@/lib/format";
import { ANCHORS, BANDS, STOPS, TODAY_STOP } from "@/lib/house-model";
import { derive, type StoreyGroup } from "@/lib/projection";

// A plain gallery of the house and the shared pieces in every state, for looking at while
// building. It is not linked from anywhere and exists only in development. It keeps its own
// demo state under its own storage key, so trying, approving and the chain buttons here never
// touch the state the real screens use in this tab. Every house on the page moves together.

const ALL_KEYS: LegendKey[] = ["built", "paid", "approved", "to-come", "peg", "seal", "trying", "line"];
const GROUPS: StoreyGroup[] = ["ground", "first", "second"];
const MARKERS: NonNullable<HouseScene["markers"]>[] = ["all", "needs-you", "agreed", "none"];
const HOLD_TARGETS = ["pay:3", "change:terrace-jacuzzi", "change:living-glazing"];
const FIGURES = [8710000, 8950000, 9034000, 10277800, 999999];
const DAYS = [0, 12, 16];

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="border-t border-current/30 py-8">
      <h2 className="display display-md">{title}</h2>
      {note && <p className="mt-1 max-w-2xl opacity-75">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Toggle({ on, onClick, children }: { on?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`btn ${on ? "btn-primary" : "btn-quiet"}`}
      aria-pressed={on === undefined ? undefined : on}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function HouseGallery() {
  // Its own state, from before the first paint until it is hidden or left.
  useLayoutEffect(() => {
    setStorageKey("poetry-dev-gallery");
    return () => setStorageKey(DEMO_STORAGE_KEY);
  }, []);

  const demo = useDemo();
  const projection = useProjection();
  const [stop, setStop] = useState(TODAY_STOP);
  const [focus, setFocus] = useState<StoreyGroup | null>(null);
  const [markers, setMarkers] = useState<NonNullable<HouseScene["markers"]>>("all");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [holdTarget, setHoldTarget] = useState(HOLD_TARGETS[0]);
  const [hold, setHold] = useState(0);
  const [run, setRun] = useState(0);
  const [figure, setFigure] = useState(0);
  const [days, setDays] = useState(12);
  const [marks, setMarks] = useState(0);
  // The approve controls further down make everything inside this element follow a hold.
  const scopeRef = useRef<HTMLDivElement>(null);

  const jacuzzi = projection.changes.find((change) => change.id === "terrace-jacuzzi");
  const terrace = projection.designs.find(({ design }) => design.id === "terrace-plan");
  const payment = inr(projection.milestones.find((milestone) => milestone.id === 3)?.agreedTotal ?? 0);
  const triedNote = `with ${listWords(projection.tried.map((change) => change.short))}, not approved`;
  const signed = `Approved by ${client.name} on ${formatDate(TODAY)}`;

  const tag = stop < TODAY_STOP ? "Looking back" : stop > TODAY_STOP ? "Forecast" : "Today";
  const sentence = focus
    ? `${BANDS[focus].label} is open.`
    : stop === 0
      ? "Before any building: design work began and the plot was set out."
      : `After this payment's work: ${STOPS[stop].buys}.`;

  return (
    <main className="min-h-full flex-1" style={{ "--trial-strip-bottom": "0px" } as CSSProperties}>
      <div className="on-dark bg-rosewood text-lime">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          <h1 className="display display-lg">The house, in every state</h1>
          <p className="mt-3 max-w-2xl text-lime/80">
            One component draws all of these. This page is for checking it and is not linked from the portal. The
            shared pieces every screen is made of are further down.
          </p>

          <Block
            title="The live house"
            note="Press a floor to open it. Everything below changes this one house, and trying or approving changes every house on the page."
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
              <div
                data-holding={hold > 0 ? holdTarget : undefined}
                style={hold > 0 ? ({ "--hold": hold } as CSSProperties) : undefined}
              >
                <div className="pt-12">
                  <House
                    key={run}
                    arrival
                    arrivalKey={`gallery-${run}`}
                    interactive
                    labels
                    scene={{ stop, focus, markers, highlight }}
                    onFocusChange={setFocus}
                  />
                </div>
                <div className="mt-4">
                  <HouseCaption tag={projection.trialSentence ? "Trying" : tag}>
                    {projection.trialSentence ?? sentence}
                  </HouseCaption>
                </div>
                <div className="mt-3">
                  <HouseLegend show={ALL_KEYS} />
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="gallery-stop" className="lettering block">
                    Payment stop {stop} of 10
                  </label>
                  <input
                    id="gallery-stop"
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={stop}
                    onChange={(event) => setStop(Number(event.target.value))}
                    className="mt-2 w-full max-w-sm"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Toggle onClick={() => setStop((s) => Math.max(0, s - 1))}>Earlier payment</Toggle>
                    <Toggle onClick={() => setStop(TODAY_STOP)}>Back to today</Toggle>
                    <Toggle onClick={() => setStop((s) => Math.min(10, s + 1))}>Later payment</Toggle>
                  </div>
                </div>

                <div>
                  <p className="lettering">Open at a floor</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {GROUPS.map((group) => (
                      <Toggle key={group} on={focus === group} onClick={() => setFocus(focus === group ? null : group)}>
                        {BANDS[group].label}
                      </Toggle>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="lettering">Try a change</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {projection.pending.map((change) => (
                      <Toggle key={change.id} on={change.trying} onClick={() => demo.setTrying(change.id, !change.trying)}>
                        Try {change.short}
                      </Toggle>
                    ))}
                    <Toggle onClick={demo.stopTrying}>Stop trying</Toggle>
                  </div>
                </div>

                <div>
                  <p className="lettering">Decide</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Toggle on={demo.paymentApproved} onClick={demo.approvePayment}>
                      Approve the payment
                    </Toggle>
                    {projection.pending.map((change) => (
                      <Toggle key={change.id} onClick={() => demo.decideChange(change.id, "approved")}>
                        Approve {change.short}
                      </Toggle>
                    ))}
                    <Toggle onClick={() => demo.decideDesign("terrace-plan", "approved")}>Approve the terrace plan</Toggle>
                    <Toggle onClick={resetDemo}>Start the demo again</Toggle>
                  </div>
                </div>

                <div>
                  <label htmlFor="gallery-hold" className="lettering block">
                    Hold to approve, by hand: {Math.round(hold * 100)}%
                  </label>
                  <input
                    id="gallery-hold"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={hold}
                    onChange={(event) => setHold(Number(event.target.value))}
                    className="mt-2 w-full max-w-sm"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {HOLD_TARGETS.map((target) => (
                      <Toggle key={target} on={holdTarget === target} onClick={() => setHoldTarget(target)}>
                        {target}
                      </Toggle>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="lettering">Marks</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MARKERS.map((mode) => (
                      <Toggle key={mode} on={markers === mode} onClick={() => setMarkers(mode)}>
                        {mode}
                      </Toggle>
                    ))}
                  </div>
                  <label htmlFor="gallery-highlight" className="lettering mt-3 block">
                    Point at one mark
                  </label>
                  <select
                    id="gallery-highlight"
                    value={highlight ?? ""}
                    onChange={(event) => setHighlight(event.target.value || null)}
                    className="mt-2 min-h-11 rounded-[3px] border border-lime/50 bg-rosewood px-3"
                  >
                    <option value="">None</option>
                    {Object.keys(ANCHORS).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Toggle
                    onClick={() => {
                      setStop(TODAY_STOP);
                      setFocus(null);
                      setRun((r) => r + 1);
                    }}
                  >
                    Play the arrival again
                  </Toggle>
                </div>
              </div>
            </div>
          </Block>

          <Block title="Every payment stop" note="Stops 0 to 2 look back, 3 is today, and 4 to 10 are a forecast.">
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {STOPS.map(({ stop: at, buys }) => (
                <figure key={at}>
                  <House scene={{ stop: at }} />
                  <figcaption className="lettering mt-3">
                    Stop {at}: {buys}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Block>

          <Block title="Open at each floor">
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {GROUPS.map((group) => (
                <figure key={group} className="pt-12">
                  <House scene={{ focus: group }} />
                  <figcaption className="lettering mt-3">{BANDS[group].label}</figcaption>
                </figure>
              ))}
            </div>
          </Block>

          <Block title="Marks" note="The same house with only what needs her, only what is agreed, and one mark pointed at.">
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              <figure>
                <House scene={{ markers: "needs-you" }} />
                <figcaption className="lettering mt-3">Needs you</figcaption>
              </figure>
              <figure>
                <House scene={{ markers: "agreed" }} />
                <figcaption className="lettering mt-3">Agreed</figcaption>
              </figure>
              <figure>
                <House scene={{ highlight: "design:kitchen-spec" }} />
                <figcaption className="lettering mt-3">Pointing at the kitchen specification</figcaption>
              </figure>
            </div>
          </Block>

          <Block title="Tones and the flat elevation">
            <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
              <figure>
                <House labels />
                <figcaption className="lettering mt-3">Dark, on the table, with storey names</figcaption>
              </figure>
              <figure>
                <House flat labels />
                <figcaption className="lettering mt-3">Dark, flat</figcaption>
              </figure>
              <figure>
                <div className="bg-lime p-4 text-ink">
                  <House tone="light" labels />
                </div>
                <figcaption className="lettering mt-3">Light, on paper</figcaption>
              </figure>
              <figure>
                <div className="bg-paper p-4 text-ink">
                  <House tone="light" flat labels scene={{ stop: 10, markers: "none", money: false }} />
                </div>
                <figcaption className="lettering mt-3">Light, flat, as designed</figcaption>
              </figure>
              <figure>
                <div className="bg-paper p-4 text-ink">
                  <House tone="line" labels scene={{ markers: "none", highlight: "pay:3" }} />
                </div>
                <figcaption className="lettering mt-3">Line only, with the first floor pointed at</figcaption>
              </figure>
              <figure>
                <div className="bg-paper p-4 text-ink">
                  <House tone="line" flat scene={{ stop: 10, markers: "none" }} />
                </div>
                <figcaption className="lettering mt-3">Line only, flat, the whole house</figcaption>
              </figure>
            </div>
          </Block>

          <Block title="The small house" note="For list rows, the entry screen and the letter.">
            <div className="flex flex-wrap items-end gap-6">
              {STOPS.map(({ stop: at }) => (
                <figure key={at} className="text-center">
                  <HouseMark {...markForStop(at)} title={`The house at payment stop ${at}`} className="w-[48px]" />
                  <figcaption className="lettering mt-1">{at}</figcaption>
                </figure>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-end gap-8">
              <HouseMark upTo={2} />
              <HouseMark upTo={2} highlight={[3]} />
              <HouseMark upTo={4} highlight={[2]} className="w-[96px]" />
              <div className="bg-paper p-3">
                <HouseMark tone="light" upTo={2} />
              </div>
              <div className="bg-paper p-3">
                <HouseMark tone="line" upTo={4} />
              </div>
              <div className="bg-paper p-3">
                <HouseMark tone="line" upTo={4} highlight={[2]} className="w-[96px]" />
              </div>
            </div>
          </Block>

          <Block title="Captions">
            <div className="space-y-3">
              <HouseCaption>
                Built: plinth, ground floor and first floor. Being built now: second floor. Site last updated on 6 Nov
                2026 by Suresh Gowda.
              </HouseCaption>
              <HouseCaption tag="Looking back">On 29 Aug 2026 you paid ₹15,41,670 for the ground floor structure.</HouseCaption>
              <HouseCaption tag="Forecast">
                A forecast, it can move. In January 2027 the second floor and the roof slab should be finished.
              </HouseCaption>
            </div>
          </Block>

          <Block
            title="Trying a change, on the table"
            note="The figure, the day rule and the switches as they sit under the house on the changes screen. Switch one on and the strip rises along the bottom."
          >
            <div className="max-w-xl">
              <p className="lettering">Your home as agreed</p>
              <div className="mt-1">
                <StruckFigure
                  size="lg"
                  agreed={projection.agreedValue}
                  tried={projection.tried.length > 0 ? projection.triedValue : null}
                  note={triedNote}
                />
              </div>
              {projection.tried.length > 0 && (
                <p className="mt-1 text-15 text-lime/80">
                  Adds {inr(projection.triedCost)}, or {inr(withGst(projection.triedCost).total)} with GST.
                </p>
              )}
              <DayRule className="mt-6" base={projection.handoverAgreed} days={projection.triedDays} />
              <div className="mt-5">
                {projection.pending.map((change) => (
                  <TrySwitch key={change.id} change={change} />
                ))}
                {projection.pending.length === 0 && <p className="text-lime/80">No changes are open.</p>}
              </div>
            </div>
          </Block>
        </div>
      </div>

      <div className="bg-lime text-ink">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          <h2 className="display display-lg">The shared pieces</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            The same pieces on paper, where most of them are used. Everything here is live and writes to the demo
            state.
          </p>

          <Block
            title="Approving"
            note="Tap, Enter or Space opens the two steps. Press and hold and the ring closes; on the house the lime runs into the first floor, and the five blocks and the frame beside it follow the same hold. Let go early and nothing is recorded. There is no pause provider in this gallery, so an approval is recorded at once."
          >
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-10">
                <div>
                  <p className="lettering mb-3">A payment</p>
                  <ApproveControl
                    label={`Approve ${payment}`}
                    confirmTitle={`Approve ${payment} for the first floor structure?`}
                    confirmBody="Approving writes a demand letter that you can send to your bank. It does not move any money, and it is recorded with your name, the date and the time."
                    approved={demo.paymentApproved}
                    onApprove={demo.approvePayment}
                    receipt={<p>{signed}. Waiting for your bank to release the payment.</p>}
                    holdTarget="pay:3"
                    scopeRef={scopeRef}
                  />
                </div>
                {jacuzzi && (
                  <div>
                    <p className="lettering mb-3">A change, with a second button beside it</p>
                    <ApproveControl
                      label="Approve this change"
                      confirmTitle={`Approve the jacuzzi on the terrace for ${inr(withGst(jacuzzi.cost).total)} with GST and ${jacuzzi.delayDays} more days?`}
                      confirmBody="It is added to your approved value and recorded as an addendum to your agreement, with your name, the date and the time."
                      approved={jacuzzi.status === "approved"}
                      onApprove={() => demo.decideChange(jacuzzi.id, "approved")}
                      receipt={
                        <p>
                          {signed}. Recorded as {jacuzzi.addendum}. Your home is now {inr(projection.agreedValue)}{" "}
                          before GST and handover is planned for {formatDate(projection.handoverAgreed)}.
                        </p>
                      }
                      holdTarget={jacuzzi.anchor}
                      scopeRef={scopeRef}
                      secondary={
                        <button type="button" className="btn btn-quiet">
                          Ask for changes
                        </button>
                      }
                    />
                  </div>
                )}
                {terrace && (
                  <div>
                    <p className="lettering mb-3">A drawing</p>
                    <ApproveControl
                      label={`Approve version ${terrace.latest.version}`}
                      confirmTitle={`Approve second floor and terrace plan, version ${terrace.latest.version}?`}
                      confirmBody="This is recorded with your name, the date and the time."
                      approved={terrace.status === "approved"}
                      onApprove={() => demo.decideDesign(terrace.design.id, "approved")}
                      receipt={
                        <p>
                          {signed}, version {terrace.latest.version}. Ananya Rao and the project team have been told.
                        </p>
                      }
                      holdTarget={terrace.design.anchor}
                      scopeRef={scopeRef}
                    />
                  </div>
                )}
                <Toggle onClick={resetDemo}>Start the demo again</Toggle>
              </div>

              <div ref={scopeRef}>
                <p className="lettering mb-3">What follows the hold</p>
                <div className="bg-paper p-4">
                  <House tone="light" />
                </div>
                <div className="mt-5 flex items-center gap-5">
                  <div className="flex gap-1" style={{ "--n": 5 } as CSSProperties}>
                    {[0, 1, 2, 3, 4].map((step) => (
                      <span key={step} className="block size-6 border border-ink">
                        <span
                          className="hold-step block size-full bg-laterite"
                          style={{ "--i": step } as CSSProperties}
                        />
                      </span>
                    ))}
                  </div>
                  <div className="relative h-12 flex-1 border-2 border-dashed border-brass">
                    <div className="hold-in absolute -inset-0.5 border-2 border-ink" />
                    <p className="lettering grid h-full place-items-center">Dashed until held</p>
                  </div>
                </div>
              </div>
            </div>
          </Block>

          <Block
            title="Seals and pegs"
            note="Brass is only ever her word. A seal is flat and agreed; a peg stands and is waiting."
          >
            <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
              {([16, 24, 40] as const).map((size) => (
                <figure key={size} className="text-center">
                  <Seal size={size} />
                  <figcaption className="lettering mt-2">Seal, {size}</figcaption>
                </figure>
              ))}
              <figure className="text-center">
                <Seal size={24} tone="line" />
                <figcaption className="lettering mt-2">Line, for the letter</figcaption>
              </figure>
              {([22, 28] as const).map((size) => (
                <figure key={size} className="text-center">
                  <Peg size={size} />
                  <figcaption className="lettering mt-2">Peg, {size}</figcaption>
                </figure>
              ))}
              <figure key={marks} className="text-center">
                <span className="inline-flex items-end gap-4">
                  <Seal size={40} press />
                  <Peg size={28} drop />
                </span>
                <figcaption className="lettering mt-2">Pressed and dropped</figcaption>
              </figure>
              <Toggle onClick={() => setMarks((n) => n + 1)}>Press and drop again</Toggle>
            </div>
            <div className="on-dark mt-6 flex flex-wrap items-end gap-10 bg-rosewood p-5 text-lime">
              <Seal size={16} />
              <Seal size={24} />
              <Seal size={40} />
              <Peg size={22} />
              <Peg size={28} />
              <p className="flex items-center gap-2">
                <Seal size={16} /> First floor plan, version 2. Approved on 2 Mar 2026.
              </p>
            </div>
          </Block>

          <Block
            title="Figures"
            note="A figure rolls to its new value, digit by digit, and is never counted up from zero."
          >
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <p className="figure text-32">
                  <RollingFigure value={FIGURES[figure]} />
                </p>
                <p className="figure mt-2 text-22">
                  <RollingFigure value={days} format="days" />
                </p>
                <p className="figure mt-2 text-22">
                  <RollingFigure value={FIGURES[figure]} format="plain" />
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Toggle onClick={() => setFigure((n) => (n + 1) % FIGURES.length)}>Next figure</Toggle>
                  <Toggle onClick={() => setDays((n) => (n === 12 ? 16 : n === 16 ? 1 : 12))}>
                    Next number of days
                  </Toggle>
                </div>
              </div>
              <div className="space-y-5">
                {(["lg", "md", "sm"] as const).map((size) => (
                  <div key={size}>
                    <p className="lettering">Live, {size}</p>
                    <StruckFigure
                      size={size}
                      agreed={projection.agreedValue}
                      tried={projection.tried.length > 0 ? projection.triedValue : null}
                      note={triedNote}
                    />
                  </div>
                ))}
                <div>
                  <p className="lettering">Always struck</p>
                  <StruckFigure size="sm" agreed={1027780} tried={1080880} note="with the jacuzzi, not approved" />
                </div>
                <div>
                  <p className="lettering">Days</p>
                  <StruckFigure
                    size="sm"
                    format="days"
                    agreed={0}
                    tried={projection.triedDays}
                    note="later, not approved"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {projection.pending.map((change) => (
                    <Toggle
                      key={change.id}
                      on={change.trying}
                      onClick={() => demo.setTrying(change.id, !change.trying)}
                    >
                      Try {change.short}
                    </Toggle>
                  ))}
                </div>
              </div>
            </div>
          </Block>

          <Block
            title="The day rule"
            note="The notch is the handover date as planned and never moves. The marker is where a trial would put it."
          >
            <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">
              {DAYS.map((count) => (
                <DayRule key={count} base="2027-09-30" days={count} />
              ))}
            </div>
            <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
              <div>
                <p className="lettering mb-2">Live, on paper</p>
                <DayRule base={projection.handoverAgreed} days={projection.triedDays} />
              </div>
              <div className="on-dark bg-rosewood p-4 text-lime">
                <p className="lettering mb-2">Live, on the table</p>
                <DayRule base={projection.handoverAgreed} days={projection.triedDays} />
              </div>
            </div>
          </Block>

          <Block title="The try switch" note="The whole row is the switch. On paper here; on the table further up.">
            <div className="max-w-xl">
              {projection.changes
                .filter((change) => change.lands.length > 0)
                .map((change) => (
                  <TrySwitch key={change.id} change={change} />
                ))}
            </div>
          </Block>
        </div>

        <Sheet
          title="A sheet on lime"
          intro="Sheets are full width, square and stacked like a drawing set, with an ink rule under the title."
        >
          <ul className="sheet-rows">
            <li>
              <Status tone="due">Waiting for you</Status> since 9 Nov 2026.
            </li>
            <li>
              <Status tone="done">Paid</Status> on 2 Jun 2026.
            </li>
            <li>
              <Status tone="quiet">Expected March 2027</Status>
            </li>
          </ul>
        </Sheet>
        <Sheet title="A sheet on sand" tone="sand" intro="The quiet ground for what is decided.">
          <ul className="sheet-rows">
            <li className="flex items-center gap-3">
              <Seal size={16} /> Front elevation, version 4. Approved on 20 Mar 2026.
            </li>
            <li className="flex items-center gap-3">
              <Seal size={16} /> Ground floor plan, version 3. Approved on 14 Feb 2026.
            </li>
          </ul>
        </Sheet>
        <Sheet title="A sheet on paper" tone="paper">
          <p className="max-w-[68ch]">
            Words that are not rows sit a little under the rule.{" "}
            <Status tone="alert">Enter a quantity greater than zero.</Status>
          </p>
        </Sheet>
      </div>

      <div className="bg-paper text-ink">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          <h2 className="display display-lg">The staff side</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            The instruments, the unit checks for the figures and registers, and buttons that run the two chains.
          </p>
          <ChecksBlock />
          <ChainsBlock />
          <InstrumentsBlock />
        </div>
      </div>

      <TrialStrip />
    </main>
  );
}

// ---- The staff side ----

/** The state every tab starts from, written out so the checks never read storage. */
const START: DemoState = {
  designDecisions: {},
  changeDecisions: {},
  paymentApproved: false,
  creditsRequested: false,
  trying: [],
  events: [],
  viewers: { architect: "vikram", site: "suresh", finance: "prakash" },
  lastRole: "admin",
  scope: {},
  clientProject: "iyer",
  focusRow: null,
  taught: { legend: false, hold: false },
  offline: false,
};

/** Appends events the way the store does, at fixed times, so the checks are pure. */
function simulate(state: DemoState, events: NewEvent[]): DemoState {
  let next = state;
  for (const event of events) {
    const at = `2026-11-11T10:${String(next.events.length).padStart(2, "0")}`;
    const full = { ...event, id: `e${next.events.length + 1}`, at } as FirmEvent;
    next = { ...next, events: [...next.events, full] };
    if (event.kind === "payment.approved" && event.projectId === "iyer" && event.n === 3) {
      next = { ...next, paymentApproved: true };
    }
  }
  return next;
}

const CEMENT_LINE = { material: "cement", sub: "OPC 53 grade", qty: 50, unit: "bags", outsideEstimate: false };

type Check = { label: string; got: string; want: string; note?: string };

/** The 3.7 starting figures and the 3.20 headline counts, and where the chains must end. */
function runChecks(): Check[] {
  const checks: Check[] = [];
  const add = (label: string, got: unknown, want: unknown, note?: string) =>
    checks.push({ label, got: JSON.stringify(got), want: JSON.stringify(want), note });

  const firm = deriveFirm(START);
  const table: [ProjectId, string[], string?][] = [
    ["iyer", ["₹87,10,000", "₹39,19,500 (45%)", "₹31,75,000", "₹7,44,500, 19%", "₹30,48,500", "₹30,20,000", "₹28,500"]],
    ["iyer-cottage", ["₹43,20,000", "in design", "₹85,000", "in design", "₹2,16,000", "₹85,000", "₹1,31,000"]],
    ["nair", ["₹1,00,80,000", "₹65,52,000 (65%)", "₹53,10,000", "₹12,42,000, 19%", "₹45,36,000", "₹52,00,000", "−₹6,64,000"]],
    ["dsouza", ["₹76,70,000", "₹15,34,000 (20%)", "₹13,05,000", "₹2,29,000, 15%", "₹15,34,000", "₹12,10,000", "₹3,24,000"]],
    [
      "bhat",
      ["₹70,20,000", "₹45,63,000 (65%)", "₹47,90,000", "−₹2,27,000, −5%", "₹43,76,000", "₹46,40,000", "−₹2,64,000"],
      "Received counts hours bought, as 3.7 defines it: the ₹15,000 of hours Bhat bought is in it, so the table's ₹43,61,000 and −₹2,79,000 are read as ₹43,76,000 and −₹2,64,000.",
    ],
    ["fernandes", ["₹79,30,000", "₹79,30,000 (100%)", "₹61,85,400", "₹17,44,600, 22%", "₹79,30,000", "₹61,85,400", "₹17,44,600"]],
    ["sharma", ["₹57,20,000", "in design", "₹0", "in design", "₹2,86,000", "₹0", "₹2,86,000"]],
  ];
  for (const [id, want, note] of table) {
    const p = firm.project(id);
    if (!p) continue;
    const designing = p.margin === null;
    add(
      `Starting figures, ${p.name}`,
      [
        inr(p.contractValue),
        designing ? "in design" : `${inr(p.workDone)} (${p.workDonePercent}%)`,
        inr(p.costs),
        designing ? "in design" : `${inrSigned(p.margin ?? 0)}, ${percent(p.marginPercent ?? 0)}`,
        inr(p.received),
        inr(p.spent),
        inrSigned(p.cash),
      ],
      want,
      note,
    );
  }

  const counts: [PersonId, ProjectId | "all", number][] = [
    ["suresh", "iyer", 3],
    ["manjunath", "iyer", 1],
    ["vikram", "all", 3],
    ["ananya", "all", 2],
    ["rohan", "all", 3],
    ["prakash", "all", 4],
    ["divya", "all", 5],
  ];
  for (const [person, scope, want] of counts) add(`Headline count, ${person}`, firm.turns(person, scope).length, want);
  add("Headline count, shalini (exceptions)", firm.exceptions.length, 5);

  const p0 = derive(START);
  add("Client: agreed value", inr(p0.agreedValue), "₹87,10,000");
  add("Client: milestone 3 with GST", inr(p0.milestones[3].agreedTotal), "₹10,27,780");
  add("Client: things waiting", p0.waiting.length, 5);

  // The payment chain, to the end.
  const paid = simulate(START, [
    { kind: "payment.approved", projectId: "iyer", n: 3, by: "meera" },
    {
      kind: "receipt.recorded",
      receipt: { id: "chk-1", projectId: "iyer", n: 3, amount: 850000, source: "bank", reference: "UTR ...5501", on: TODAY, by: "divya" },
      by: "divya",
    },
    {
      kind: "receipt.recorded",
      receipt: { id: "chk-2", projectId: "iyer", n: 3, amount: 177780, source: "client", reference: "UTR ...5502", on: TODAY, by: "divya" },
      by: "divya",
    },
  ]);
  const paidFirm = deriveFirm(paid);
  add("Payment chain: Meera's milestone 3", derive(paid).milestones[3].money, "paid");
  add("Payment chain: Shalini's strip cell 3", paidFirm.project("iyer")?.strip[3].state, "paid");
  add("Payment chain: Iyer cash", inrSigned(paidFirm.project("iyer")?.cash ?? 0), "₹8,99,500");

  // A second PO for the rest of MR-0136.
  const second = simulate(START, [
    {
      kind: "po.linked",
      po: {
        no: "PO-2026-0422",
        requestNo: "MR-2026-0136",
        projectId: "iyer",
        n: 4,
        vendorId: "v02",
        at: "2026-11-11T10:00",
        by: "prakash",
        lines: [{ lineId: "0136-1", qty: 350, rate: 69.5, gstPercent: 18 }],
        file: "PO-2026-0422.pdf (sample)",
      },
      by: "prakash",
    },
  ]);
  add("MR-2026-0136 after a second PO of 350 kg", deriveFirm(second).requests.find((r) => r.no === "MR-2026-0136")?.status, "PO uploaded");

  // The material chain.
  const no = firm.nextRequestNo;
  let m = simulate(START, [
    { kind: "request.raised", no, projectId: "iyer", n: 4, neededBy: "2026-11-14", lines: [{ id: "0142-1", ...CEMENT_LINE }], by: "suresh" },
    { kind: "request.seen", no, by: "prakash" },
  ]);
  const poNo = deriveFirm(m).nextPoNo;
  m = simulate(m, [
    {
      kind: "po.linked",
      po: { no: poNo, requestNo: no, projectId: "iyer", n: 4, vendorId: "v03", at: "2026-11-11T10:10", by: "prakash", lines: [{ lineId: "0142-1", qty: 50, rate: 390, gstPercent: 18 }], file: `${poNo}.pdf (sample)` },
      by: "prakash",
    },
  ]);
  add(`Material chain: ${no} after the PO`, deriveFirm(m).requests.find((r) => r.no === no)?.status, "PO uploaded");
  m = simulate(m, [{ kind: "request.delivered", no, by: "suresh" }]);
  add(`Material chain: ${no} at the end`, deriveFirm(m).requests.find((r) => r.no === no)?.status, "Delivered");

  // The Nair chain.
  let n = simulate(START, [{ kind: "stage.done", projectId: "nair", n: 6, note: "Tiling finished.", photos: ["tiles", "tiles"], by: "suresh" }]);
  n = simulate(n, [{ kind: "payment.raised", projectId: "nair", n: 6, letterNo: deriveFirm(n).nextLetterNo, by: "vikram" }]);
  add("Nair chain: cell 6", deriveFirm(n).project("nair")?.strip[6].state, "raised");

  return checks;
}

export function ChecksBlock() {
  // Worked out once: the checks read no state, only the seed and their own events.
  const [checks] = useState(runChecks);
  const differ = checks.filter((check) => check.got !== check.want);
  return (
    <Block
      title="Unit checks"
      note={`${checks.length} checks of the starting figures, the headline counts and the chains. ${differ.length === 0 ? "All match." : `${differ.length} differ.`}`}
    >
      <ul className="grid gap-2">
        {checks.map((check) => {
          const ok = check.got === check.want;
          return (
            <li key={check.label} className="grid gap-x-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <span className={`lettering ${ok ? "text-kota" : "font-bold text-brick"}`}>{ok ? "Matches" : "Differs"}</span>
              <span className="min-w-0 break-words text-15">
                {check.label}: {check.got}
                {!ok && <span className="block text-ink-soft">Expected {check.want}. {check.note}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </Block>
  );
}

/** Buttons that append the chain events to the gallery's own state, one step at a time. */
export function ChainsBlock() {
  const demo = useDemo();
  const firm = useFirm();
  const projection = useProjection();

  // The material chain follows the newest request Suresh raised here.
  const raised = [...demo.events].reverse().find((e) => e.kind === "request.raised" && e.by === "suresh");
  const no = raised && raised.kind === "request.raised" ? raised.no : null;
  const request = no ? firm.requests.find((r) => r.no === no) : undefined;
  const line = request?.lines[0];
  const item = line ? firm.catalogue.find((c) => c.id === line.material) : undefined;

  const iyer = firm.project("iyer");
  const m3 = iyer?.milestones.find((x) => x.n === 3);
  const nair = firm.project("nair");
  const n6 = nair?.milestones.find((x) => x.n === 6);
  const receipts = demo.events.filter((e) => e.kind === "receipt.recorded").length;

  return (
    <Block title="The chains" note="Each button appends one event to this gallery's own state, as the person named would.">
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-3">
          <p className="lettering">Material chain</p>
          <div className="flex flex-wrap gap-2">
            <Toggle
              onClick={() =>
                demo.record({
                  kind: "request.raised",
                  no: firm.nextRequestNo,
                  projectId: "iyer",
                  n: 4,
                  neededBy: "2026-11-14",
                  lines: [{ id: `${firm.nextRequestNo.slice(-4)}-1`, ...CEMENT_LINE }],
                  by: "suresh",
                })
              }
            >
              Suresh sends 50 bags
            </Toggle>
            {request && request.status === "New" && (
              <Toggle onClick={() => demo.record({ kind: "request.seen", no: request.no, by: "prakash" })}>Prakash marks it seen</Toggle>
            )}
            {request && line && request.status === "Seen" && (
              <Toggle
                onClick={() =>
                  demo.record({
                    kind: "po.linked",
                    po: {
                      no: firm.nextPoNo,
                      requestNo: request.no,
                      projectId: "iyer",
                      n: 4,
                      vendorId: "v03",
                      at: stampNow(),
                      by: "prakash",
                      lines: [{ lineId: line.id, qty: line.qty, rate: 390, gstPercent: 18 }],
                      file: `${firm.nextPoNo}.pdf (sample)`,
                    },
                    by: "prakash",
                  })
                }
              >
                Prakash links the PO
              </Toggle>
            )}
            {request && request.status === "PO uploaded" && (
              <Toggle onClick={() => demo.record({ kind: "request.delivered", no: request.no, by: "suresh" })}>
                Suresh marks it delivered
              </Toggle>
            )}
          </div>
          {request && line && item ? (
            <div className="space-y-3">
              <p className="text-15">
                {request.no}: {request.status}.
              </p>
              <RequestLadder status={request.status} stamps={firm.stampsFor(`mr:${request.no}`)} late={request.late} />
              <MaterialStack
                item={item}
                requested={line.qty}
                ordered={request.pos.map((po) => po.lines.find((l) => l.lineId === line.id)?.qty ?? 0)}
                delivered={request.status === "Delivered"}
              />
            </div>
          ) : (
            <p className="text-15 text-ink-soft">No request sent here yet.</p>
          )}
        </div>

        <div className="space-y-3">
          <p className="lettering">Payment chain, Iyer milestone 3</p>
          <div className="flex flex-wrap gap-2">
            {!demo.paymentApproved && <Toggle onClick={() => demo.approvePayment()}>Meera approves</Toggle>}
            {demo.paymentApproved && m3 && m3.received < m3.total && (
              <Toggle
                onClick={() =>
                  demo.record({
                    kind: "receipt.recorded",
                    receipt: {
                      id: `r-gallery-${receipts + 1}`,
                      projectId: "iyer",
                      n: 3,
                      amount: m3.received === 0 ? 850000 : m3.total - m3.received,
                      source: m3.received === 0 ? "bank" : "client",
                      reference: `UTR ...55${receipts + 1}`,
                      on: TODAY,
                      by: "divya",
                    },
                    by: "divya",
                  })
                }
              >
                {m3.received === 0 ? "Divya records the bank's part" : "Divya records Meera's part"}
              </Toggle>
            )}
          </div>
          {iyer && m3 && (
            <div className="space-y-3">
              <ProgrammeStrip cells={iyer.strip} size={264} />
              <p className="text-15">
                Staff: milestone 3 is {m3.state}, {inr(m3.received)} of {inr(m3.total)} received. Iyer cash is{" "}
                {inrSigned(iyer.cash)}. Meera sees {projection.milestones[3].money}.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="lettering">Nair chain, milestone 6</p>
          <div className="flex flex-wrap gap-2">
            {n6 && !n6.doneOn && n6.state !== "raised" && (
              <Toggle
                onClick={() =>
                  demo.record({
                    kind: "stage.done",
                    projectId: "nair",
                    n: 6,
                    note: "Flooring and tiling finished, pool deck included.",
                    photos: ["tiles", "tiles"],
                    by: "suresh",
                  })
                }
              >
                Suresh marks the stage done
              </Toggle>
            )}
            {n6 && n6.state === "done" && (
              <Toggle
                onClick={() => demo.record({ kind: "payment.raised", projectId: "nair", n: 6, letterNo: firm.nextLetterNo, by: "vikram" })}
              >
                Vikram raises the payment
              </Toggle>
            )}
          </div>
          {nair && n6 && (
            <div className="space-y-3">
              <ProgrammeStrip cells={nair.strip} size={264} />
              <p className="text-15">
                Cell 6: {nair.strip.find((c) => c.n === 6)?.words}. Vikram has {firm.turns("vikram", "all").length} in his turn.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-6">
        <Toggle onClick={resetDemo}>Start the gallery again</Toggle>
      </div>
    </Block>
  );
}

const PHOTOS: PhotoKind[] = ["slab-pour", "shuttering", "curing", "columns", "blocks", "tiles", "steel", "sand"];

function item(id: string): CatalogueItem {
  return firmCatalogue.find((c) => c.id === id) ?? firmCatalogue[0];
}

/** Every instrument the staff screens draw, in its states. */
export function InstrumentsBlock() {
  const firm = useFirm();
  const iyer = firm.project("iyer");
  const nair = firm.project("nair");
  const r136 = firm.requests.find((r) => r.no === "MR-2026-0136");
  const credits = firm.credits.find((c) => c.projectId === "iyer");
  const pool = credits ? credits[credits.current] : null;

  return (
    <>
      <Block title="Programme strips" note="40, 120 and 264 wide, on paper and on the board.">
        <div className="grid gap-6">
          {iyer && nair && (
            <>
              <div className="flex flex-wrap items-end gap-8">
                <ProgrammeStrip cells={iyer.strip} size={40} />
                <ProgrammeStrip cells={iyer.strip} size={120} />
                <ProgrammeStrip cells={iyer.strip} size={264} />
              </div>
              <div className="on-dark flex flex-wrap items-end gap-8 bg-rosewood p-5 text-lime">
                <ProgrammeStrip cells={nair.strip} size={40} tone="dark" />
                <ProgrammeStrip cells={nair.strip} size={120} tone="dark" />
                <ProgrammeStrip cells={nair.strip} size={264} tone="dark" />
              </div>
            </>
          )}
          <ul className="grid gap-2 text-15">
            {firm.projects.map((p) => (
              <li key={p.id} className="grid items-center gap-x-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                <ProgrammeStrip cells={p.strip} size={120} />
                <span>
                  {p.name}: {p.stageWords}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Block>

      <Block title="Material stacks" note="Ordered fills the outline; two orders are two fills; past the usual size draws a dashed line.">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {r136 && (
            <MaterialStack
              item={item(r136.lines[0].material)}
              requested={r136.lines[0].qty}
              ordered={r136.pos.map((po) => po.lines.find((l) => l.lineId === r136.lines[0].id)?.qty ?? 0)}
              delivered={false}
            />
          )}
          <MaterialStack item={item("steel")} requested={850} ordered={[500, 350]} delivered />
          <MaterialStack item={item("cement")} requested={250} ordered={0} delivered={false} />
          <MaterialStack item={item("blocks")} requested={6000} ordered={3000} delivered={false} />
          <MaterialStack item={item("conduit")} requested={900} ordered={0} delivered={false} words="beside" />
          <div className="on-dark bg-rosewood p-4 text-lime">
            <MaterialStack item={item("cement")} requested={50} ordered={50} delivered={false} tone="dark" />
          </div>
        </div>
      </Block>

      <Block title="Request ladders">
        <div className="grid gap-8 md:grid-cols-2">
          {firm.requests.slice(0, 4).map((r) => (
            <div key={r.no}>
              <p className="lettering mb-2">{r.no}</p>
              <RequestLadder status={r.status} stamps={firm.stampsFor(`mr:${r.no}`)} late={r.late} />
            </div>
          ))}
        </div>
      </Block>

      <Block title="Teak cuts" note="Consultation hours: what is left, what this would use, and past the end.">
        <div className="grid gap-8 md:grid-cols-2">
          {pool && (
            <TeakCut
              granted={pool.granted}
              used={pool.used}
              adding={1.5}
              label={teakWords({ left: pool.granted - pool.used, adding: 1.5, name: "Meera's", pronoun: "her" })}
            />
          )}
          {pool && (
            <TeakCut
              granted={pool.granted}
              used={pool.used}
              adding={4}
              label={teakWords({ left: pool.granted - pool.used, adding: 4, name: "Meera's", pronoun: "her" })}
            />
          )}
          <TeakCut granted={13} used={6} added={5} label="Five hours bought and joined on at the end." />
          <div className="on-dark bg-rosewood p-4 text-lime">
            <TeakCut granted={8} used={7.5} tone="dark" label="Half an hour left." />
          </div>
        </div>
      </Block>

      <Block title="Setting-out plots">
        <div className="flex flex-wrap items-end gap-8">
          {([0, 1, 2, 3, 4] as const).map((pegs) => (
            <PlotOutline key={pegs} pegs={pegs} words={`${pegs} of 4 steps done`} />
          ))}
          <PlotOutline pegs={4} sealed words="Approved by the client" />
          <div className="on-dark bg-rosewood p-4 text-lime">
            <PlotOutline pegs={3} tone="dark" size={280} words="On the board" />
          </div>
        </div>
      </Block>

      <Block title="Task courses">
        <div className="grid gap-8 md:grid-cols-2">
          {(["ananya", "karan"] as const).map((person) => {
            const blocks = courses[person] ?? [];
            const tasks = blocks.map((b) => ({ title: b.title, late: b.lateDays, revisions: b.revisions }));
            return (
              <div key={person}>
                <TaskCourse tasks={tasks} label={`${firm.person(person)?.name}, last 30 days`} />
                <p className="lettering mt-2">{courseWords(tasks)}</p>
              </div>
            );
          })}
        </div>
      </Block>

      <Block title="Project marks">
        <div className="flex flex-wrap items-end gap-8">
          {firm.projects.map((p) => (
            <figure key={p.id} className="text-center">
              <ProjectMark projectId={p.id} {...markOf(p.category, p.milestones)} title={p.name} />
              <figcaption className="lettering mt-1">{p.name}</figcaption>
            </figure>
          ))}
        </div>
      </Block>

      <Block title="Glyphs and sample photos" note="Brass on a staff screen is only ever the client's word.">
        <div className="flex flex-wrap items-center gap-6">
          <PegGlyph size={12} />
          <PegGlyph size={16} />
          <SealGlyph size={12} />
          <SealGlyph size={16} />
          <SealGlyph size={24} />
          <SealGlyph size={24} tone="line" />
        </div>
        <div className="mt-6 flex flex-wrap gap-4">
          {PHOTOS.map((kind, i) => (
            <SamplePhoto key={kind} kind={kind} size="md" tag={i === 0} />
          ))}
        </div>
      </Block>
    </>
  );
}
