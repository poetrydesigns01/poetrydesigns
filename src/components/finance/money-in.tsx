"use client";

import { useScope } from "@/components/register/project-switch";
import { Register, RegisterRow } from "@/components/register/register";
import { SampleTag } from "@/components/register/sample-tag";
import { StaffBoard } from "@/components/register/staff-board";
import { useFirm, useViewer } from "@/lib/demo-store";
import { ageWords, daysSince, OVERDUE_AFTER_DAYS, type LetterView } from "@/lib/firm";
import { HOUR_PRICE } from "@/lib/firm-data";
import { countWord, formatShortDate, formatStampShort, inr } from "@/lib/format";
import { SeeAsLine } from "./mark-seen";
import { ReceivableBlock, receivableWords } from "./receivable-block";
import { LetterRow, lettersOpenOrPaidThisMonth, ProjectLink, usePanel } from "./rows";
import { approvedOpen, beforeGstWords, hasFinance, inScope, toCome } from "./shared";

// Money in: every demand letter from the day it is raised until the money is in, grouped
// by where it stands. The accountant records each receipt against its letter, the bank's
// part and the client's part on their own, so the letter reads part paid, then paid. Hours
// a client bought are money in too, and are listed under the letters.

export function MoneyIn() {
  const firm = useFirm();
  const me = useViewer("finance");
  const scope = useScope("finance");
  const panel = usePanel();
  const finance = hasFinance(me);
  const accountant = firm.people.find((p) => p.role === "finance" && hasFinance(p));

  const letters = lettersOpenOrPaidThisMonth(inScope(firm.letters, scope)).sort((a, b) => b.days - a.days);
  const owed = approvedOpen(letters).reduce((total, l) => total + toCome(l), 0);
  const withClient = letters.filter((l) => l.state === "raised");
  const waiting = letters.filter((l) => l.state === "approved" && l.overdueDays === 0);
  const partPaid = letters.filter((l) => l.state === "part-paid");
  const overdue = letters.filter((l) => l.state === "approved" && l.overdueDays > 0);
  const paid = letters.filter((l) => l.state === "paid");
  const late = letters.filter((l) => l.overdueDays > 0).sort((a, b) => b.overdueDays - a.overdueDays);

  const headline = owed > 0 ? `${inr(owed)} with GST is approved and not yet received.` : "Every approved letter is paid.";
  const state =
    late.length > 0
      ? `${countWord(late.length, true)} ${late.length === 1 ? "letter is" : "letters are"} overdue, the longest by ${ageWords(late[0].overdueDays).toLowerCase()}.`
      : withClient.length > 0
        ? `${countWord(withClient.length, true)} ${withClient.length === 1 ? "letter is" : "letters are"} with the client to approve.`
        : "Nothing is overdue.";
  const blocks = letters.filter((l) => l.state !== "paid" || l.receipts.length > 0);

  const rows = (list: LetterView[]) =>
    list.map((l) => <LetterRow key={l.letterNo} letter={l} person={me.id} canRecord={finance} panel={panel} />);

  const additions = inScope(firm.additions, scope)
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <StaffBoard
        place="Money in"
        headline={headline}
        state={state}
        picture={blocks.length > 0 ? <ReceivableBlock letters={blocks} /> : undefined}
        pictureWords={blocks.length > 0 ? receivableWords(blocks) : undefined}
      />

      {!finance && accountant && (accountant.id === "divya" || accountant.id === "prakash") && (
        <div className="mt-6">
          <SeeAsLine words={`${accountant.name} records money in.`} person={{ id: accountant.id, first: accountant.first }} />
        </div>
      )}

      <div className="mt-10 grid gap-10">
        <Register title="With the client">
          {rows(withClient)}
        </Register>
        <Register title="Approved, waiting for the bank">{rows(waiting)}</Register>
        <Register title="Part paid">{rows(partPaid)}</Register>
        <Register title="Overdue">{rows(overdue)}</Register>
        <Register title="Paid this month">{rows(paid)}</Register>

        <details className="text-15">
          <summary className="link inline-flex min-h-11 cursor-pointer items-center">How overdue is counted</summary>
          <p className="max-w-[60ch] pt-1 text-ink-soft">
            A letter counts as overdue {OVERDUE_AFTER_DAYS} days after the client approves it, while the money has not all
            come in. The days shown are the days past that. <SampleTag />
          </p>
        </details>

        <div className="grid gap-3">
          <Register title="Hours bought" empty="No hours bought.">
            {additions.map((a) => {
              const request = firm.creditRequests.find((r) => r.projectId === a.projectId && r.at <= a.at);
              const id = request ? request.id : `add:${a.id}`;
              const project = firm.project(a.projectId);
              return (
                <RegisterRow
                  key={a.id}
                  id={id}
                  margin={ageWords(daysSince(a.at))}
                  title={
                    <>
                      <ProjectLink id={a.projectId} name={project?.name ?? a.projectId} className="py-3.5" />, {a.hours} hours
                    </>
                  }
                  sentence={`Received ${formatShortDate(a.receivedOn)}, ${a.reference}. Added by ${
                    firm.person(a.by)?.name ?? a.by
                  } ${formatStampShort(a.at)}. ${a.reason}`}
                  figure={beforeGstWords(a.amount)}
                  stamps={firm.stampsFor(id)}
                />
              );
            })}
          </Register>
          <p className="text-15 text-ink-soft">
            Hours are sold at {inr(HOUR_PRICE)} an hour before GST and paid outside the portal. <SampleTag />
          </p>
        </div>
      </div>
    </>
  );
}
