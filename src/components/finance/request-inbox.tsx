"use client";

import Link from "next/link";
import { RequestLadder } from "@/components/instruments/request-ladder";
import { useScope } from "@/components/register/project-switch";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { TODAY } from "@/lib/demo-data";
import { useFirm, useViewer } from "@/lib/demo-store";
import { ageWords, type RequestView } from "@/lib/firm";
import { WEEK } from "@/lib/firm-data";
import { countWord, datePart, formatShortDate } from "@/lib/format";
import { MarkSeen } from "./mark-seen";
import { inScope, procuresFor } from "./shared";

// Every material request from the sites, grouped by where it has got to: new, seen and
// waiting on a PO, ordered in part, ordered, and delivered this week. Each row says how
// long it has waited, when the site needs it, and draws its ladder. A new one is marked
// seen from here in one tap; the others open their page, where the Zoho PO is linked.

function upper(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Keeps a date or a phone number on one line when the sentence wraps. */
function whole(text: string): string {
  return text.replace(/ /g, "\u00a0");
}

function sentenceOf(r: RequestView, firm: ReturnType<typeof useFirm>): string {
  const raiser = firm.person(r.by);
  const who = `${raiser?.name ?? r.by}, ${whole(raiser?.phone ?? "")}`;
  const where = `${r.projectName}, milestone ${r.n}`;
  if (r.status === "Delivered")
    return `${where}. Ordered in ${r.pos.map((po) => `${po.no}, ${po.vendor}`).join("; ")}.`;
  if (r.status === "PO uploaded")
    return `${where}. ${r.pos.map((po) => `${po.no}, ${po.vendor}`).join("; ")}. Needed by ${whole(formatShortDate(r.neededBy))}.`;
  return `${where}. ${who}. Needed by ${whole(formatShortDate(r.neededBy))}.${r.stillToOrder ? ` ${upper(r.stillToOrder)}.` : ""}`;
}

export function RequestInbox() {
  const firm = useFirm();
  const me = useViewer("finance");
  const scope = useScope("finance");
  const all = inScope(
    firm.requests.filter((r) => !r.queued),
    scope,
  ).sort((a, b) => b.days - a.days || a.no.localeCompare(b.no));
  const by = (status: RequestView["status"]) => all.filter((r) => r.status === status);
  const fresh = by("New");
  const seen = by("Seen");
  const part = by("PO in part");
  const ordered = by("PO uploaded");
  const delivered = all.filter(
    (r) => r.status === "Delivered" && r.deliveredAt && datePart(r.deliveredAt) >= WEEK.previousFrom && datePart(r.deliveredAt) <= TODAY,
  );
  const waiting = fresh.length + seen.length + part.length;
  const late = [...fresh, ...seen, ...part].filter((r) => r.late).length;

  const headline =
    waiting === 0 ? "Every request has its PO." : `${waiting} ${waiting === 1 ? "request is" : "requests are"} waiting on a PO.`;
  const stateParts: string[] = [];
  if (fresh.length > 0) stateParts.push(`${countWord(fresh.length, true)} ${fresh.length === 1 ? "is" : "are"} not seen yet`);
  if (late > 0) stateParts.push(`${countWord(late)} ${late === 1 ? "is" : "are"} late for site`);
  const state = stateParts.length > 0 ? `${stateParts.join(", and ")}.` : "Nothing is late for site.";

  const row = (r: RequestView) => {
    const id = `mr:${r.no}`;
    const href = `/staff/finance/requests/${r.no}`;
    const canSee = r.status === "New" && procuresFor(me.id, firm.project(r.projectId));
    const title = `${r.no}, ${r.lineWords[0]}${r.lines.length > 1 ? ` and ${r.lines.length - 1} more` : ""}`;
    const open = r.status !== "Delivered";
    return (
      <RegisterRow
        key={r.no}
        id={id}
        margin={ageWords(r.days)}
        marginSub={r.late ? "Late for site" : undefined}
        overdue={r.late}
        title={
          canSee ? (
            <Link href={href} className="link inline-flex min-h-11 items-center">
              {title}
            </Link>
          ) : (
            title
          )
        }
        sentence={sentenceOf(r, firm)}
        instrument={open ? <RequestLadder status={r.status} stamps={firm.stampsFor(id)} late={r.late} /> : undefined}
        href={canSee ? undefined : href}
        action={canSee ? <MarkSeen no={r.no} person={me.id} /> : undefined}
        stamps={firm.stampsFor(id)}
      />
    );
  };

  return (
    <>
      <StaffBoard place="Requests" headline={headline} state={state} />
      <div className="mt-10 grid gap-10">
        <Register title="New" empty="No new requests.">
          {fresh.map(row)}
        </Register>
        <Register title="Seen, waiting on a PO">{seen.map(row)}</Register>
        <Register title="PO in part">{part.map(row)}</Register>
        <Register title="PO uploaded, with site">{ordered.map(row)}</Register>
        <Register title="Delivered this week">{delivered.map(row)}</Register>
      </div>
    </>
  );
}
