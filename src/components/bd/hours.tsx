"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { TeakCut } from "@/components/instruments/teak-cut";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { Field } from "@/components/register/field";
import { useScope } from "@/components/register/project-switch";
import { useOnHidden, usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { SampleTag } from "@/components/register/sample-tag";
import { StaffBoard } from "@/components/register/staff-board";
import { stampNow } from "@/lib/clock";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm } from "@/lib/demo-store";
import type { CreditRequestView, CreditView, Firm } from "@/lib/firm";
import { ageWords } from "@/lib/firm";
import { HOUR_PRICE, type CreditAddition } from "@/lib/firm-data";
import { countWord, datePart, formatDate, formatShortDate, formatTime, hours, inr } from "@/lib/format";

// Hours asked. A client who has used up their advisory hours asks for more and pays Poetry
// offline; once the money is in, Rohan adds the hours here. The addition waits five
// seconds like every write, then the client and the accountant are copied. Every hour
// ever added stays in the second register; nothing in it can be changed.

const POOL_WORDS = { before: "Before construction", during: "During construction" } as const;

function headlineFor(n: number): string {
  if (n === 0) return "No client is waiting for hours.";
  return `${countWord(n, true)} ${n === 1 ? "client" : "clients"} asked for more hours.`;
}

/** What the current pool holds and how much of it was bought. */
function poolOf(credit: CreditView, pool: "before" | "during") {
  const p = credit[pool];
  const added = credit.added.filter((a) => a.pool === pool).reduce((sum, a) => sum + a.hours, 0);
  return { granted: p.granted, used: p.used, added, left: p.granted - p.used };
}

function projectName(firm: Firm, id: string): string {
  return firm.projects.find((p) => p.id === id)?.name ?? id;
}

/** The panel under an "Add hours" row: how many, which pool, the payment and why. */
function AddHoursPanel({
  request,
  credit,
  onDone,
}: {
  request: CreditRequestView;
  credit: CreditView;
  onDone: () => void;
}) {
  const demo = useDemo();
  const firm = useFirm();
  const pause = usePause();
  const ids = useId();
  const [count, setCount] = useState(request.hours);
  const [pool, setPool] = useState<"before" | "during">(credit.current);
  const [amount, setAmount] = useState<number | null>(null);
  const [receivedOn, setReceivedOn] = useState(TODAY);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Prefilled at the sample price until Rohan types what was actually paid.
  const paid = amount ?? count * HOUR_PRICE;
  const waiting = pause.pending !== null;
  const name = projectName(firm, request.projectId);

  const submit = (origin: HTMLElement) => {
    if (waiting) return;
    if (!(count > 0)) return setError("Say how many hours to add.");
    if (!(paid > 0)) return setError("Say how much was received.");
    if (!reference.trim()) return setError("Add the payment reference, such as the UTR number.");
    setError("");
    const { record } = demo;
    pause.start({
      what: `${hours(count)} for ${name}`,
      origin,
      commit: () => {
        const at = stampNow();
        const addition: CreditAddition = {
          id: `add-${request.projectId}-${getDemoSnapshot().events.length + 1}`,
          projectId: request.projectId,
          hours: count,
          pool,
          by: "rohan",
          at,
          amount: paid,
          receivedOn,
          reference: reference.trim(),
          reason: reason.trim() || `${request.by} asked on ${formatShortDate(datePart(request.at))}.`,
        };
        record({ kind: "credits.added", addition, by: "rohan" });
        onDone();
      },
    });
  };

  return (
    <form
      className="grid gap-5 border-t border-sand pt-4"
      aria-label={`Add hours for ${name}`}
      onSubmit={(event) => {
        event.preventDefault();
        submit(buttonRef.current ?? event.currentTarget);
      }}
    >
      <div className="grid gap-5">
        <Field label="Hours to add">
          <input
            type="number"
            inputMode="decimal"
            min={0.5}
            step={0.5}
            className={`${field} max-w-32`}
            value={count}
            onChange={(event) => setCount(Math.max(0, Number(event.target.value) || 0))}
          />
        </Field>
        <ChipGroup label="Pool">
          {(["before", "during"] as const).map((key) => (
            <Chip key={key} pressed={pool === key} onClick={() => setPool(key)}>
              {POOL_WORDS[key]}
            </Chip>
          ))}
        </ChipGroup>
      </div>
      <fieldset className="grid min-w-0 gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-17 font-semibold">Payment received offline</legend>
        <div>
          <label htmlFor={`${ids}-amount`} className="block text-15 font-semibold">
            Amount before GST
          </label>
          <p className="mt-0.5 text-15 text-ink-soft">
            {inr(HOUR_PRICE)} an hour <SampleTag />
          </p>
          <input
            id={`${ids}-amount`}
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            className={`${field} mt-1.5`}
            value={paid}
            onChange={(event) => setAmount(Math.max(0, Number(event.target.value) || 0))}
          />
        </div>
        <Field label="Received on">
          <input
            type="date"
            className={field}
            value={receivedOn}
            max={TODAY}
            onChange={(event) => setReceivedOn(event.target.value || TODAY)}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Reference" hint="UTR or cheque number">
            <input
              type="text"
              className={field}
              value={reference}
              autoComplete="off"
              onChange={(event) => {
                setReference(event.target.value);
                if (error) setError("");
              }}
            />
          </Field>
        </div>
      </fieldset>
      <Field label="Reason" hint="Kept with the hours in the log">
        <input
          type="text"
          className={field}
          value={reason}
          placeholder={`${request.by} asked on ${formatShortDate(datePart(request.at))}.`}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
      <div>
        <button
          ref={buttonRef}
          type="submit"
          className="btn btn-primary w-full sm:w-auto"
          aria-disabled={waiting}
          aria-describedby={`${ids}-copy`}
        >
          Add {hours(count)}
        </button>
        <p id={`${ids}-copy`} className="mt-2 text-15 text-ink-soft">
          {request.projectId === "iyer" || request.projectId === "iyer-cottage"
            ? "Meera sees them on her hours page as a new length of teak."
            : `${request.by} and the accountant are emailed a copy.`}
        </p>
      </div>
    </form>
  );
}

export function HoursAsked() {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const scope = useScope("bd");
  // Which request's panel is open. Undefined follows "See it as" or the Today link; null is
  // closed on purpose. A panel is a passing thing, so it is let go when the screen is hidden.
  const [panel, setPanel] = useState<string | null | undefined>(undefined);
  useOnHidden(() => setPanel(undefined));

  const inScope = (projectId: string) => scope === "all" || projectId === scope;
  const open = firm.creditRequests.filter((r) => r.open && inScope(r.projectId)).sort((a, b) => b.days - a.days);
  const focus =
    demo.focusRow && demo.focusRow.href.split(/[?#]/)[0] === "/staff/bd/hours" ? demo.focusRow.id : null;
  const openId = panel === undefined ? focus : panel;

  // Newest first. Stamps carry the minute only, so two additions in the same minute keep
  // the order they were made in: firm.additions lists the seed, then this tab's events.
  const additions = firm.additions
    .map((a, order) => ({ a, order }))
    .filter(({ a }) => inScope(a.projectId))
    .sort((x, y) => y.a.at.localeCompare(x.a.at) || y.order - x.order)
    .map(({ a }) => a);
  // An addition made in this tab answers a request, and carries that request's stamps under
  // the request's id, found the way the record finds it.
  const live = new Set(demo.events.flatMap((e) => (e.kind === "credits.added" ? [e.addition.id] : [])));
  const requestFor = (a: CreditAddition) =>
    live.has(a.id) ? firm.creditRequests.find((r) => r.projectId === a.projectId && r.at <= a.at) : undefined;

  // The board's teak: the first open request's pool, with the asked hours in chalk; with
  // none open, the pool most recently added to, with the bought board joined on.
  const lead = open[0];
  const latest = additions[0];
  const teakProject = lead?.projectId ?? latest?.projectId;
  const credit = firm.credits.find((c) => c.projectId === teakProject);
  let picture = null;
  if (credit && teakProject) {
    const which = lead ? credit.current : latest?.pool ?? credit.current;
    const pool = poolOf(credit, which);
    picture = (
      <TeakCut
        granted={pool.granted}
        used={pool.used}
        added={pool.added}
        adding={lead ? lead.hours : 0}
        tone="dark"
        label={
          lead
            ? `${projectName(firm, teakProject)}, ${POOL_WORDS[which].toLowerCase()}. The chalk is what was asked for.`
            : `${projectName(firm, teakProject)}, ${POOL_WORDS[which].toLowerCase()}, with the bought hours joined on.`
        }
      />
    );
  }

  const close = (rowId: string) => {
    if (pause.pending?.rowId === rowId) pause.cancel();
    setPanel(null);
  };

  return (
    <>
      <StaffBoard
        place="Hours asked"
        headline={headlineFor(open.length)}
        state="Add the hours once the client has paid Poetry offline."
        picture={picture}
      />
      <div className="staff-columns mt-8">
        <Register title="Asked for" empty="Every request is answered.">
          {open.map((r) => {
            const c = firm.credits.find((x) => x.projectId === r.projectId);
            const left = c ? c.left : 0;
            const isOpen = openId === r.id;
            return (
              <RegisterRow
                key={r.id}
                id={r.id}
                margin={ageWords(r.days)}
                title={
                  <>
                    {r.by},{" "}
                    <Link href={`/staff/projects/${r.projectId}`} className="link py-3.5 font-normal">
                      {projectName(firm, r.projectId)}
                    </Link>
                  </>
                }
                figure={hours(r.hours)}
                sentence={`Asked ${formatShortDate(datePart(r.at))}. ${hours(Math.max(left, 0))} left${left < 0 ? `, ${hours(-left)} over` : ""}.`}
                stamps={firm.stampsFor(r.id)}
                action={
                  c && (
                    <button
                      type="button"
                      className="btn btn-quiet"
                      aria-expanded={isOpen}
                      onClick={() => (isOpen ? close(r.id) : setPanel(r.id))}
                    >
                      {isOpen ? "Close" : "Add hours"}
                    </button>
                  )
                }
              >
                {isOpen && c && <AddHoursPanel request={r} credit={c} onDone={() => setPanel(null)} />}
              </RegisterRow>
            );
          })}
        </Register>
        <Register title="Hours added" limit={6} empty="No hours have been added yet.">
          {additions.map((a) => {
            const request = requestFor(a);
            const stamps = request ? firm.stampsFor(request.id) : [];
            const by = firm.person(a.by)?.name ?? a.by;
            return (
              <RegisterRow
                key={a.id}
                id={request?.id ?? `add:${a.id}`}
                margin={formatShortDate(datePart(a.at))}
                marginSub={datePart(a.at).slice(0, 4)}
                title={`${projectName(firm, a.projectId)}, ${hours(a.hours)}`}
                figure={inr(a.amount)}
                sentence={`${POOL_WORDS[a.pool]}. Paid ${formatDate(a.receivedOn)}, ${a.reference}. ${a.reason}${
                  stamps.length > 0 ? "" : ` Added by ${by}${formatTime(a.at) ? ` at ${formatTime(a.at)}` : ""}.`
                }`}
                stamps={stamps}
              />
            );
          })}
        </Register>
      </div>
    </>
  );
}
