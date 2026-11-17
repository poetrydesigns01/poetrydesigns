/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { PersonId } from "./firm-data";

// Demo-only accounts: who can sign in, and the screen each one opens. The browser gets this
// list so the sign-in card can recognise an ID as it is typed. It holds no passwords: those
// are checked on the server (app/api/sign-in), against salted keys the browser never sees.
// The session itself stays a flag in the tab, so this is still not real security.

export type DemoAccount = {
  /** What is typed in the ID field. "@poetrydesigns.in" may be added after it. */
  id: string;
  person: PersonId;
  name: string;
  role: "client" | "bd" | "architect" | "site" | "finance" | "admin";
  title: string;
  /** The screen signing in opens. */
  home: string;
};

export const ACCOUNTS: DemoAccount[] = [
  {
    id: "meera.iyer",
    person: "meera",
    name: "Meera Iyer",
    role: "client",
    title: "Homeowner",
    home: "/client",
  },
  {
    id: "rohan.menon",
    person: "rohan",
    name: "Rohan Menon",
    role: "bd",
    title: "Business development",
    home: "/staff/bd",
  },
  {
    id: "vikram.desai",
    person: "vikram",
    name: "Vikram Desai",
    role: "architect",
    title: "Senior architect, Project Head",
    home: "/staff/architect",
  },
  {
    id: "ananya.rao",
    person: "ananya",
    name: "Ananya Rao",
    role: "architect",
    title: "Junior architect",
    home: "/staff/architect",
  },
  {
    id: "suresh.gowda",
    person: "suresh",
    name: "Suresh Gowda",
    role: "site",
    title: "Site engineer",
    home: "/staff/site",
  },
  {
    id: "manjunath.k",
    person: "manjunath",
    name: "Manjunath K",
    role: "site",
    title: "Junior site engineer",
    home: "/staff/site",
  },
  {
    id: "prakash.hegde",
    person: "prakash",
    name: "Prakash Hegde",
    role: "finance",
    title: "Procurement lead",
    home: "/staff/finance",
  },
  {
    id: "divya.shenoy",
    person: "divya",
    name: "Divya Shenoy",
    role: "finance",
    title: "Accountant",
    home: "/staff/finance",
  },
  {
    id: "shalini.murthy",
    person: "shalini",
    name: "Shalini Murthy",
    role: "admin",
    title: "Operations head and admin",
    home: "/staff/admin",
  },
];

/** The firm's email domain, which may be typed after an ID. */
export const ID_DOMAIN = "@poetrydesigns.in";

/** An ID as the accounts are keyed: trimmed, lower case, without "@poetrydesigns.in". */
export function normaliseId(id: string): string {
  const key = id.trim().toLowerCase();
  return key.endsWith(ID_DOMAIN) ? key.slice(0, -ID_DOMAIN.length) : key;
}

/** The account an ID names: trimmed, any case, with or without "@poetrydesigns.in". */
export function accountForId(id: string): DemoAccount | undefined {
  const key = normaliseId(id);
  return ACCOUNTS.find((account) => account.id === key);
}

/**
 * What POST /api/sign-in answers: 200 with the account the pair signs in to, 401 when the ID
 * and password do not match, and 400 when the request is not an ID and a password.
 */
export type SignInReply = { ok: true; accountId: string } | { ok: false; error: string };
