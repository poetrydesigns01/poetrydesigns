/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { NPS_DESIGN, NPS_HANDOVER, seedDeskEvents, seedProspects, type DeskEventKind } from "./bd-data";
import type { FirmEvent, LogEntry, PersonId, ProjectId } from "./firm-data";
import { hours, inr } from "./format";

// The record log's line for the BD and architect refinement events (bd-data.ts). Kept apart
// so projection.ts only hands over its name helpers.

const DESK_KINDS = new Set<string>([
  "prospect.registered",
  "prospect.edited",
  "prospect.level-set",
  "prospect.dropped",
  "prospect.reopened",
  "prospect.reassigned",
  "prospect.converted",
  "client-request.raised",
  "client-request.approved",
  "client-request.declined",
  "client-request.escalated",
  "client-request.settled",
  "fee.approved",
  "fee.declined",
  "fee.billed",
  "fee.received",
  "fee-rule.set",
  "nps.answered",
  "project.architect-invited",
  "project.architect-assigned",
  "project.architect-removed",
  "project.thumbnail-set",
] satisfies DeskEventKind[]);

export function isDeskEvent(event: FirmEvent): event is Extract<FirmEvent, { kind: DeskEventKind }> {
  return DESK_KINDS.has(event.kind);
}

type Words = Pick<LogEntry, "action"> & Partial<Pick<LogEntry, "projectId" | "reason" | "detail">>;

/** The words of a refinement event in the record, or null for another kind. */
export function deskLogWords(
  event: FirmEvent,
  events: FirmEvent[],
  projectName: (id: ProjectId) => string,
  name: (id: PersonId) => string,
): Words | null {
  if (!isDeskEvent(event)) return null;
  const requestTitle = (id: string) => {
    for (const e of [...seedDeskEvents, ...events])
      if (e.kind === "client-request.raised" && e.request.id === id) return e.request.title.toLowerCase();
    return "a request";
  };
  const prospectName = (id: string) => {
    const seeded = seedProspects.find((p) => p.id === id);
    if (seeded) return seeded.enquiry.owner;
    for (const e of events) if (e.kind === "prospect.registered" && e.prospect.id === id) return e.prospect.enquiry.owner;
    return `prospect ${id}`;
  };
  switch (event.kind) {
    case "prospect.registered":
      return { action: `Registered an enquiry from ${event.prospect.enquiry.owner}.` };
    case "prospect.edited":
      return { action: `Edited the enquiry from ${prospectName(event.prospectId)}.` };
    case "prospect.level-set":
      return { action: `Moved ${prospectName(event.prospectId)} to level ${event.level}.`, detail: event.note || undefined };
    case "prospect.dropped":
      return { action: `Marked ${prospectName(event.prospectId)} dropped.`, reason: event.reason };
    case "prospect.reopened":
      return { action: `Reopened ${prospectName(event.prospectId)}.`, reason: event.note || undefined };
    case "prospect.reassigned":
      return { action: `Gave ${prospectName(event.prospectId)} to ${name(event.to)} from ${name(event.from)}.`, reason: event.reason };
    case "prospect.converted":
      return {
        action: `Signed up ${prospectName(event.prospectId)}, ${inr(event.signUp.amount)} received.`,
        detail: event.signUp.reference || undefined,
      };
    case "client-request.raised":
      return {
        projectId: event.request.projectId,
        action:
          event.request.type === "hours"
            ? `Asked for ${hours(event.request.hours ?? 0)} more of advisory time.`
            : `Asked for a design change: ${event.request.title.toLowerCase()}.`,
        detail: event.request.note || undefined,
      };
    case "client-request.approved":
      return {
        projectId: event.projectId,
        action: `Approved ${requestTitle(event.requestId)}: ${hours(event.fee.hours)}, fee ${inr(event.fee.total)} with GST.`,
        detail: event.note || undefined,
      };
    case "client-request.declined":
      return { projectId: event.projectId, action: `Declined ${requestTitle(event.requestId)}.`, reason: event.reason };
    case "client-request.escalated":
      return { projectId: event.projectId, action: `Escalated ${requestTitle(event.requestId)} to ${name(event.to)}.`, reason: event.reason };
    case "client-request.settled":
      return {
        projectId: event.projectId,
        action: `Settled ${requestTitle(event.requestId)}${event.waived ? ", fee waived" : ""}.`,
        detail: event.note || undefined,
      };
    case "fee.approved":
      return { projectId: event.projectId, action: `Approved the fee for ${requestTitle(event.requestId)}.` };
    case "fee.declined":
      return { projectId: event.projectId, action: `Declined the fee for ${requestTitle(event.requestId)}.`, reason: event.reason || undefined };
    case "fee.billed":
      return { projectId: event.projectId, action: `Billed ${requestTitle(event.requestId)}, invoice ${event.invoiceNo}.` };
    case "fee.received":
      return { projectId: event.projectId, action: `Recorded the fee for ${requestTitle(event.requestId)} received.`, detail: event.reference || undefined };
    case "fee-rule.set":
      return { action: `Set the architect fee to ${inr(event.ratePerHour)} an hour, at least ${hours(event.minChangeHours)} a change.`, reason: event.reason || undefined };
    case "nps.answered":
      return {
        projectId: event.projectId,
        // "Milestone 4" as the home card says it: in a client record line "milestone N" reads as an instalment.
        action: `Scored ${event.score} out of 10 after ${
          event.milestone === NPS_DESIGN ? "the design" : event.milestone === NPS_HANDOVER ? "handover" : `Milestone ${event.milestone}`
        }.`,
        detail: event.comment || undefined,
      };
    case "project.architect-invited":
      return { projectId: event.projectId, action: `Invited ${name(event.personId)} to ${projectName(event.projectId)}.`, detail: event.note || undefined };
    case "project.architect-assigned":
      return {
        projectId: event.projectId,
        action:
          event.by === event.personId
            ? `Joined ${projectName(event.projectId)}.`
            : `Put ${name(event.personId)} on ${projectName(event.projectId)}.`,
      };
    case "project.architect-removed":
      return { projectId: event.projectId, action: `Took ${name(event.personId)} off ${projectName(event.projectId)}.`, reason: event.reason || undefined };
    case "project.thumbnail-set":
      return { projectId: event.projectId, action: event.dataUrl ? `Set the picture of ${projectName(event.projectId)}.` : `Took the picture off ${projectName(event.projectId)}.` };
  }
}
