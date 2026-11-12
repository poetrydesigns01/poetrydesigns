"use client";

import { useState, type ReactNode } from "react";
import { MaterialStack } from "@/components/instruments/material-stack";
import { Chip } from "@/components/register/chips";
import { useScope } from "@/components/register/project-switch";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { useFirm, useViewer } from "@/lib/demo-store";
import { ageWords, type LetterView, type RequestView, type TurnItem } from "@/lib/firm";
import { countWord, inr, listWords } from "@/lib/format";
import { ReceivableBlock, receivableWords } from "./receivable-block";
import {
  BillTurnRow,
  LetterRow,
  lettersOpenOrPaidThisMonth,
  RequestTurnRow,
  RevisionRegister,
  stampedToday,
  usePanel,
} from "./rows";
import { approvedOpen, firstOf, hasFinance, inScope, procuresAny, toCome } from "./shared";

// Procurement and finance, Today. Prakash's day is requests: which are new, which are
// ageing without a PO. Divya's is money: which letters wait for the bank, which bills need
// entering. Both see the cost revisions that move a contract value. Each sees the other's
// queue as "With Prakash" or "With Divya", so nothing is lost between them.

type Side = "requests" | "money";

function headlineFor(n: number, first: string): string {
  if (n === 0) return `Nothing needs you today, ${first}.`;
  return `${countWord(n, true)} ${n === 1 ? "thing needs" : "things need"} you today, ${first}.`;
}

/** The words under the three stacks: "0136: 500 of 850 kg ordered. 0139 and 0140: none ordered yet." */
function stackCaption(requests: RequestView[], firm: ReturnType<typeof useFirm>): string {
  const none: string[] = [];
  const parts: string[] = [];
  for (const r of requests) {
    const line = r.lines[0];
    const item = firm.catalogue.find((c) => c.id === line.material);
    const ordered = r.ordered[line.id] ?? 0;
    const short = r.no.slice(-4);
    if (ordered <= 0) none.push(short);
    else parts.push(`${short}: ${ordered.toLocaleString("en-IN")} of ${line.qty.toLocaleString("en-IN")} ${item?.unit ?? line.unit} ordered.`);
  }
  if (none.length > 0) parts.push(`${listWords(none)}: none ordered yet.`);
  return parts.join(" ");
}

export function FinanceToday() {
  const firm = useFirm();
  const me = useViewer("finance");
  const scope = useScope("finance");
  const panel = usePanel();
  const finance = hasFinance(me);
  const buyer = procuresAny(me.id, firm);
  const [chosen, setChosen] = useState<Side | null>(null);
  const side: Side = chosen ?? (finance && !buyer ? "money" : "requests");

  const turns = firm.turns(me.id, scope);
  const requestTurns = turns.filter((t) => t.id.startsWith("mr:"));
  const letterTurns = turns.filter((t) => t.id.startsWith("pay:"));
  const billTurns = turns.filter((t) => t.id.startsWith("bill:"));
  // A home shows only today's stamps; the history is on each row's own page.
  const today = (item: TurnItem): TurnItem => ({ ...item, stamps: stampedToday(item.stamps) });
  const requestOf = (item: TurnItem) => firm.requests.find((r) => `mr:${r.no}` === item.id);

  // ---- The board ----
  const newest = requestTurns
    .map(requestOf)
    .filter((r): r is RequestView => !!r && r.status === "New")
    .sort((a, b) => b.days - a.days);
  const letters = inScope(firm.letters, scope);
  const owed = approvedOpen(letters).reduce((total, l) => total + toCome(l), 0);

  let state: string;
  let primary: { label: string; href: string } | undefined;
  let picture: ReactNode = null;
  let pictureWords: string | undefined;
  if (buyer) {
    const oldest = newest[0];
    state = oldest
      ? `The oldest request has waited ${ageWords(oldest.days).toLowerCase()}.`
      : requestTurns.length > 0
        ? "Every request has been seen."
        : "Every request has its PO.";
    const opening = oldest ?? (requestTurns[0] ? requestOf(requestTurns[0]) : undefined);
    if (opening) primary = { label: `Open ${opening.no}`, href: `/staff/finance/requests/${opening.no}` };
    const stacked = requestTurns
      .map(requestOf)
      .filter((r): r is RequestView => !!r)
      .slice(0, 3);
    if (stacked.length > 0) {
      picture = (
        <div className="flex flex-wrap items-end gap-4">
          {stacked.map((r) => {
            const line = r.lines[0];
            const item = firm.catalogue.find((c) => c.id === line.material);
            if (!item) return null;
            const pos = r.pos.map((po) => po.lines.filter((l) => l.lineId === line.id).reduce((t, l) => t + l.qty, 0));
            return (
              <MaterialStack
                key={r.no}
                item={item}
                requested={line.qty}
                ordered={pos}
                delivered={r.status === "Delivered"}
                width={136}
                tone="dark"
                words="none"
              />
            );
          })}
        </div>
      );
      pictureWords = stackCaption(stacked, firm);
    }
  } else {
    state = owed > 0 ? `${inr(owed)} with GST is approved and not yet received.` : "Every approved letter is paid.";
    const blocks = lettersOpenOrPaidThisMonth(letters).filter((l) => l.state !== "paid" || l.receipts.length > 0);
    if (blocks.length > 0) {
      picture = <ReceivableBlock letters={blocks} />;
      pictureWords = receivableWords(blocks);
    }
  }

  // ---- The two columns ----
  const openRequests = inScope(
    firm.requests.filter((r) => !r.queued && (r.status === "New" || r.status === "Seen" || r.status === "PO in part")),
    scope,
  );
  const group = (status: string) => requestTurns.filter((t) => t.status?.[0] === status);

  const requestsColumn = buyer ? (
    <>
      <Register title="New requests" empty="No new requests.">
        {group("New").map((item) => (
          <RequestTurnRow key={item.id} item={today(item)} person={me.id} />
        ))}
      </Register>
      <Register title="Seen, waiting on a PO">
        {group("Seen, waiting on a PO").map((item) => (
          <RequestTurnRow key={item.id} item={today(item)} person={me.id} />
        ))}
      </Register>
      <Register title="PO in part">
        {group("PO in part").map((item) => (
          <RequestTurnRow key={item.id} item={today(item)} person={me.id} />
        ))}
      </Register>
    </>
  ) : (
    <Register title="Requests with procurement" empty="No requests are waiting on procurement." limit={3}>
      {openRequests.map((r) => (
        <RegisterRow
          key={r.no}
          id={`mr:${r.no}`}
          margin={`With ${firstOf(firm.person(r.procurement[0])?.name ?? "procurement")}`}
          marginSub={ageWords(r.days)}
          title={`${r.no}, ${r.lineWords[0]}${r.lines.length > 1 ? ` and ${r.lines.length - 1} more` : ""}`}
          sentence={`${r.projectName}. ${r.status === "New" ? "Not seen yet" : r.status === "Seen" ? "Seen, waiting on a PO" : "PO in part"}.`}
          href={`/staff/finance/requests/${r.no}`}
          stamps={stampedToday(firm.stampsFor(`mr:${r.no}`))}
        />
      ))}
    </Register>
  );

  const waitingLetters = letterTurns
    .map((t) => firm.letters.find((l) => `pay:${l.projectId}:${l.n}` === t.id))
    .filter((l): l is LetterView => !!l);

  const moneyColumn = (
    <>
      {finance && (
        <Register title="Money in" empty="No letters are waiting for money.">
          {waitingLetters.map((l) => (
            <LetterRow key={l.letterNo} letter={l} person={me.id} canRecord panel={panel} todayOnly />
          ))}
        </Register>
      )}
      {finance && (
        <Register title="Bills to enter" empty="No bills are waiting to be entered.">
          {billTurns.map((item) => {
            const po = firm.pos.find((x) => `bill:${x.no}` === item.id);
            return po ? <BillTurnRow key={item.id} item={today(item)} po={po} person={me.id} canEnter panel={panel} /> : null;
          })}
        </Register>
      )}
      <RevisionRegister scope={scope} todayOnly />
    </>
  );

  const first = buyer ? requestsColumn : moneyColumn;
  const second = buyer ? moneyColumn : requestsColumn;
  const firstSide: Side = buyer ? "requests" : "money";

  return (
    <>
      <StaffBoard
        place="Today"
        headline={headlineFor(turns.length, me.first)}
        state={state}
        primary={primary}
        picture={picture}
        pictureWords={pictureWords}
      />
      <div className="mt-6 min-[1360px]:hidden" role="group" aria-label="Show">
        <div className="grid grid-cols-2 gap-2 sm:max-w-[28rem]">
          <Chip pressed={side === "requests"} onClick={() => setChosen("requests")}>
            Requests
          </Chip>
          <Chip pressed={side === "money"} onClick={() => setChosen("money")}>
            Money
          </Chip>
        </div>
      </div>
      <div className="staff-columns mt-6 min-[1360px]:mt-10">
        <div className={`gap-10 ${side === firstSide ? "grid" : "hidden min-[1360px]:grid"}`}>{first}</div>
        <div className={`content-start gap-10 ${side !== firstSide ? "grid" : "hidden min-[1360px]:grid"}`}>{second}</div>
      </div>
    </>
  );
}
