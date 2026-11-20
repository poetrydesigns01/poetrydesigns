/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
// The short guides for the training session: one per role, five or six steps each. Every
// step is one sentence, one line on how it is done, and the screen it happens on. Plain
// data, so the guide pages can be drawn on the server.

export type GuideRole = "client" | "bd" | "architect" | "site" | "finance" | "admin";

export type GuideStep = {
  /** The step itself, as in the guide. */
  text: string;
  /** How it is done, in one line. */
  how: string;
  /** The screen it happens on. */
  href: string;
};

export type Guide = {
  role: GuideRole;
  /** "Site engineer". */
  title: string;
  /** Who reads it: "For Suresh Gowda and Manjunath K." */
  who: string;
  /** Where the role starts, for the link back. */
  home: { label: string; href: string };
  steps: GuideStep[];
};

export const GUIDE_ROLES: GuideRole[] = ["client", "bd", "architect", "site", "finance", "admin"];

export const GUIDES: Record<GuideRole, Guide> = {
  client: {
    role: "client",
    title: "Homeowner",
    who: "For Meera Iyer, and every client after her.",
    home: { label: "Back to your home", href: "/client" },
    steps: [
      {
        text: "Your home shows what is waiting for you.",
        how: "The brass peg on the house marks the next thing. After each milestone, it asks you to rate us 0 to 10.",
        href: "/client",
      },
      {
        text: "Hold to approve, or tap for two steps.",
        how: "Every approval waits five seconds before it is recorded, so you can still cancel it.",
        href: "/client/designs",
      },
      {
        text: "Payments write a letter for your bank.",
        how: "Approve a finished stage's payment and the demand letter, with the stage proof, is ready to download.",
        href: "/client/payments",
      },
      {
        text: "Try a change on the house before you decide.",
        how: "Each priced change shows what it adds to the price and to the handover date.",
        href: "/client/changes",
      },
      {
        text: "Ask for more hours or a design change.",
        how: "It goes to your Project Head. You approve the cost before it is billed.",
        href: "/client/hours",
      },
      {
        text: "Updates replace the WhatsApp group.",
        how: "Site photos, new drawings and every decision land here, with the floor they are about.",
        href: "/client/updates",
      },
    ],
  },
  bd: {
    role: "bd",
    title: "Business development",
    who: "For Rohan Menon.",
    home: { label: "Back to Today", href: "/staff/bd" },
    steps: [
      {
        text: "Register each enquiry in Under discussion.",
        how: "Phone and email are checked. A lead held in the last 12 months cannot be added again.",
        href: "/staff/bd/prospects/new",
      },
      {
        text: "Move a lead from level 0 to level 3.",
        how: "When the sign-up is paid, tap Sign-up paid. The client moves to Onboarding with the enquiry filled in.",
        href: "/staff/bd/prospects",
      },
      {
        text: "Enter the estimate in front of the client and download it.",
        how: "Area and rate give Part A; Part B items work out their own formulas. It prints alone.",
        href: "/staff/bd/estimate/kulkarni",
      },
      {
        text: "Upload the signed agreement, set the team, then open the workspace.",
        how: "Pick the point of contact, the Project Head and the hours; the client is invited when it opens.",
        href: "/staff/bd/onboard/kulkarni",
      },
      {
        text: "Settle what a Project Head escalates to you.",
        how: "Charge or waive the fee and note what was agreed. Hour requests stay with the Project Head.",
        href: "/staff/bd/hours",
      },
    ],
  },
  architect: {
    role: "architect",
    title: "Architect and Project Head",
    who: "For Vikram Desai, Lakshmi Narayan and their juniors.",
    home: { label: "Back to Today", href: "/staff/architect" },
    steps: [
      {
        text: "Today lists what waits on you.",
        how: "Urgent first, then what has waited longest. Client requests for hours and changes are yours to decide.",
        href: "/staff/architect",
      },
      {
        text: "Upload a version with a note on what changed.",
        how: "The client is emailed and the version waits for her decision; earlier versions are kept.",
        href: "/staff/architect/designs",
      },
      {
        text: "Log time and mark consultations.",
        how: "Consultation time comes off the client's hours. Logging is never blocked.",
        href: "/staff/architect/tasks",
      },
      {
        text: "Raise a payment once the site marks a stage done.",
        how: "The letter number is given for you, and the client accepts the stage before she approves the payment.",
        href: "/staff/architect",
      },
      {
        text: "Seniors put juniors on projects and set their tasks.",
        how: "A project's Team tab ranks juniors by fit, to invite or assign. Tasks are set here: who, what, by when.",
        href: "/staff/architect/team",
      },
    ],
  },
  site: {
    role: "site",
    title: "Site engineer",
    who: "For Suresh Gowda and Manjunath K.",
    home: { label: "Back to Today", href: "/staff/site" },
    steps: [
      {
        text: "Today lists what waits on you, urgent first.",
        how: "Five days waiting or past its date is urgent, with a brick mark. Your sites follow.",
        href: "/staff/site",
      },
      {
        text: "Request material in three taps.",
        how: "Pick the material, the size and the quantity. With no signal it waits and sends itself later.",
        href: "/staff/site/request",
      },
      {
        text: "Check whether a PO is uploaded before you call.",
        how: "Each request shows New, Seen, PO in part, PO uploaded or Delivered, with who did it and when.",
        href: "/staff/site/requests",
      },
      {
        text: "Post photos to Updates.",
        how: "Say which floor it is about. The client is emailed; her own posts send no email.",
        href: "/staff/site/update",
      },
      {
        text: "Mark a stage done with photos.",
        how: "The Project Head is told at once, so the payment can be raised.",
        href: "/staff/site/stage",
      },
    ],
  },
  finance: {
    role: "finance",
    title: "Procurement and finance",
    who: "For Prakash Hegde, Imran and Divya Shenoy.",
    home: { label: "Back to Today", href: "/staff/finance" },
    steps: [
      {
        text: "Mark new requests seen.",
        how: "The site engineer sees it straight away, so he does not have to call.",
        href: "/staff/finance/requests",
      },
      {
        text: "Link the Zoho PO to the request.",
        how: "Upload the PO and enter the vendor, quantities, rates and GST. Two POs can cover one request.",
        href: "/staff/finance/requests",
      },
      {
        text: "Record what the bank and the client paid.",
        how: "Enter each part with its bank reference. The letter reads Part paid, then Paid.",
        href: "/staff/finance/money",
      },
      {
        text: "Bill the architect fees clients approve.",
        how: "They wait in Money in under Architect fees. Raise the invoice, then record the receipt with its UTR.",
        href: "/staff/finance/money",
      },
      {
        text: "Enter bills against a milestone, before GST.",
        how: "A bill against a PO moves it from committed to spent.",
        href: "/staff/finance/costs",
      },
    ],
  },
  admin: {
    role: "admin",
    title: "Admin",
    who: "For Shalini Murthy.",
    home: { label: "Back to Today", href: "/staff/admin" },
    steps: [
      {
        text: "Today lists what needs you, urgent first.",
        how: "Five days waiting or past its date is urgent, with a brick mark. Projects needing a look follow.",
        href: "/staff/admin",
      },
      {
        text: "Projects shows each home as a tile, profit below.",
        how: "Tap Pictures to add a photo to a tile. The table puts margin and cash side by side.",
        href: "/staff/admin/projects",
      },
      {
        text: "Leads shows who holds each enquiry.",
        how: "A lead is held for 12 months. Only you can reassign one, and it needs a reason.",
        href: "/staff/admin/leads",
      },
      {
        text: "Setup holds templates, the catalogue and fees.",
        how: "Fees sets the architect's rate an hour. Client requests are priced from it, plus 18% GST.",
        href: "/staff/admin/setup",
      },
      {
        text: "Performance has a report for each person.",
        how: "Approval delays, client NPS and tasks. Open a name for the report; it prints on its own.",
        href: "/staff/admin/performance",
      },
      {
        text: "The log cannot be edited.",
        how: "Every approval and staff action, with name and time. Role changes in People keep their reason here.",
        href: "/staff/admin/log",
      },
    ],
  },
};

export function isGuideRole(value: string): value is GuideRole {
  return (GUIDE_ROLES as string[]).includes(value);
}
