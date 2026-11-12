"use client";

import { usePathname } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { SamplePhoto } from "@/components/instruments/sample-photo";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { DropZone } from "@/components/register/drop-zone";
import { EmailPreview } from "@/components/register/email-preview";
import { Field } from "@/components/register/field";
import { viewerIdOf } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { SampleTag } from "@/components/register/sample-tag";
import { useStaffRole } from "@/components/register/staff-shell";
import { TODAY, withGst } from "@/lib/demo-data";
import { useDemo, useFirm, useProjection } from "@/lib/demo-store";
import { ageWords, daysSince, OVERDUE_AFTER_DAYS, type MilestoneView, type ProjectView, type RequestView, type StampView } from "@/lib/firm";
import {
  registerNotes,
  revisionToRaise,
  SPLIT_REASON,
  type PersonId,
  type ProjectId,
  type RequestLine,
} from "@/lib/firm-data";
import { addDays, datePart, dayCount, formatDate, formatShortDate, formatStamp, inr, listWords } from "@/lib/format";
import { newestFirst } from "./common";
import { SawnCell, splitWords } from "./sawn-cell";

// The programme of one project: a row per milestone, and the cost revisions. Every staff
// role can read it. The Project Head of the project, and admin, can raise the payment for a
// stage the site has marked done, move a milestone's date, propose splitting it into two
// payments for the client to approve, and raise a cost revision from a line the site
// flagged as outside the estimate. Each waits five seconds, then stamps its row.

type PanelKind = "raise" | "revise" | "revision";
type Panel = { rowId: string; kind: PanelKind };

function lowerFirst(text: string): string {
  // "PDF drawing" and "CR-2026-007" keep their capitals.
  if (/^[A-Z]{2}/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function pathOf(href: string): string {
  return href.split(/[?#]/)[0];
}

/** The client as named on staff screens: "Meera Iyer", "Anil Nair and Priya Nair". */
function clientNames(p: ProjectView): string {
  return p.id === "iyer" || p.id === "iyer-cottage" ? "Meera Iyer" : listWords(p.clients);
}

/** "18 Nov" this year; "18 Nov 2025" for an earlier year, so an old date never reads as a coming one. */
function dated(iso: string): string {
  return iso.slice(0, 4) === TODAY.slice(0, 4) ? formatShortDate(iso) : formatDate(iso);
}

function clientFirst(p: ProjectView): string {
  return p.clientWord === "Meera" ? "Meera" : "the client";
}

/** The next fourteen months from the demo's month, as "December 2026". */
const MONTHS = (() => {
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [y, m] = TODAY.split("-").map(Number);
  return Array.from({ length: 14 }, (_, i) => {
    const index = m - 1 + i;
    return `${names[index % 12]} ${y + Math.floor(index / 12)}`;
  });
})();

/** "Milestone 6" or "Sign-up". */
function milestoneLabel(m: MilestoneView): string {
  return m.n === 0 ? "Sign-up" : `Milestone ${m.n}`;
}

// ---- Raise a payment ----

function RaisePanel({ p, m, by, onDone }: { p: ProjectView; m: MilestoneView; by: PersonId; onDone: () => void }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const letterNo = firm.nextLetterNo;
  const client = clientFirst(p);
  const money = withGst(m.amount);
  const exact = Math.round((p.contractValue * m.percent) / 100) === m.amount;
  const working = exact
    ? `${m.percent}% of ${inr(p.contractValue)} is ${inr(m.amount)}. GST ${inr(money.gst)}. Total ${inr(money.total)}.`
    : `${milestoneLabel(m)} is ${inr(m.amount)} before GST, with the approved changes. GST ${inr(money.gst)}. Total ${inr(money.total)}.`;

  return (
    <div className="grid max-w-[640px] gap-4 border-l-2 border-rosewood py-2 pl-4">
      <p className="text-17">{working}</p>
      <p className="text-15 text-ink-soft">
        The demand letter will be {letterNo}, ready for {client === "Meera" ? "Meera's" : "the client's"} bank.
      </p>
      <EmailPreview
        to={`${clientNames(p)}, ${p.clientEmail}`}
        subject={`${p.name}: payment for ${lowerFirst(milestoneLabel(m))}, ${lowerFirst(m.name)}`}
        body={[
          `The ${lowerFirst(m.name)} is finished. The payment for ${lowerFirst(milestoneLabel(m))} is ${inr(money.total)} with GST (${inr(
            m.amount,
          )} before GST).`,
          `Your demand letter ${letterNo} is in your portal, ready for your bank.`,
          "Open Payments to approve it.",
        ]}
      />
      <div>
        <button
          type="button"
          className="btn btn-primary"
          aria-disabled={pause.pending !== null}
          onClick={(event) => {
            if (pause.pending !== null) return;
            const { record } = demo;
            pause.start({
              what: `Payment for ${p.name} ${lowerFirst(milestoneLabel(m))}, ${inr(money.total)}`,
              origin: event.currentTarget,
              commit: () => {
                record({ kind: "payment.raised", projectId: p.id, n: m.n, letterNo, by });
                onDone();
              },
            });
          }}
        >
          Raise {inr(money.total)}
        </button>
      </div>
    </div>
  );
}

// ---- Revise a milestone: a new date, or two payments ----

function RevisePanel({
  p,
  m,
  by,
  splitTaken,
  onDone,
}: {
  p: ProjectView;
  m: MilestoneView;
  by: PersonId;
  /** Why no split can be proposed now, or null. */
  splitTaken: string | null;
  onDone: () => void;
}) {
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const noted = registerNotes.some((n) => n.projectId === p.id && n.n === m.n);
  const [mode, setMode] = useState<"date" | "split">(noted && !splitTaken ? "split" : "date");
  const start = MONTHS.indexOf(m.expected ?? "");
  const [month, setMonth] = useState(MONTHS[Math.min(MONTHS.length - 1, Math.max(0, start + 1))]);
  const half = Math.floor(m.percent / 2);
  const [a, setA] = useState(half);
  const [b, setB] = useState(m.percent - half);
  const [reason, setReason] = useState(noted && p.id === "iyer" ? SPLIT_REASON : "");
  const [error, setError] = useState<Record<string, string>>({});
  const client = clientFirst(p);

  const submit = (origin: HTMLElement) => {
    if (pause.pending !== null) return;
    const next: Record<string, string> = {};
    if (reason.trim().length < 5) next.reason = "Give the reason. It is kept with the change.";
    if (mode === "split" && a + b !== m.percent) next.split = `The two parts must add up to ${m.percent}%. ${splitWords(a, b, m.percent)}`;
    if (mode === "date" && month === m.expected) next.month = "Pick a month other than the one it has now.";
    setError(next);
    if (Object.keys(next).length > 0) return;
    const words = reason.trim();
    const { record } = demo;
    const parts: [number, number] = [a, b];
    const to = month;
    const from = m.expected ?? "not set";
    pause.start({
      what:
        mode === "split"
          ? `${p.name} ${lowerFirst(milestoneLabel(m))} in two parts, sent to ${client}`
          : `${p.name} ${lowerFirst(milestoneLabel(m))} moved to ${to}`,
      origin,
      commit: () => {
        if (mode === "split") record({ kind: "schedule.proposed", projectId: p.id, n: m.n, parts, reason: words, by });
        else record({ kind: "milestone.revised", projectId: p.id, n: m.n, from, to, reason: words, by });
        onDone();
      },
    });
  };

  return (
    <div className="grid max-w-[640px] gap-5 border-l-2 border-rosewood py-2 pl-4">
      <ChipGroup label="What changes" columns={2}>
        <Chip pressed={mode === "date"} onClick={() => setMode("date")}>
          Move the date
        </Chip>
        <Chip
          pressed={mode === "split"}
          onClick={() => {
            if (!splitTaken) setMode("split");
          }}
          detail={splitTaken ?? undefined}
        >
          Split into two payments
        </Chip>
      </ChipGroup>

      {mode === "date" ? (
        <Field label="New expected month" hint={m.expected ? `Now ${m.expected}.` : undefined} error={error.month} htmlFor={`${ids}-month`}>
          <select id={`${ids}-month`} className={field} value={month} onChange={(e) => setMonth(e.target.value)}>
            {MONTHS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <div className="grid gap-2">
          <p className="text-15 font-semibold">
            The two payments, {m.percent}% of the contract in all ({inr(m.amount)} before GST)
          </p>
          <SawnCell
            n={m.n}
            total={m.percent}
            amount={m.amount}
            a={a}
            b={b}
            onChange={(na, nb) => {
              setA(na);
              setB(nb);
            }}
          />
          <p className={`text-15 ${a + b === m.percent ? "text-ink-soft" : "font-semibold"}`}>{splitWords(a, b, m.percent)}</p>
          {error.split && (
            <p className="text-15 font-semibold text-brick" role="alert">
              {error.split}
            </p>
          )}
        </div>
      )}

      <Field
        label="Reason"
        hint={mode === "split" ? `${client === "Meera" ? "Meera" : "The client"} reads it with the change.` : "Kept with the change in the log."}
        error={error.reason}
        htmlFor={`${ids}-reason`}
      >
        <textarea id={`${ids}-reason`} className={`${field} min-h-20 py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>

      {mode === "split" && (
        <EmailPreview
          to={`${clientNames(p)}, ${p.clientEmail}`}
          subject={`${p.name}: a change to your payment schedule`}
          body={[
            `We propose to take ${lowerFirst(milestoneLabel(m))}, ${lowerFirst(m.name)}, as two payments of ${a}% and ${b}% of the contract.`,
            reason.trim() || "The reason will be written here.",
            "Open Payments to approve it or ask for changes. Nothing changes until you approve.",
          ]}
        />
      )}

      <div>
        <button type="button" className="btn btn-primary" aria-disabled={pause.pending !== null} onClick={(e) => submit(e.currentTarget)}>
          {mode === "split" ? `Send to ${client} for approval` : "Record the new date"}
        </button>
      </div>
    </div>
  );
}

// ---- Raise a cost revision from a flagged line ----

function specSheetOf(file: string): string {
  const stem = file.replace(/\.(pdf|png|jpg)$/i, "");
  const [code, ...rest] = stem.split(" ");
  return rest.length > 0 ? `${code}, ${lowerFirst(rest.join(" "))}` : stem;
}

function RevisionPanel({
  p,
  request,
  line,
  by,
  onDone,
}: {
  p: ProjectView;
  request: RequestView;
  line: RequestLine;
  by: PersonId;
  onDone: () => void;
}) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const preset = revisionToRaise.requestNo === request.no && revisionToRaise.lineId === line.id ? revisionToRaise : null;
  const [item, setItem] = useState(preset?.item ?? `${line.sub} ${lowerFirst(firm.catalogue.find((c) => c.id === line.material)?.name ?? line.material)}`);
  const [price, setPrice] = useState(preset ? String(preset.amount) : "");
  const [days, setDays] = useState(preset ? String(preset.days) : "");
  const [files, setFiles] = useState<string[]>([]);
  const [heldUntil, setHeldUntil] = useState(addDays(TODAY, 14));
  const upcoming = p.milestones.filter((m) => m.state === "under-way" || m.state === "to-come");
  const [lands, setLands] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const amount = Math.round(Number(price));
  const landed = upcoming.reduce((total, m) => total + (Math.round(Number(lands[m.n] || 0)) || 0), 0);
  const left = amount - landed;
  const landWords =
    !(amount > 0)
      ? "Enter the price change first."
      : left === 0
        ? `Lands all ${inr(amount)}.`
        : left > 0
          ? `Lands ${inr(landed)} of ${inr(amount)}. ${inr(left)} left to place.`
          : `Lands ${inr(landed)}, ${inr(-left)} more than the price change.`;
  const team = [...new Set([p.team.poc, p.team.head, ...p.team.architects, ...p.team.engineers, ...p.team.procurement])]
    .map((id) => firm.person(id)?.name ?? id);
  const sheetSample = preset ? "S-412 Pool deck finishes.pdf" : `S-4xx ${item || "Revised specification"}.pdf`;

  const submit = (origin: HTMLElement) => {
    if (pause.pending !== null) return;
    const next: Record<string, string> = {};
    if (item.trim().length < 3) next.item = "Name the item.";
    if (!(amount > 0)) next.price = "Enter the price change before GST, in rupees.";
    if (days.trim() === "" || !(Number(days) >= 0) || !Number.isInteger(Number(days))) next.days = "Enter the delay in whole days, 0 if there is none.";
    if (files.length === 0) next.files = "Choose the revised specification.";
    if (amount > 0 && left !== 0) next.lands = `The payments must add up to ${inr(amount)}. ${landWords}`;
    if (!(heldUntil > TODAY)) next.held = "Pick a date after today.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const event = {
      kind: "revision.raised" as const,
      projectId: p.id,
      item: item.trim(),
      amount,
      days: Number(days),
      specSheet: specSheetOf(files[0]),
      lands: upcoming
        .map((m) => ({ n: m.n, amount: Math.round(Number(lands[m.n] || 0)) || 0 }))
        .filter((l) => l.amount > 0),
      heldUntil,
      fromRequest: request.no,
      by,
    };
    const { record } = demo;
    pause.start({
      what: `Cost revision, ${event.item}, sent to everyone on ${p.name}`,
      origin,
      commit: () => {
        record(event);
        onDone();
      },
    });
  };

  const error = (key: string) =>
    errors[key] ? (
      <p className="text-15 font-semibold text-brick" role="alert">
        {errors[key]}
      </p>
    ) : null;

  return (
    <div className="grid max-w-[720px] gap-5 border-l-2 border-rosewood py-2 pl-4">
      <Field label="Item" error={errors.item} htmlFor={`${ids}-item`}>
        <input id={`${ids}-item`} className={field} value={item} onChange={(e) => setItem(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price change before GST, in rupees" hint={preset ? "Prefilled from the site's quote. Sample." : undefined} error={errors.price} htmlFor={`${ids}-price`}>
          <input id={`${ids}-price`} className={field} inputMode="numeric" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Delay, in days" error={errors.days} htmlFor={`${ids}-days`}>
          <input id={`${ids}-days`} className={field} inputMode="numeric" type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-1.5">
        <DropZone label="Revised specification" samples={[sheetSample]} accept="pdf" chosen={files} onChoose={setFiles} />
        {error("files")}
      </div>
      <fieldset className="grid gap-3">
        <legend className="text-15 font-semibold">Which payments it lands in, before GST</legend>
        <ul className="grid gap-2">
          {upcoming.map((m) => (
            <li key={m.n} className="grid grid-cols-[minmax(0,1fr)_9rem] items-center gap-3">
              <label htmlFor={`${ids}-land-${m.n}`} className="text-15">
                {milestoneLabel(m)}, {lowerFirst(m.name)}
                {m.expected ? `, ${m.expected}` : ""}
              </label>
              <input
                id={`${ids}-land-${m.n}`}
                className={field}
                inputMode="numeric"
                type="number"
                min={0}
                value={lands[m.n] ?? ""}
                onChange={(e) => setLands({ ...lands, [m.n]: e.target.value })}
              />
            </li>
          ))}
        </ul>
        <p className={`text-15 ${left === 0 && amount > 0 ? "text-ink-soft" : "font-semibold"}`}>{landWords}</p>
        {error("lands")}
      </fieldset>
      <Field label="Price held until" error={errors.held} htmlFor={`${ids}-held`}>
        <input id={`${ids}-held`} className={field} type="date" min={addDays(TODAY, 1)} value={heldUntil} onChange={(e) => setHeldUntil(e.target.value)} />
      </Field>
      <EmailPreview
        label="See the email to everyone on the project, including the client"
        to={`Everyone on ${p.name}: ${listWords([...p.clients, ...team])}`}
        subject={`${p.name}: cost revision, ${lowerFirst(item || "an item")}`}
        body={[
          `${item || "The item"} changes the price by ${amount > 0 ? inr(amount) : "the amount"} before GST and adds ${
            days.trim() === "" ? "the delay" : dayCount(Number(days))
          }.`,
          `The revised specification ${files[0] ? specSheetOf(files[0]) : ""} is attached. The price is held until ${formatShortDate(heldUntil)}.`.replace("  ", " "),
          "Nothing changes until the client approves it.",
        ]}
      />
      <div>
        <button type="button" className="btn btn-primary" aria-disabled={pause.pending !== null} onClick={(e) => submit(e.currentTarget)}>
          Send to everyone on {p.name}
        </button>
      </div>
    </div>
  );
}

// ---- The page ----

export function ProjectProgramme({ id }: { id: ProjectId }) {
  const firm = useFirm();
  const demo = useDemo();
  const projection = useProjection();
  const pause = usePause();
  const pathname = usePathname();
  const role = useStaffRole();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const p = firm.project(id);

  if (!p) return null;
  if (p.milestones.length === 0) {
    return (
      <p className="mt-8 text-17 text-ink-soft">
        The programme is set when the workspace is opened. Until then there are no milestones.
      </p>
    );
  }

  const viewer = viewerIdOf(role, demo.viewers);
  const head = firm.person(p.team.head);
  const canAct = role === "admin" || viewer === p.team.head;
  const by: PersonId = viewer;
  const split = firm.scheduleChanges.find((s) => s.projectId === p.id) ?? null;

  // The flagged lines that still wait for a cost revision.
  const raisedFrom = new Set(firm.revisions.map((r) => r.fromRequest).filter(Boolean));
  const flags = firm.requests
    .filter((r) => r.projectId === p.id && !r.queued && r.outside && !raisedFrom.has(r.no))
    .map((r) => ({ request: r, line: r.lines.find((l) => l.outsideEstimate) }))
    .filter((f): f is { request: RequestView; line: RequestLine } => Boolean(f.line));

  const milestoneOf = (rowId: string) => p.milestones.find((m) => `pay:${p.id}:${m.n}` === rowId);
  const kindFor = (rowId: string): PanelKind | null => {
    if (rowId.startsWith("flag:")) return flags.some((f) => `flag:${f.request.no}` === rowId) ? "revision" : null;
    const m = milestoneOf(rowId);
    if (!m) return null;
    if (m.state === "done") return "raise";
    if (m.state === "under-way" || m.state === "to-come") return "revise";
    return null;
  };

  // A row chosen from the desk opens its panel, until it is closed.
  const focus = demo.focusRow && pathOf(demo.focusRow.href) === pathname ? demo.focusRow.id : null;
  const autoKind = focus && canAct && focus !== dismissed ? kindFor(focus) : null;
  const current: Panel | null = panel ?? (focus && autoKind ? { rowId: focus, kind: autoKind } : null);

  const close = (rowId: string) => {
    if (pause.pending !== null && pause.pending.rowId === rowId) pause.cancel();
    setPanel(null);
    setDismissed(focus);
  };
  const done = () => {
    setPanel(null);
    setDismissed(focus);
  };
  const toggle = (rowId: string, kind: PanelKind) => {
    if (current?.rowId === rowId) close(rowId);
    else setPanel({ rowId, kind });
  };

  const actionButton = (rowId: string, kind: PanelKind, label: string) => (
    <button type="button" className="btn btn-quiet" aria-expanded={current?.rowId === rowId} onClick={() => toggle(rowId, kind)}>
      {current?.rowId === rowId ? "Close" : label}
    </button>
  );

  const client = clientFirst(p);
  const clientMargin = `With ${p.clientWord === "Meera" ? "Meera" : "client"}`;

  const milestoneRow = (m: MilestoneView, index: number) => {
    const rowId = `pay:${p.id}:${m.n}`;
    const open = current?.rowId === rowId ? current.kind : null;
    const doneEvent = demo.events.find((e) => e.kind === "stage.done" && e.projectId === p.id && e.n === m.n);
    const note = doneEvent && doneEvent.kind === "stage.done" ? doneEvent.note : m.siteNote;
    const photos = m.photos ?? [];
    const pending = split && split.n === m.n && split.status === "waiting";
    const letter = m.letterNo ? m.letterNo.split("/").pop() : "";
    // The same overdue rule as the finance letters: past OVERDUE_AFTER_DAYS since approval.
    const overdueDays =
      (m.state === "approved" || m.state === "part-paid") && m.approvedAt
        ? Math.max(0, daysSince(m.approvedAt) - OVERDUE_AFTER_DAYS)
        : 0;

    const local: StampView[] = demo.events
      .filter((e) => e.kind === "milestone.revised" && e.projectId === p.id && e.n === m.n)
      .map((e) => ({ words: `Moved to ${e.kind === "milestone.revised" ? e.to : ""}`, at: e.at, by: e.by }));
    const all = newestFirst([...firm.stampsFor(rowId), ...firm.stampsFor(`sched:${p.id}:${m.n}`), ...local]);
    // A paid milestone's history is settled: its row says when, and shows only today's stamps.
    const stamps = m.state === "paid" ? all.filter((stamp) => datePart(stamp.at) === TODAY) : all;
    // The Stage done stamp already says who marked it done and when.
    const doneStamped = all.some((stamp) => stamp.words === "Stage done");

    let margin = "To come";
    let marginSub: string | undefined;
    let clientTurn = false;
    let overdue = false;
    let sentence: ReactNode = m.expected ? `Expected ${m.expected}.` : "";
    let photoStrip: ReactNode = null;
    switch (m.state) {
      case "paid":
        margin = "Paid";
        // The margin already says Paid, so the sentence only says when.
        sentence = m.paidOn ? `Received in full on ${dated(m.paidOn)}.` : "Received in full.";
        break;
      case "part-paid":
        margin = "Part paid";
        // How overdue it is sits in the margin, once.
        sentence = `${inr(m.received)} received of ${inr(m.total)}, letter ${letter}. ${inr(m.total - m.received)} still to come.`;
        if (overdueDays > 0) {
          marginSub = `Overdue ${dayCount(overdueDays)}`;
          overdue = true;
        }
        break;
      case "approved":
        if (overdueDays > 0) {
          margin = "Overdue";
          marginSub = ageWords(overdueDays);
          overdue = true;
        } else {
          margin = "With the bank";
          marginSub = m.approvedAt ? ageWords(daysSince(m.approvedAt)) : undefined;
        }
        sentence = `Approved${m.approvedAt ? ` on ${dated(m.approvedAt)}` : ""}, letter ${letter}. ${
          overdueDays > 0 ? `Overdue ${dayCount(overdueDays)}.` : "Waiting for the bank."
        }`;
        break;
      case "raised":
        margin = clientMargin;
        marginSub = m.raisedAt ? ageWords(daysSince(m.raisedAt)) : undefined;
        clientTurn = true;
        sentence = `Raised${m.raisedAt ? ` on ${dated(m.raisedAt)}` : ""}, letter ${letter}. ${
          m.acceptedAt ? "The stage is accepted; the payment waits for approval." : "The stage and the payment wait for approval."
        }`;
        break;
      case "done":
        margin = canAct ? "Yours" : `With ${head?.first ?? "the Project Head"}`;
        sentence = (
          <>
            {!doneStamped && (
              <>
                {m.doneBy ? firm.person(m.doneBy)?.name : "The site"} marked it done
                {m.doneOn ? ` on ${formatStamp(m.doneOn)}` : ""}.
              </>
            )}
            {note && (
              <span className={doneStamped ? "block bg-sand-2 px-3 py-2 text-ink" : "mt-2 block bg-sand-2 px-3 py-2 text-ink"}>
                <q>{note.charAt(0).toUpperCase() + note.slice(1)}</q>
              </span>
            )}
          </>
        );
        // Figures are block content, so the photos sit under the row, not in its sentence.
        if (photos.length > 0)
          photoStrip = (
            <div className="flex flex-wrap gap-2">
              {photos.slice(0, 2).map((kind, i) => (
                <SamplePhoto key={`${kind}-${i}`} kind={kind} tag={i === 0} />
              ))}
            </div>
          );
        break;
      case "under-way":
        margin = "Under way";
        sentence = `${m.startedOn ? `Started ${dated(m.startedOn)}. ` : ""}${m.expected ? `Expected ${m.expected}.` : ""}`;
        break;
    }
    if (pending) {
      margin = clientMargin;
      marginSub = ageWords(daysSince(split.at));
      clientTurn = true;
      sentence = (
        <>
          {sentence} Proposed as two payments of {split.parts[0]}% and {split.parts[1]}%, waiting for {client}.
        </>
      );
    } else if (m.parts) {
      sentence = (
        <>
          {sentence} Taken as two payments: {m.parts.map((part) => `${part.label} ${inr(part.total)}`).join(" and ")}, with GST.
        </>
      );
    }

    let action: ReactNode = undefined;
    let body: ReactNode = null;
    if (canAct && m.state === "done") {
      action = actionButton(rowId, "raise", "Raise payment");
      if (open === "raise") body = <RaisePanel p={p} m={m} by={by} onDone={done} />;
    } else if (canAct && (m.state === "under-way" || m.state === "to-come") && !pending && !m.parts) {
      action = actionButton(rowId, "revise", "Revise milestone");
      // One split per project at a time: the one waiting, or the one already agreed.
      let taken: string | null = null;
      if (split && split.status === "waiting" && split.n !== m.n) taken = `A split of milestone ${split.n} is waiting for ${client}.`;
      if (split && split.status === "approved" && split.n !== m.n) taken = `Milestone ${split.n} is already split.`;
      if (open === "revise") body = <RevisePanel p={p} m={m} by={by} splitTaken={taken} onDone={done} />;
    }

    return (
      <RegisterRow
        key={rowId}
        id={rowId}
        margin={margin}
        marginSub={marginSub}
        client={clientTurn}
        overdue={overdue}
        title={
          <>
            <span id={`m${m.n}`} className="scroll-mt-24">
              {m.n === 0 ? "Sign-up" : `${milestoneLabel(m)}, ${lowerFirst(m.name)}`}, {m.percent}%
            </span>
            {index === 0 && (
              <>
                {" "}
                <SampleTag />
              </>
            )}
          </>
        }
        sentence={sentence}
        figure={`${inr(m.total)} with GST`}
        stamps={stamps}
        action={action}
      >
        {photoStrip}
        {body}
      </RegisterRow>
    );
  };

  // ---- Cost revisions ----
  const revisions = firm.revisions.filter((r) => r.projectId === p.id);
  const revisionRows = revisions.map((r) => {
    const rowId = `rev:${r.id}`;
    const approvedAt = r.changeId ? projection.approvedAt[`change:${r.changeId}`] : undefined;
    let margin = "Approved";
    let marginSub: string | undefined;
    let sentence = "";
    if (r.status === "with-client") {
      margin = clientMargin;
      marginSub = ageWords(daysSince(r.raisedAt));
      sentence = `${dayCount(r.days)} added.${r.heldUntil ? ` Price held until ${formatShortDate(r.heldUntil)}.` : ""} Specification ${r.specSheet}.`;
    } else if (r.status === "approved") {
      sentence = `Approved by ${clientNames(p)}${approvedAt ? ` on ${formatStamp(approvedAt)}` : ""}${r.addendum ? `, ${r.addendum}` : ""}.`;
    } else {
      margin = canAct ? "Yours" : `With ${head?.first ?? "the Project Head"}`;
      sentence = `${client === "Meera" ? "Meera" : "The client"} asked for changes. Revise the price or the specification.`;
    }
    return (
      <RegisterRow
        key={rowId}
        id={rowId}
        margin={margin}
        marginSub={marginSub}
        client={r.status === "with-client"}
        title={`${r.id}, ${lowerFirst(r.item)}`}
        sentence={sentence}
        figure={`${r.amount < 0 ? "−" : "+"}${inr(Math.abs(r.amount))} before GST`}
        stamps={firm.stampsFor(rowId)}
      />
    );
  });
  const flagRows = flags.map(({ request, line }) => {
    const rowId = `flag:${request.no}`;
    const raiser = firm.person(request.by);
    const preset = revisionToRaise.requestNo === request.no ? revisionToRaise : null;
    const title = preset
      ? `${preset.item.split(",")[0]}, flagged by ${raiser?.name ?? request.by} on ${request.no}`
      : `${line.sub}${line.note ? `, ${line.note}` : ""}, flagged by ${raiser?.name ?? request.by} on ${request.no}`;
    return (
      <RegisterRow
        key={rowId}
        id={rowId}
        margin={canAct ? ageWords(daysSince(request.at)) : `With ${head?.first ?? "the Project Head"}`}
        title={title}
        sentence={`${line.qty.toLocaleString("en-IN")} ${line.unit}, not in the agreed estimate. A cost revision lets ${client} approve the price first.`}
        stamps={firm.stampsFor(rowId)}
        action={canAct ? actionButton(rowId, "revision", "Raise cost revision") : undefined}
      >
        {current?.rowId === rowId && <RevisionPanel p={p} request={request} line={line} by={by} onDone={done} />}
      </RegisterRow>
    );
  });

  return (
    <div className="mt-8 grid gap-12">
      {!canAct && (
        <p className="text-15 text-ink-soft">
          Only the Project Head, {head?.name ?? "of this project"}, and admin raise payments and revise this programme.
        </p>
      )}
      <Register title="Milestones" limit={12}>
        {p.milestones.map(milestoneRow)}
      </Register>
      <Register
        id="revision"
        title="Cost revisions"
        empty="No cost revisions. A revision starts from a line the site flags as outside the agreed estimate."
        limit={8}
      >
        {[...flagRows, ...revisionRows]}
      </Register>
    </div>
  );
}
