// The short guides for the training session: one per role, three to five steps each. Every
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
        how: "The brass peg on the house marks the next thing, and the list under it says what slips if it waits.",
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
        text: "Start a new project and save it as a draft at any step.",
        how: "Client and site, then category and estimate, then the agreement, then the team and hours.",
        href: "/staff/bd/onboard",
      },
      {
        text: "Enter the estimate in front of the client and download it.",
        how: "Area and rate give Part A; Part B items work out their own formulas. It prints alone.",
        href: "/staff/bd/estimate/kulkarni",
      },
      {
        text: "Upload the signed agreement and set the team and hours.",
        how: "Pick the point of contact, the Project Head and the hours before and during construction.",
        href: "/staff/bd/onboard/kulkarni",
      },
      {
        text: "Open the workspace; this counts as one onboarded client.",
        how: "The client is invited by email the moment it opens.",
        href: "/staff/bd/projects",
      },
      {
        text: "Add bought hours once the payment arrives.",
        how: "Note the amount and the bank reference; the client sees who added them and when.",
        href: "/staff/bd/hours",
      },
    ],
  },
  architect: {
    role: "architect",
    title: "Architect and Project Head",
    who: "For Vikram Desai, Lakshmi Narayan and their juniors.",
    home: { label: "Back to your desk", href: "/staff/architect" },
    steps: [
      {
        text: "Your desk lists what is your turn.",
        how: "Overdue first, then what has waited longest. What waits on others sits beside it.",
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
        text: "Assign work to your juniors.",
        how: "Say who, what to deliver, for which project and by when. It lands in their task sheet.",
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
        text: "Today lists only what needs you.",
        how: "Short cash, a margin below zero, a request nobody has seen, a client who has waited a week.",
        href: "/staff/admin",
      },
      {
        text: "Profit shows margin and cash side by side.",
        how: "Margin on the work done so far, before GST, next to what came in and went out.",
        href: "/staff/admin/projects",
      },
      {
        text: "People sets roles, seniors and Project Heads.",
        how: "Every change asks for a reason, and the reason is kept in the log.",
        href: "/staff/admin/people",
      },
      {
        text: "Setup holds templates and the catalogue.",
        how: "Milestone percentages must add up to 100 before a template can be saved.",
        href: "/staff/admin/setup",
      },
      {
        text: "The log cannot be edited.",
        how: "Every approval and every staff action, with name, date and time. Deletes stay as struck lines.",
        href: "/staff/admin/log",
      },
    ],
  },
};

export function isGuideRole(value: string): value is GuideRole {
  return (GUIDE_ROLES as string[]).includes(value);
}
