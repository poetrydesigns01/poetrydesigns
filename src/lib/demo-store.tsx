/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useMemo } from "react";
import type { ClientRequestType, Enquiry, FeeQuote, ProspectLevel } from "./bd-data";
import {
  getDemoSnapshot,
  projectionOf,
  useDemo as useCoreDemo,
  useDemoState,
  type DemoState,
  type NewEvent,
} from "./demo-core";
import { TODAY } from "./demo-data";
import type { DuplicateView } from "./desk";
import { deriveFirm, type Firm } from "./firm";
import { BLANK_DRAFT_IDS, people, type DraftId, type Person, type PersonId, type ProjectId, type StaffRole } from "./firm-data";
import { emailKey, phoneKey } from "./prospects";

// The tab's demo state, its writers and the projection live in demo-core.tsx, which the
// sign-in page imports on its own. This module adds the firm's registers, which only the
// portal's screens need, the BD and architect writers that check them first, and passes
// everything else on unchanged.
export {
  DEMO_STORAGE_KEY,
  getDemoSnapshot,
  resetDemo,
  setStorageKey,
  useProjection,
  useStoreReady,
  type DemoSession,
  type DemoState,
  type FirmEvent,
  type NewEvent,
} from "./demo-core";

// Every screen reads the same firm, so it is worked out once per state.
let firmed: { state: DemoState; value: Firm } | null = null;

function firmOf(state: DemoState): Firm {
  if (firmed?.state !== state) {
    firmed = { state, value: deriveFirm(state, projectionOf(state)) };
  }
  return firmed.value;
}

/** Everything the staff screens show: registers, money, people and the record. */
export function useFirm(): Firm {
  const state = useDemoState();
  return useMemo(() => firmOf(state), [state]);
}

/** The person a staff role is being viewed as. BD is always Rohan and admin always Shalini. */
export function useViewer(role: StaffRole): Person {
  const state = useDemoState();
  const firm = useFirm();
  const id: PersonId =
    role === "bd" ? "rohan" : role === "admin" ? "shalini" : state.viewers[role];
  return firm.person(id) ?? people.find((p) => p.id === id) ?? people[0];
}

// ---- BD and architect writers (bd-data.ts events) ----

/** What the enquiry form hands over; `capture` defaults to "office", `enquiredOn` to TODAY. */
export type EnquiryInput = Omit<Enquiry, "capture" | "enquiredOn"> & Partial<Pick<Enquiry, "capture" | "enquiredOn">>;

export type RegisterResult =
  | { ok: true; id: string }
  | { ok: false; reason: "duplicate"; duplicate: DuplicateView }
  | { ok: false; reason: "missing" };

export type ConvertResult = { ok: true; draftId: DraftId } | { ok: false; reason: "not-active" | "draft-busy" };

/** The writers: each checks the firm as it stands, records one event and says what happened. Handlers only. */
function deskWriters(record: (event: NewEvent) => void) {
  const firm = () => firmOf(getDemoSnapshot());
  const request = (id: string) => firm().clientRequest(id);
  return {
    /** Registers an enquiry unless its phone or email is held (12 months). The admin alone reassigns a held lead. */
    registerProspect: (enquiry: EnquiryInput, by: PersonId = "rohan", advisor: PersonId = by): RegisterResult => {
      const f = firm();
      if (!enquiry.owner.trim() || (!phoneKey(enquiry.phone) && !emailKey(enquiry.email))) return { ok: false, reason: "missing" };
      const duplicate = f.findDuplicate(enquiry.phone, enquiry.email);
      if (duplicate) return { ok: false, reason: "duplicate", duplicate };
      const id = f.nextProspectId;
      record({
        kind: "prospect.registered",
        prospect: {
          id,
          advisor,
          enquiry: { capture: "office", enquiredOn: TODAY, ...enquiry, owner: enquiry.owner.trim(), email: enquiry.email.trim() },
        },
        by,
      });
      return { ok: true, id };
    },
    /** Changes enquiry fields; a new phone or email is checked against everyone else. */
    editProspect: (prospectId: string, patch: Partial<Enquiry>, by: PersonId = "rohan"): RegisterResult => {
      const f = firm();
      const p = f.prospect(prospectId);
      if (!p) return { ok: false, reason: "missing" };
      if (patch.phone !== undefined || patch.email !== undefined) {
        const duplicate = f.findDuplicate(patch.phone ?? p.phone, patch.email ?? p.email, TODAY, prospectId);
        if (duplicate) return { ok: false, reason: "duplicate", duplicate };
      }
      record({ kind: "prospect.edited", prospectId, patch, by });
      return { ok: true, id: prospectId };
    },
    setProspectLevel: (prospectId: string, level: ProspectLevel, by: PersonId = "rohan", note?: string): boolean => {
      const p = firm().prospect(prospectId);
      if (!p || p.status !== "active" || p.level === level) return false;
      record({ kind: "prospect.level-set", prospectId, level, note: note?.trim() || undefined, by });
      return true;
    },
    dropProspect: (prospectId: string, reason: string, by: PersonId = "rohan"): boolean => {
      const p = firm().prospect(prospectId);
      if (!p || p.status !== "active" || !reason.trim()) return false;
      record({ kind: "prospect.dropped", prospectId, reason: reason.trim(), by });
      return true;
    },
    /** Admin only: gives a lead to another BD person. A dropped lead comes back into discussion with them. */
    reassignProspect: (prospectId: string, to: PersonId, reason: string, by: PersonId = "shalini"): boolean => {
      const f = firm();
      const p = f.prospect(prospectId);
      if (!p || p.status === "converted" || f.person(by)?.role !== "admin" || p.advisor === to || f.person(to)?.role !== "bd") return false;
      record({ kind: "prospect.reassigned", prospectId, from: p.advisor, to, reason: reason.trim(), by });
      return true;
    },
    /** A dropped lead back in discussion with whoever holds it: its advisor, or the admin. */
    reopenProspect: (prospectId: string, by: PersonId = "rohan", note?: string): boolean => {
      const f = firm();
      const p = f.prospect(prospectId);
      if (!p || p.status !== "dropped" || (p.advisor !== by && f.person(by)?.role !== "admin")) return false;
      record({ kind: "prospect.reopened", prospectId, note: note?.trim() || undefined, by });
      return true;
    },
    /** The prospect paid the sign-up: they move to onboarding, on the first blank draft, pre-filled from the enquiry. */
    convertProspect: (
      prospectId: string,
      signUp: { amount: number; on: string; reference: string },
      by: PersonId = "rohan",
    ): ConvertResult => {
      const f = firm();
      const p = f.prospect(prospectId);
      if (!p || p.status !== "active") return { ok: false, reason: "not-active" };
      const draft = BLANK_DRAFT_IDS.map((id) => f.drafts.find((d) => d.id === id)).find(
        (d) => d && !d.opened && d.stepsDone === 0 && !d.startedAt && !d.fromProspect,
      );
      if (!draft) return { ok: false, reason: "draft-busy" };
      record({ kind: "prospect.converted", prospectId, draftId: draft.id, signUp, by });
      return { ok: true, draftId: draft.id };
    },

    /** The client asks for more advisory hours or a design change; it goes to the Project Head. */
    raiseClientRequest: (
      projectId: ProjectId,
      type: ClientRequestType,
      body: { hours?: number; title?: string; note?: string; askedBy?: string },
      by: PersonId = "meera",
    ): string => {
      const id = `req-${projectId}-e${getDemoSnapshot().events.length + 1}`;
      const hours = type === "hours" ? Math.max(0.5, body.hours ?? 1) : body.hours;
      record({
        kind: "client-request.raised",
        request: {
          id,
          projectId,
          type,
          hours,
          title: body.title?.trim() || (type === "hours" ? `${hours} more advisory hours` : "Design change"),
          note: body.note?.trim() || undefined,
          askedBy: body.askedBy,
        },
        by,
      });
      return id;
    },
    /** The Project Head approves: the fee is worked out now from the admin's rate and goes to the client. */
    approveClientRequest: (requestId: string, hours: number, by: PersonId, note?: string): FeeQuote | null => {
      const f = firm();
      const r = f.clientRequest(requestId);
      if (!r || r.status !== "with-head") return null;
      const fee = f.quoteFee(r.type, hours);
      record({ kind: "client-request.approved", projectId: r.projectId, requestId, fee, note: note?.trim() || undefined, by });
      return fee;
    },
    /** The head declines a request, or closes one whose fee the client declined. */
    declineClientRequest: (requestId: string, reason: string, by: PersonId): boolean => {
      const r = request(requestId);
      if (!r || r.escalation?.open || (r.status !== "with-head" && r.status !== "fee-declined")) return false;
      record({ kind: "client-request.declined", projectId: r.projectId, requestId, reason: reason.trim(), by });
      return true;
    },
    /** A commercial question: to the client's BD person. */
    escalateClientRequest: (requestId: string, reason: string, by: PersonId): boolean => {
      const f = firm();
      const r = f.clientRequest(requestId);
      if (!r || !r.open || r.escalation?.open) return false;
      record({ kind: "client-request.escalated", projectId: r.projectId, requestId, to: f.advisorOf(r.projectId), reason: reason.trim(), by });
      return true;
    },
    /** BD closes an escalation, waiving the fee or not. */
    settleEscalation: (requestId: string, note: string, waived: boolean, by: PersonId = "rohan"): boolean => {
      const r = request(requestId);
      if (!r?.escalation?.open) return false;
      record({ kind: "client-request.settled", projectId: r.projectId, requestId, note: note.trim(), waived, by });
      return true;
    },
    approveFee: (requestId: string, by: PersonId = "meera"): boolean => {
      const r = request(requestId);
      if (r?.fee?.state !== "with-client") return false;
      record({ kind: "fee.approved", projectId: r.projectId, requestId, by });
      return true;
    },
    declineFee: (requestId: string, reason?: string, by: PersonId = "meera"): boolean => {
      const r = request(requestId);
      if (r?.fee?.state !== "with-client") return false;
      record({ kind: "fee.declined", projectId: r.projectId, requestId, reason: reason?.trim() || undefined, by });
      return true;
    },
    /** Finance raises the invoice; returns its number. */
    billFee: (requestId: string, by: PersonId = "divya"): string | null => {
      const f = firm();
      const r = f.clientRequest(requestId);
      if (r?.fee?.state !== "approved") return null;
      const invoiceNo = f.nextFeeInvoiceNo;
      record({ kind: "fee.billed", projectId: r.projectId, requestId, invoiceNo, by });
      return invoiceNo;
    },
    /** The money is in; hours bought join the project's pool. */
    receiveFee: (requestId: string, reference: string, on: string = TODAY, by: PersonId = "divya"): boolean => {
      const r = request(requestId);
      if (r?.fee?.state !== "billed") return false;
      record({ kind: "fee.received", projectId: r.projectId, requestId, reference: reference.trim(), on, by });
      return true;
    },
    /** Admin, in Setup: the architect fee an hour (before GST) and the least hours a design change costs. */
    setFeeRule: (ratePerHour: number, minChangeHours: number, reason?: string, by: PersonId = "shalini"): boolean => {
      if (!(ratePerHour > 0) || !(minChangeHours >= 0)) return false;
      record({ kind: "fee-rule.set", ratePerHour: Math.round(ratePerHour), minChangeHours, reason: reason?.trim() || undefined, by });
      return true;
    },

    /** The client answers the NPS question (0 to 10) for the point waiting, or the one given. */
    answerNps: (projectId: ProjectId, score: number, comment?: string, milestone?: number, by: PersonId = "meera"): boolean => {
      const point = milestone ?? firm().npsAsk(projectId)?.milestone;
      if (point === undefined || !(score >= 0 && score <= 10)) return false;
      record({ kind: "nps.answered", projectId, score: Math.round(score), comment: comment?.trim() || undefined, milestone: point, by });
      return true;
    },

    /** The Project Head invites an architect onto a project; they accept with assignArchitect(..., themselves). */
    inviteArchitect: (projectId: ProjectId, personId: PersonId, by: PersonId, note?: string): boolean => {
      const team = firm().architectTeam(projectId);
      if (team.members.some((m) => m.personId === personId) || team.head === personId) return false;
      record({ kind: "project.architect-invited", projectId, personId, note: note?.trim() || undefined, by });
      return true;
    },
    assignArchitect: (projectId: ProjectId, personId: PersonId, by: PersonId): boolean => {
      const team = firm().architectTeam(projectId);
      if (team.members.some((m) => m.personId === personId && m.state === "assigned")) return false;
      record({ kind: "project.architect-assigned", projectId, personId, by });
      return true;
    },
    /** Takes an architect off a project, or withdraws (or declines) an invitation. */
    removeArchitect: (projectId: ProjectId, personId: PersonId, by: PersonId, reason?: string): boolean => {
      const team = firm().architectTeam(projectId);
      if (!team.members.some((m) => m.personId === personId)) return false;
      record({ kind: "project.architect-removed", projectId, personId, reason: reason?.trim() || undefined, by });
      return true;
    },

    /** A project's picture: a data URL from prepareThumbnail() (lib/thumbnail.ts), or null for the drawing. */
    setThumbnail: (projectId: ProjectId, dataUrl: string | null, by: PersonId) =>
      record({ kind: "project.thumbnail-set", projectId, dataUrl, by }),
  };
}

export type DeskWriters = ReturnType<typeof deskWriters>;

/** The tab's state and every writer: the client's, the staff `record`, and the BD and architect ones. */
export function useDemo() {
  const core = useCoreDemo();
  return { ...core, ...deskWriters(core.record) };
}
