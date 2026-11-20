/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import {
  SEED_FEE_RULE,
  seedDeskEvents,
  type ClientRequestBody,
  type FeeQuote,
  type FeeRule,
  type SeedDeskEvent,
} from "./bd-data";
import type { FirmEvent, PersonId, ProjectId } from "./firm-data";
import type { Tone } from "./portal";

// Client requests for architect time (more advisory hours, a design change) and the fee that
// follows. They go to the Project Head, not BD: the head approves or declines; an approval
// works the fee out at once from the admin's rate (hours x rate, plus GST); the client approves
// the fee; finance bills it and records the money. Either side can escalate a request to the
// client's BD person, who settles it (and may waive the fee). Pure; no clock.

/** Seed and tab events in one list, oldest first, for the derivations here and in desk.ts. */
export type DeskEvent = FirmEvent | SeedDeskEvent;

const SORTED_SEED: SeedDeskEvent[] = [...seedDeskEvents].sort((a, b) => (a.at === b.at ? 0 : a.at < b.at ? -1 : 1));

/**
 * The seed (by time), then the tab's events in the order they were recorded. Every seed fact is
 * older than the tab, and a tab stamp is TODAY plus the browser's clock, so sorting the tab by
 * stamp could put an approval before its request (just after midnight, say).
 */
export function deskEvents(events: FirmEvent[]): DeskEvent[] {
  return [...SORTED_SEED, ...events];
}

/** The admin's fee rule as it stands. */
export function feeRuleOf(events: FirmEvent[]): FeeRule & { setAt?: string; setBy?: PersonId } {
  let rule: FeeRule & { setAt?: string; setBy?: PersonId } = { ...SEED_FEE_RULE };
  for (const e of events) {
    if (e.kind === "fee-rule.set")
      rule = { ...rule, ratePerHour: e.ratePerHour, minChangeHours: e.minChangeHours, setAt: e.at, setBy: e.by };
  }
  return rule;
}

/** The fee for some hours under a rule: hours x rate, plus GST (rounded to the rupee). */
export function quoteFee(hours: number, rule: FeeRule): FeeQuote {
  const amount = Math.round(hours * rule.ratePerHour);
  const gst = Math.round(amount * rule.gstRate);
  return { hours, rate: rule.ratePerHour, amount, gst, total: amount + gst };
}

/** The hours a request is charged: what was asked (hours), at least the minimum for a design change. */
export function chargedHours(type: ClientRequestBody["type"], hours: number, rule: FeeRule): number {
  const h = Math.max(0, Math.round(hours * 2) / 2);
  return type === "design-change" ? Math.max(h, rule.minChangeHours) : h;
}

export type ClientRequestStatus =
  | "with-head"
  | "declined"
  | "fee-with-client"
  | "fee-declined"
  | "to-bill"
  | "billed"
  | "paid"
  | "waived";

export const REQUEST_STATUS_WORDS: Record<ClientRequestStatus, string> = {
  "with-head": "With Project Head",
  declined: "Declined",
  "fee-with-client": "Fee with client",
  "fee-declined": "Fee declined",
  "to-bill": "To bill",
  billed: "Billed",
  paid: "Paid",
  waived: "Fee waived",
};

const REQUEST_TONE: Record<ClientRequestStatus, Tone> = {
  "with-head": "waiting",
  declined: "locked",
  "fee-with-client": "waiting",
  "fee-declined": "locked",
  "to-bill": "progress",
  billed: "progress",
  paid: "done",
  waived: "done",
};

export type FeeView = FeeQuote & {
  requestId: string;
  projectId: ProjectId;
  generatedAt: string;
  generatedBy: PersonId;
  state: "with-client" | "approved" | "declined" | "billed" | "paid" | "waived";
  approvedAt?: string;
  declinedAt?: string;
  billedAt?: string;
  billedBy?: PersonId;
  /** When BD kept a fee the client had declined, so it went back to her. */
  resentAt?: string;
  invoiceNo?: string;
  receivedAt?: string;
  receivedOn?: string;
  reference?: string;
};

export type EscalationView = {
  to: PersonId;
  by: PersonId;
  at: string;
  reason: string;
  settledAt?: string;
  settledBy?: PersonId;
  note?: string;
  waived?: boolean;
  open: boolean;
};

export type ClientRequestView = ClientRequestBody & {
  raisedAt: string;
  raisedBy: PersonId;
  /** The client's name: who asked. */
  askedBy: string;
  /** The Project Head it is routed to. */
  head: PersonId;
  status: ClientRequestStatus;
  statusWords: string;
  tone: Tone;
  decidedAt?: string;
  decidedBy?: PersonId;
  declineReason?: string;
  /** The head's note on approval. */
  headNote?: string;
  /** BD waived the fee before the head decided: the head's approval charges nothing. */
  feeWaived?: boolean;
  /** When the hours (or the change) were given: the fee received or waived, or nothing to pay. */
  granted?: { at: string; eventId: string };
  fee: FeeView | null;
  escalation: EscalationView | null;
  /** Who acts next. */
  waitingOn: "head" | "client" | "finance" | "bd" | null;
  /** When that wait began. */
  waitingSince: string | null;
  open: boolean;
};

type ProjectFacts = (id: ProjectId) => { head: PersonId; client: string } | undefined;

/** Every client request, seed and tab, newest first. */
export function deriveClientRequests(all: DeskEvent[], facts: ProjectFacts): ClientRequestView[] {
  const map = new Map<string, ClientRequestView>();
  const order: string[] = [];
  for (const e of all) {
    if (e.kind === "client-request.raised") {
      if (map.has(e.request.id)) continue;
      const f = facts(e.request.projectId);
      map.set(e.request.id, {
        ...e.request,
        raisedAt: e.at,
        raisedBy: e.by,
        askedBy: e.request.askedBy ?? f?.client ?? "Client",
        head: f?.head ?? "vikram",
        status: "with-head",
        statusWords: "",
        tone: "waiting",
        fee: null,
        escalation: null,
        waitingOn: "head",
        waitingSince: e.at,
        open: true,
      });
      order.push(e.request.id);
      continue;
    }
    if (!("requestId" in e)) continue;
    const r = map.get(e.requestId);
    if (!r) continue;
    switch (e.kind) {
      case "client-request.approved":
        if (r.status !== "with-head") break;
        r.decidedAt = e.at;
        r.decidedBy = e.by;
        r.headNote = e.note;
        r.fee = { ...e.fee, requestId: r.id, projectId: r.projectId, generatedAt: e.at, generatedBy: e.by, state: "with-client" };
        if (r.feeWaived || e.fee.total <= 0) {
          // Nothing to pay: given at once.
          r.fee.state = r.feeWaived ? "waived" : "paid";
          r.status = r.feeWaived ? "waived" : "paid";
          r.granted = { at: e.at, eventId: e.id };
        } else r.status = "fee-with-client";
        break;
      case "client-request.declined":
        // The head declines a request, or closes one whose fee the client turned down.
        if (r.status !== "with-head" && r.status !== "fee-declined") break;
        if (r.status === "with-head") {
          r.decidedAt = e.at;
          r.decidedBy = e.by;
        }
        r.declineReason = e.reason;
        r.status = "declined";
        break;
      case "client-request.escalated":
        r.escalation = { to: e.to, by: e.by, at: e.at, reason: e.reason, open: true };
        break;
      case "client-request.settled":
        if (!r.escalation?.open) break;
        r.escalation = { ...r.escalation, settledAt: e.at, settledBy: e.by, note: e.note, waived: e.waived, open: false };
        if (e.waived) {
          if (r.fee && r.fee.state !== "paid") {
            // The fee is waived: the hours (or the change) are given free.
            r.fee.state = "waived";
            r.status = "waived";
            r.granted = { at: e.at, eventId: e.id };
          } else if (!r.fee && r.status === "with-head") {
            // Before the head decided: back to the head, whose approval now charges nothing.
            r.feeWaived = true;
          }
        } else if (r.status === "fee-declined" && r.fee) {
          // BD keeps the fee the client turned down: it goes back to her.
          r.fee.state = "with-client";
          r.fee.declinedAt = undefined;
          r.fee.resentAt = e.at;
          r.status = "fee-with-client";
        }
        break;
      case "fee.approved":
        if (r.fee?.state !== "with-client") break;
        r.fee.state = "approved";
        r.fee.approvedAt = e.at;
        r.status = "to-bill";
        break;
      case "fee.declined":
        if (r.fee?.state !== "with-client") break;
        r.fee.state = "declined";
        r.fee.declinedAt = e.at;
        r.status = "fee-declined";
        break;
      case "fee.billed":
        if (r.fee?.state !== "approved") break;
        r.fee.state = "billed";
        r.fee.billedAt = e.at;
        r.fee.billedBy = e.by;
        r.fee.invoiceNo = e.invoiceNo;
        r.status = "billed";
        break;
      case "fee.received":
        if (r.fee?.state !== "billed") break;
        r.fee.state = "paid";
        r.fee.receivedAt = e.at;
        r.fee.receivedOn = e.on;
        r.fee.reference = e.reference;
        r.status = "paid";
        r.granted = { at: e.at, eventId: e.id };
        break;
      default:
        break;
    }
  }
  return order
    .map((id) => map.get(id))
    .filter((r): r is ClientRequestView => !!r)
    .map((r) => {
      const escalated = !!r.escalation?.open;
      // A fee the client declined goes back to the head: escalate it to BD, or close it.
      const waitingOn: ClientRequestView["waitingOn"] = escalated
        ? "bd"
        : r.status === "with-head" || r.status === "fee-declined"
          ? "head"
          : r.status === "fee-with-client"
            ? "client"
            : r.status === "to-bill"
              ? "finance"
              : r.status === "billed"
                ? "client"
                : null;
      const waitingSince = escalated
        ? (r.escalation?.at ?? null)
        : r.status === "with-head"
          ? r.raisedAt
          : r.status === "fee-declined"
            ? (r.fee?.declinedAt ?? null)
            : r.status === "fee-with-client"
              ? (r.fee?.resentAt ?? r.fee?.generatedAt ?? null)
              : r.status === "to-bill"
                ? (r.fee?.approvedAt ?? null)
                : r.status === "billed"
                  ? (r.fee?.billedAt ?? null)
                  : null;
      return {
        ...r,
        statusWords: escalated ? "Escalated" : REQUEST_STATUS_WORDS[r.status],
        tone: escalated ? "late" : REQUEST_TONE[r.status],
        waitingOn,
        waitingSince,
        open: waitingOn !== null,
      };
    })
    .sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));
}

/**
 * Hours given in this tab on an hours request: the fee received, waived by BD, or nothing to
 * pay. They join the project's pool. `eventId` is the tab event that gave them.
 */
export function hoursBoughtInTab(
  events: FirmEvent[],
): { projectId: ProjectId; requestId: string; hours: number; at: string; eventId: string }[] {
  const tab = new Set(events.map((e) => e.id));
  return deriveClientRequests(deskEvents(events), () => undefined)
    .filter((r) => r.type === "hours" && r.fee && r.granted && tab.has(r.granted.eventId))
    .map((r) => ({
      projectId: r.projectId,
      requestId: r.id,
      hours: r.fee?.hours ?? r.hours ?? 0,
      at: r.granted?.at ?? r.raisedAt,
      eventId: r.granted?.eventId ?? "",
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** The next architect-fee invoice number, after every one given out. */
export function nextFeeInvoiceNo(requests: ClientRequestView[]): string {
  const prefix = "PD/AF/2026-27/";
  const top = requests
    .map((r) => r.fee?.invoiceNo ?? "")
    .filter((no) => no.startsWith(prefix))
    .reduce((max, no) => Math.max(max, Number(no.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(top + 1).padStart(4, "0")}`;
}
