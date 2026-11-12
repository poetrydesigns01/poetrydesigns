"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { MaterialStack } from "@/components/instruments/material-stack";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { EmailPreview } from "@/components/register/email-preview";
import { useScope } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { SampleTag } from "@/components/register/sample-tag";
import { StaffBoard } from "@/components/register/staff-board";
import { ChalkTick, drawTick } from "@/components/staff/chalk-tick";
import { StoreyPicker } from "@/components/staff/storey-picker";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm, useViewer } from "@/lib/demo-store";
import type { RequestView } from "@/lib/firm";
import type { CatalogueItem, ProjectId, RequestLine } from "@/lib/firm-data";
import { addDays, datePart, formatShortDate, listWords, shortWeekdayDate } from "@/lib/format";
import { isKeyboardClick, usePrefersReducedMotion } from "@/lib/motion";
import {
  PRESETS,
  STEP,
  howManyWords,
  linePhrase,
  nextRequestNo,
  nounOf,
  sitesFor,
  stageShort,
  stageWords,
  underWay,
  upperFirst,
} from "./site-words";
import "./site.css";

// The most used screen on site: a material request on a phone, often one-handed. Every
// choice is a 56 px chip, the usual grade is already chosen, and the site and its stage
// under way are filled in. One sentence reads the request back as it is built. Sending
// waits five seconds like every other write; with no signal it is kept on the phone and
// goes by itself when the signal is back.

type Line = Omit<RequestLine, "id">;

const NEEDED = [1, 3, 7].map((days) => addDays(TODAY, days));
const DEFAULT_NEEDED = NEEDED[1];

/** The read-back: what will be sent, for which stage and site, and by when. */
function readBack({
  lines,
  draftItem,
  draftSub,
  where,
  neededBy,
  catalogue,
}: {
  lines: Line[];
  draftItem: CatalogueItem | undefined;
  draftSub: string;
  where: string;
  neededBy: string;
  catalogue: CatalogueItem[];
}): string {
  const itemOf = (id: string) => catalogue.find((c) => c.id === id);
  const phrases = lines.flatMap((l) => {
    const item = itemOf(l.material);
    return item ? [linePhrase(item, l.sub, l.qty)] : [];
  });
  const tail = `${where}, on site by ${formatShortDate(neededBy)}`;
  const outside = lines.filter((l) => l.outsideEstimate);
  const outsideNames = outside.map((l) => {
    const item = itemOf(l.material);
    return `${l.sub} ${item ? nounOf(item) : l.material}`;
  });
  const outsideWords =
    outside.length === 0
      ? ""
      : ` ${upperFirst(listWords(outsideNames))} ${outside.length === 1 && !/s$/.test(outsideNames[0]) ? "is" : "are"} marked as not in the agreed estimate.`;

  if (phrases.length === 0 && !draftItem) return `Choose a material. This request is ${tail}.`;
  if (phrases.length === 0 && draftItem) {
    return `${upperFirst(nounOf(draftItem))}, ${draftSub}, ${tail}. Choose how many ${howManyWords(draftItem)}.`;
  }
  const said = `${upperFirst(listWords(phrases))}, ${tail}.${outsideWords}`;
  return draftItem ? `${said} Choose how many ${howManyWords(draftItem)} of ${nounOf(draftItem)}.` : said;
}

/** The one material line being built: material, grade, quantity and the estimate tick. */
function LineBuilder({
  catalogue,
  material,
  sub,
  qty,
  qtyText,
  outside,
  outsideNote,
  head,
  onMaterial,
  onSub,
  onQty,
  onOutside,
  onOutsideNote,
}: {
  catalogue: CatalogueItem[];
  material: string | null;
  sub: string;
  qty: number | null;
  qtyText: string;
  outside: boolean;
  outsideNote: string;
  head: string;
  onMaterial: (id: string) => void;
  onSub: (sub: string) => void;
  onQty: (qty: number | null, text: string) => void;
  onOutside: (on: boolean) => void;
  onOutsideNote: (note: string) => void;
}) {
  const ids = useId();
  const item = catalogue.find((c) => c.id === material);

  return (
    <div className="grid gap-6">
      <ChipGroup label="Material" columns={2} className="sm:max-w-[36rem]">
        {catalogue.map((c) => (
          <Chip key={c.id} size="site" pressed={material === c.id} onClick={() => onMaterial(c.id)}>
            {c.name}
          </Chip>
        ))}
      </ChipGroup>

      {item && (
        <>
          <ChipGroup label={item.subs.length > 1 ? "Grade or size" : "Grade"} columns={item.subs.length > 2 ? 3 : 2} className="sm:max-w-[36rem]">
            {item.subs.map((s) => (
              <Chip
                key={s}
                size="site"
                pressed={sub === s}
                onClick={() => onSub(s)}
                detail={s === item.usual && item.subs.length > 1 ? "The usual one" : undefined}
              >
                {s}
              </Chip>
            ))}
          </ChipGroup>

          <div className="grid gap-3">
            <ChipGroup label={`How many ${howManyWords(item)}`} columns={2} className="sm:max-w-[28rem]">
              {PRESETS[item.unit].map((preset) => (
                <Chip
                  key={preset}
                  size="site"
                  pressed={qty === preset}
                  onClick={() => onQty(preset, String(preset))}
                >
                  {item.unit === "nos" ? preset.toLocaleString("en-IN") : `${preset.toLocaleString("en-IN")} ${item.unit}`}
                </Chip>
              ))}
            </ChipGroup>
            <div className="flex items-stretch gap-2 sm:max-w-[28rem]">
              <button
                type="button"
                className="btn btn-quiet min-w-14 px-0 text-22"
                aria-label={`${STEP[item.unit]} fewer`}
                onClick={() => {
                  const next = Math.max(0, (qty ?? 0) - STEP[item.unit]);
                  onQty(next > 0 ? next : null, next > 0 ? String(next) : "");
                }}
              >
                −
              </button>
              <label htmlFor={`${ids}-qty`} className="sr-only">
                Quantity in {howManyWords(item)}
              </label>
              <input
                id={`${ids}-qty`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={qtyText}
                placeholder="Or type it"
                onChange={(event) => {
                  const value = Number(event.target.value);
                  onQty(event.target.value && Number.isFinite(value) && value > 0 ? value : null, event.target.value);
                }}
                className={`${field} min-w-0 flex-1 text-center`}
              />
              <button
                type="button"
                className="btn btn-quiet min-w-14 px-0 text-22"
                aria-label={`${STEP[item.unit]} more`}
                onClick={() => {
                  const next = (qty ?? 0) + STEP[item.unit];
                  onQty(next, String(next));
                }}
              >
                +
              </button>
            </div>
            {qty !== null && qty > 0 && (
              <MaterialStack item={item} requested={qty} ordered={0} delivered={false} width={160} words="beside" />
            )}
          </div>

          <div className="grid gap-2">
            <label className="flex min-h-14 cursor-pointer items-center gap-3 text-17">
              <input
                type="checkbox"
                className="size-6 shrink-0 accent-rosewood"
                checked={outside}
                onChange={(event) => onOutside(event.target.checked)}
              />
              Not in the agreed estimate
            </label>
            {outside && (
              <>
                <p className="text-17 text-ink-soft">{head} will be asked to raise a cost revision.</p>
                <div>
                  <label htmlFor={`${ids}-why`} className="block text-17 font-semibold">
                    What is it for?
                  </label>
                  <input
                    id={`${ids}-why`}
                    type="text"
                    value={outsideNote}
                    placeholder="For the pool deck"
                    onChange={(event) => onOutsideNote(event.target.value)}
                    className={`${field} mt-1.5`}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** A request sent today: its number, what it holds, and the copy procurement was sent. The row opens its report. */
function SentRow({ request, tickRef }: { request: RequestView; tickRef?: (el: HTMLSpanElement | null) => void }) {
  const firm = useFirm();
  const project = firm.project(request.projectId);
  const first = request.lines[0];
  const item = firm.catalogueAll.find((c) => c.id === first.material);
  const more = request.lines.length - 1;
  return (
    <RegisterRow
      id={`mr:${request.no}`}
      margin={request.queued ? "Waiting to send" : "Today"}
      title={`${request.no}, ${item ? `${nounOf(item)} ${first.sub}` : first.material}, ${first.qty.toLocaleString("en-IN")} ${
        first.unit
      }${more > 0 ? ` and ${more} more` : ""}${project && project.category !== "farmhouse" ? `, ${stageShort(project, request.n)}` : ""}`}
      sentence={
        request.queued ? (
          "No signal. Saved on this phone. It sends by itself when you are back online."
        ) : (
          <span className="inline-flex items-center gap-2">
            <span ref={tickRef} className="text-kota">
              <ChalkTick className="size-5 shrink-0" />
            </span>
            {request.status === "Delivered"
              ? "Delivered."
              : `${request.status === "PO uploaded" ? "Ordered" : "With procurement"}, needed on site by ${formatShortDate(request.neededBy)}.`}
          </span>
        )
      }
      href={`/staff/site/requests/${request.no}`}
      stamps={firm.stampsFor(`mr:${request.no}`)}
    />
  );
}

export function RequestForm() {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const me = useViewer("site");
  const scope = useScope("site");
  const reduced = usePrefersReducedMotion();
  const ids = useId();

  const sites = sitesFor(firm, me.id);
  // Null means "as it stands": the site in view and the stage under way there.
  const [chosenProject, setChosenProject] = useState<ProjectId | null>(null);
  const [chosenStage, setChosenStage] = useState<number | null>(null);
  const [material, setMaterial] = useState<string | null>(null);
  const [chosenSub, setChosenSub] = useState<string | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [qtyText, setQtyText] = useState("");
  const [outside, setOutside] = useState(false);
  const [outsideNote, setOutsideNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [neededBy, setNeededBy] = useState(DEFAULT_NEEDED);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const [justSent, setJustSent] = useState<{ no: string; keyboard: boolean; focus: boolean } | null>(null);
  const tick = useRef<HTMLSpanElement | null>(null);
  const sentRef = useRef<HTMLDivElement>(null);
  // The request whose tick has been drawn. The screen stays mounted while hidden and runs
  // its effects again when it is shown, so this keeps the tick to one drawing per send.
  const drawn = useRef<string | null>(null);

  const project =
    sites.find((p) => p.id === chosenProject) ?? sites.find((p) => p.id === scope) ?? sites[0] ?? firm.project("iyer");
  const n = chosenStage ?? (project ? (underWay(project)?.n ?? 1) : 1);
  const item = firm.catalogue.find((c) => c.id === material);
  const sub = item ? (chosenSub && item.subs.includes(chosenSub) ? chosenSub : (item.usual ?? item.subs[0])) : "";
  const draft: Line | null =
    item && qty !== null && qty > 0
      ? {
          material: item.id,
          sub,
          qty,
          unit: item.unit,
          outsideEstimate: outside,
          note: outside && outsideNote.trim() ? outsideNote.trim() : undefined,
        }
      : null;
  const items = draft ? [...lines, draft] : lines;
  const head = project ? (firm.person(project.team.head)?.name ?? "The Project Head") : "The Project Head";
  // A request is emailed to procurement for that site: Imran for Nair Farmhouse, Prakash elsewhere.
  const procurement = (project?.id === "nair" ? ["imran" as const] : ["prakash" as const]).flatMap((id) => {
    const person = firm.person(id);
    return person ? [person] : [];
  });

  const last = project
    ? firm.requests
        .filter((r) => r.by === me.id && r.projectId === project.id && !r.queued)
        .sort((a, b) => b.at.localeCompare(a.at) || b.no.localeCompare(a.no))[0]
    : undefined;
  const sentToday = firm.requests
    .filter((r) => r.by === me.id && datePart(r.at) === TODAY)
    .sort((a, b) => b.at.localeCompare(a.at) || b.no.localeCompare(a.no));

  // Once, after the sent row is drawn: the chalk tick for a pointer, and focus to the new row
  // when the send bar had it (the bar has no button again until something is chosen).
  useEffect(() => {
    if (!justSent || drawn.current === justSent.no) return;
    drawn.current = justSent.no;
    if (!justSent.keyboard && !reduced) drawTick(tick.current);
    if (justSent.focus) {
      const row = sentRef.current?.querySelector<HTMLElement>(`a[href$="/${justSent.no}"]`);
      (row ?? sentRef.current)?.focus({ preventScroll: true });
    }
  }, [justSent, reduced]);

  const where = project ? `for ${stageWords(project, n)} at ${project.name}` : "";
  const sentence = project
    ? readBack({ lines: items, draftItem: draft ? undefined : item, draftSub: sub, where, neededBy, catalogue: firm.catalogue })
    : "";

  const clearDraft = () => {
    setMaterial(null);
    setChosenSub(null);
    setQty(null);
    setQtyText("");
    setOutside(false);
    setOutsideNote("");
  };

  const addAnother = () => {
    if (!draft) {
      setError(item ? `Choose how many ${howManyWords(item)} first.` : "Choose a material and a quantity first.");
      return;
    }
    setError("");
    setLines((current) => [...current, draft]);
    clearDraft();
  };

  const send = (event: MouseEvent<HTMLButtonElement>) => {
    if (pause.pending !== null || items.length === 0 || !project) return;
    const keyboard = isKeyboardClick(event);
    const sending = items;
    const target = { projectId: project.id, n, neededBy };
    const { record } = demo;
    const bar = event.currentTarget;
    setError("");
    pause.start({
      verb: "Sending",
      what: `Your request for ${project.name}`,
      origin: event.currentTarget,
      commit: () => {
        const focus = document.activeElement === bar;
        const now = getDemoSnapshot();
        const no = nextRequestNo(now.events);
        record({
          kind: "request.raised",
          no,
          ...target,
          lines: sending.map((l, i) => ({ ...l, id: `${no.slice(-4)}-${i + 1}` })),
          queued: now.offline ? true : undefined,
          by: me.id,
        });
        // The draft is cleared once it is recorded: Cancel keeps it to put right.
        setLines([]);
        clearDraft();
        setNeededBy(DEFAULT_NEEDED);
        setPicking(false);
        setJustSent({ no, keyboard, focus });
      },
    });
  };

  const sendLabel = `Send ${items.length} ${items.length === 1 ? "item" : "items"}`;
  const toChoose = item ? `Choose how many ${howManyWords(item)} to send.` : "Choose a material and a quantity to send.";

  return (
    <div className="site-screen">
      <StaffBoard place="Request" headline="New material request" chip={false} />

      <div className="staff-columns">
        <div className="grid content-start gap-8">
          {project && (
            <StoreyPicker
              sites={sites}
              projectId={project.id}
              n={n}
              onProject={(id) => {
                setChosenProject(id);
                setChosenStage(null);
              }}
              onMilestone={setChosenStage}
            >
              <p role="status" className="max-w-[65ch] text-17 font-semibold leading-snug">
                {sentence}
              </p>
            </StoreyPicker>
          )}

          {last && lines.length === 0 && !item && (
            <section aria-labelledby={`${ids}-last`} className="grid gap-3 bg-sand-2 p-4">
              <h2 id={`${ids}-last`} className="text-17 font-semibold">
                Same as last request
              </h2>
              <p className="max-w-[65ch] text-17">
                {last.no}, sent {formatShortDate(datePart(last.at))}.{" "}
                {upperFirst(
                  listWords(
                    last.lines.map((l) => {
                      const c = firm.catalogue.find((x) => x.id === l.material);
                      return c ? linePhrase(c, l.sub, l.qty) : `${l.qty} ${l.unit} of ${l.material}`;
                    }),
                  ),
                )}
                .
              </p>
              <div>
                <button
                  type="button"
                  className="btn w-full bg-paper hover:bg-lime sm:w-auto"
                  onClick={() => {
                    setLines(last.lines.map((l) => ({ material: l.material, sub: l.sub, qty: l.qty, unit: l.unit, outsideEstimate: false })));
                    clearDraft();
                    setError("");
                  }}
                >
                  Send again
                </button>
              </div>
            </section>
          )}

          {lines.length > 0 && (
            <section aria-labelledby={`${ids}-lines`} className="grid gap-2">
              <h2 id={`${ids}-lines`} className="text-17 font-semibold">
                In this request
              </h2>
              <ul className="grid gap-2">
                {lines.map((l, i) => {
                  const c = firm.catalogue.find((x) => x.id === l.material);
                  return (
                    <li key={`${l.material}-${l.sub}-${i}`} className="flex items-center justify-between gap-3 bg-sand-2 pl-4">
                      <span className="min-w-0 py-2 text-17">
                        {c ? upperFirst(linePhrase(c, l.sub, l.qty)) : l.material}
                        {l.outsideEstimate && <span className="block font-semibold">Not in the agreed estimate</span>}
                      </span>
                      <button
                        type="button"
                        className="btn btn-quiet shrink-0 bg-transparent"
                        aria-label={`Remove ${c ? nounOf(c) : l.material}, ${l.sub}`}
                        onClick={() => setLines((current) => current.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <LineBuilder
            catalogue={firm.catalogue}
            material={material}
            sub={sub}
            qty={qty}
            qtyText={qtyText}
            outside={outside}
            outsideNote={outsideNote}
            head={head}
            onMaterial={(id) => {
              if (id !== material) {
                setMaterial(id);
                setChosenSub(null);
                setQty(null);
                setQtyText("");
                setOutside(false);
                setOutsideNote("");
              }
              setError("");
            }}
            onSub={setChosenSub}
            onQty={(value, text) => {
              setQty(value);
              setQtyText(text);
              setError("");
            }}
            onOutside={setOutside}
            onOutsideNote={setOutsideNote}
          />

          {item && (
            <div className="grid gap-2">
              <div>
                <button type="button" className="btn btn-quiet w-full sm:w-auto" onClick={addAnother}>
                  Add another material
                </button>
              </div>
              {error && (
                <p className="text-17 font-semibold text-brick" role="alert">
                  {error}
                </p>
              )}
            </div>
          )}

          <ChipGroup label="Needed on site by" columns={2} className="sm:max-w-[28rem]">
            {NEEDED.map((day, i) => (
              <Chip
                key={day}
                size="site"
                pressed={!picking && neededBy === day}
                onClick={() => {
                  setPicking(false);
                  setNeededBy(day);
                }}
              >
                {i === 0 ? `Tomorrow, ${shortWeekdayDate(day)}` : shortWeekdayDate(day)}
              </Chip>
            ))}
            <Chip size="site" pressed={picking || !NEEDED.includes(neededBy)} onClick={() => setPicking(true)}>
              Another day
            </Chip>
          </ChipGroup>
          {(picking || !NEEDED.includes(neededBy)) && (
            <div className="sm:max-w-[28rem]">
              <label htmlFor={`${ids}-date`} className="block text-17 font-semibold">
                The day it is needed
              </label>
              <input
                id={`${ids}-date`}
                type="date"
                min={TODAY}
                value={neededBy}
                onChange={(event) => {
                  if (event.target.value) setNeededBy(event.target.value);
                }}
                className={`${field} mt-1.5`}
              />
            </div>
          )}

          {items.length > 0 && (
            <div className="grid gap-1">
              <p className="max-w-[65ch] text-17">
                {listWords(procurement.map((p) => p.name))} will be emailed the project, the material and the quantity.
              </p>
              <EmailPreview
                to={procurement.map((p) => p.email).join(", ")}
                subject={`Material request for ${project?.name ?? "site"}`}
                body={[sentence, `Raised by ${me.name}, ${me.phone}.`, "The material requirement report is attached."]}
              />
            </div>
          )}

          {/* Until something is chosen the bar is a plain sentence in full ink, readable in sun. */}
          <div className="site-send-bar">
            {items.length === 0 ? (
              <p className="flex items-center bg-sand-2 px-4 text-17 font-semibold text-ink">{toChoose}</p>
            ) : (
              <button
                type="button"
                onClick={send}
                aria-disabled={pause.pending !== null ? true : undefined}
                className="btn btn-primary"
              >
                {sendLabel}
              </button>
            )}
          </div>
        </div>

        <div ref={sentRef} tabIndex={-1} className="grid content-start gap-8 outline-none">
          <Register title="Sent today" empty="Nothing sent yet today.">
            {sentToday.map((r) => (
              <SentRow
                key={r.no}
                request={r}
                tickRef={
                  justSent?.no === r.no
                    ? (el) => {
                        tick.current = el;
                      }
                    : undefined
                }
              />
            ))}
          </Register>

          <div className="grid gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={demo.offline}
              onClick={() => demo.setOffline(!demo.offline)}
              className="chip chip-site w-full justify-between sm:w-auto"
            >
              <span>
                Pretend there is no signal <SampleTag>Demo</SampleTag>
              </span>
              <span aria-hidden="true">{demo.offline ? "On" : "Off"}</span>
            </button>
            <p className="max-w-[65ch] text-17 text-ink-soft">
              {demo.offline
                ? "Requests are kept on this phone until the signal is back. Turn this off to send them."
                : "Shows what happens when you send a request with no signal."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
