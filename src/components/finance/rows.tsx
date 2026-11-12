"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { StatusWord } from "@/components/register/status-word";
import { useFirm } from "@/lib/demo-store";
import { ageWords, daysSince, type LetterView, type PoView, type RevisionView, type StampView, type TurnItem } from "@/lib/firm";
import { TODAY } from "@/lib/demo-data";
import { WEEK, type PersonId, type ProjectId } from "@/lib/firm-data";
import { datePart, formatShortDate, inr } from "@/lib/format";
import { BillForm } from "./bill-form";
import { focusReturn } from "./focus-return";
import { MarkSeen } from "./mark-seen";
import { RecordPayment } from "./record-payment";
import { beforeGstWords, toCome, withGstWords } from "./shared";

// The rows the procurement and finance screens share: a request waiting on procurement,
// a demand letter waiting for money, a bill waiting to be entered, a cost revision. Each
// is a register row with at most one action; the action opens its panel inside the row.

/**
 * One panel open at a time on a page. Closing one backs out of the pause it started. The
 * control that opened it is kept, so when the panel closes on its own record, focus goes
 * back to that control, or to its row or register if the record took the control away.
 */
export function usePanel() {
  const pause = usePause();
  const [open, setOpen] = useState<string | null>(null);
  const opener = useRef<{ id: string; control: HTMLElement | null } | null>(null);
  const cancelFrom = (rowId: string | null) => {
    if (rowId !== null && pause.pending !== null && pause.pending.rowId === rowId) pause.cancel();
  };
  return {
    open,
    isOpen: (id: string) => open === id,
    /** Opens or closes a panel. Pass the button pressed, so focus can come back to it. */
    toggle: (id: string, control?: HTMLElement) => {
      cancelFrom(open);
      opener.current = { id, control: control ?? null };
      setOpen((current) => (current === id ? null : id));
    },
    /** For the panel itself, once it has recorded. */
    close: () => {
      const from = opener.current;
      opener.current = null;
      setOpen(null);
      if (from) focusReturn(from.control, from.id)();
    },
  };
}

export type Panel = ReturnType<typeof usePanel>;

/** A project name that opens its record. */
export function ProjectLink({ id, name, className = "" }: { id: ProjectId; name: string; className?: string }) {
  return (
    <Link href={`/staff/projects/${id}`} className={`link font-normal ${className}`}>
      {name}
    </Link>
  );
}

/** On a home, only what was stamped today: older history is on the row's own page. */
export function stampedToday(stamps: StampView[]): StampView[] {
  return stamps.filter((s) => datePart(s.at) === TODAY);
}

// ---- Requests ----

/** A request in procurement's own register: "Mark seen" on a new one; the others open their page. */
export function RequestTurnRow({ item, person }: { item: TurnItem; person: PersonId }) {
  const isNew = item.status?.[0] === "New";
  const late = item.status?.includes("Late for site");
  return (
    <RegisterRow
      id={item.id}
      margin={item.margin}
      marginSub={late ? "Late for site" : undefined}
      overdue={item.overdue}
      title={
        isNew ? (
          <Link href={item.href} className="link inline-flex min-h-11 items-center">
            {item.title}
          </Link>
        ) : (
          item.title
        )
      }
      sentence={item.sentence}
      href={isNew ? undefined : item.href}
      action={isNew ? <MarkSeen no={item.id.slice(3)} person={person} /> : undefined}
      stamps={item.stamps}
    />
  );
}

// ---- Letters ----

/** The one sentence under a letter: its status words once, the milestone, and what is still to come. */
export function letterSentence(l: LetterView) {
  const approved = l.approvedAt ? formatShortDate(datePart(l.approvedAt)) : "";
  if (l.state === "raised") return <>Milestone {l.n}. Raised {formatShortDate(datePart(l.raisedAt))}; the client approves it next.</>;
  if (l.state === "paid") {
    const last = l.receipts[l.receipts.length - 1];
    return (
      <>
        <StatusWord>Paid</StatusWord> in full{last ? ` on ${formatShortDate(last.on)}` : ""}. Milestone {l.n}.
      </>
    );
  }
  if (l.state === "part-paid")
    return (
      <>
        <StatusWord>Part paid</StatusWord>: {inr(l.received)} in, {inr(toCome(l))} still to come. Milestone {l.n}, approved{" "}
        {approved}.
      </>
    );
  if (l.overdueDays > 0) return <>Milestone {l.n}, approved {approved}. The bank has not paid it.</>;
  return (
    <>
      <StatusWord>Approved, waiting for the bank</StatusWord> since {approved}. Milestone {l.n}.
    </>
  );
}

/** The turn margin for a letter: whose turn, and how long. */
export function letterMargin(l: LetterView): { margin: string; marginSub?: string; client?: boolean; overdue?: boolean } {
  if (l.state === "raised") return { margin: "With client", marginSub: ageWords(l.days), client: true };
  if (l.state === "paid") {
    // The sentence already says Paid: the margin says how long ago the last money came.
    const last = l.receipts[l.receipts.length - 1];
    return { margin: last ? ageWords(daysSince(last.on)) : ageWords(l.days) };
  }
  if (l.overdueDays > 0) return { margin: "Overdue", marginSub: ageWords(l.overdueDays), overdue: true };
  return { margin: ageWords(l.days) };
}

/** A demand letter. With finance access, an open one carries "Record payment". */
export function LetterRow({
  letter,
  person,
  canRecord,
  panel,
  todayOnly = false,
}: {
  letter: LetterView;
  person: PersonId;
  canRecord: boolean;
  panel: Panel;
  /** As a home shows it: only the stamps made today, and the amount in the sentence so the title keeps its width. */
  todayOnly?: boolean;
}) {
  const firm = useFirm();
  const id = `pay:${letter.projectId}:${letter.n}`;
  const open = panel.isOpen(id);
  const recordable = canRecord && (letter.state === "approved" || letter.state === "part-paid");
  return (
    <RegisterRow
      id={id}
      {...letterMargin(letter)}
      title={
        <>
          <ProjectLink id={letter.projectId} name={letter.projectName} className="py-3.5" />, letter{" "}
          {letter.short}
        </>
      }
      sentence={
        todayOnly ? (
          <>
            {withGstWords(letter.total)}. {letterSentence(letter)}
          </>
        ) : (
          letterSentence(letter)
        )
      }
      figure={todayOnly ? undefined : withGstWords(letter.total)}
      stamps={todayOnly ? stampedToday(firm.stampsFor(id)) : firm.stampsFor(id)}
      action={
        recordable ? (
          <button
            type="button"
            className="btn btn-quiet"
            aria-expanded={open}
            onClick={(event) => panel.toggle(id, event.currentTarget)}
          >
            {open ? "Close" : "Record payment"}
          </button>
        ) : undefined
      }
    >
      {open && recordable && <RecordPayment letter={letter} person={person} onDone={panel.close} />}
    </RegisterRow>
  );
}

// ---- Bills ----

/** A PO whose bill has reached the office. With finance access it carries "Enter bill". */
export function BillTurnRow({
  item,
  po,
  person,
  canEnter,
  panel,
  withWho = "the accountant",
}: {
  item: TurnItem;
  po: PoView;
  person: PersonId;
  canEnter: boolean;
  panel: Panel;
  /** Whose turn it is when this viewer cannot enter it: "Divya". */
  withWho?: string;
}) {
  const open = panel.isOpen(item.id);
  return (
    <RegisterRow
      id={item.id}
      margin={canEnter ? item.margin : `With ${withWho}`}
      marginSub={canEnter ? undefined : item.margin}
      title={item.title}
      sentence={`${item.sentence} ${beforeGstWords(po.amount)}.`}
      stamps={item.stamps}
      action={
        canEnter ? (
          <button
            type="button"
            className="btn btn-quiet"
            aria-expanded={open}
            onClick={(event) => panel.toggle(item.id, event.currentTarget)}
          >
            {open ? "Close" : "Enter bill"}
          </button>
        ) : undefined
      }
    >
      {open && canEnter && <BillForm person={person} preset={po} onDone={panel.close} />}
    </RegisterRow>
  );
}

// ---- Cost revisions ----

/** Revisions raised or decided since last Monday, and any still with the client. */
export function recentRevisions(revisions: RevisionView[], scope: ProjectId | "all"): RevisionView[] {
  return revisions
    .filter((r) => scope === "all" || r.projectId === scope)
    .filter((r) => r.status !== "approved" || datePart(r.raisedAt) >= WEEK.previousFrom)
    .filter((r) => datePart(r.raisedAt) >= WEEK.previousFrom || r.status === "with-client" || r.status === "changes-asked")
    .sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));
}

/** "Cost revisions this week": what changed, or may change, a contract value. */
export function RevisionRegister({
  scope,
  title = "Cost revisions this week",
  todayOnly = false,
  limit,
}: {
  scope: ProjectId | "all";
  title?: string;
  todayOnly?: boolean;
  limit?: number;
}) {
  const firm = useFirm();
  const rows = recentRevisions(firm.revisions, scope);
  return (
    <Register title={title} empty="No cost revisions this week." limit={limit}>
      {rows.map((r) => {
        const project = firm.project(r.projectId);
        const client = project?.clientWord ?? "client";
        const days = daysSince(r.raisedAt);
        const margin =
          r.status === "with-client"
            ? { margin: `With ${client}`, marginSub: ageWords(days), client: true }
            : r.status === "changes-asked"
              ? { margin: `With ${firm.person(project?.team.head ?? "vikram")?.first ?? "the Project Head"}`, marginSub: ageWords(days) }
              : { margin: ageWords(days) };
        const sentence =
          r.status === "approved" ? (
            <>
              <StatusWord>Approved</StatusWord>
              {r.addendum ? `, ${r.addendum}` : ""}, +{beforeGstWords(r.amount)}. {project?.name} is now{" "}
              {beforeGstWords(project?.contractValue ?? 0)}.
            </>
          ) : r.status === "changes-asked" ? (
            <>
              {client === "Meera" ? "Meera" : "The client"} asked for changes to +{beforeGstWords(r.amount)}. {project?.name}.
            </>
          ) : (
            <>
              {project?.name}. +{beforeGstWords(r.amount)} and {r.days} days.
              {r.heldUntil ? ` Price held until ${formatShortDate(r.heldUntil)}.` : ""}
            </>
          );
        return (
          <RegisterRow
            key={r.id}
            id={`rev:${r.id}`}
            {...margin}
            title={`${r.id}, ${r.item.charAt(0).toLowerCase()}${r.item.slice(1)}`}
            sentence={sentence}
            href={`/staff/projects/${r.projectId}`}
            stamps={todayOnly ? stampedToday(firm.stampsFor(`rev:${r.id}`)) : firm.stampsFor(`rev:${r.id}`)}
          />
        );
      })}
    </Register>
  );
}

/** Letters a person may see, with the ones paid this month kept for the record. */
export function lettersOpenOrPaidThisMonth(letters: LetterView[]): LetterView[] {
  return letters.filter(
    (l) => l.state !== "paid" || l.receipts.some((r) => r.on >= `${WEEK.from.slice(0, 7)}-01` && r.reference !== "Earlier payment"),
  );
}
