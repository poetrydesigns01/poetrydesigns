import type { PersonId } from "./firm-data";

// Demo-only accounts. They are checked in the browser against this list, so they are
// not real security: anyone can read them here, and nothing is sent anywhere. They exist
// so each role's screens can be opened by signing in the way the real portal will.

export type DemoAccount = {
  /** What is typed in the ID field. "@poetrydesigns.in" may be added after it. */
  id: string;
  /** Case-sensitive. */
  password: string;
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
    password: "Meera@2026",
    person: "meera",
    name: "Meera Iyer",
    role: "client",
    title: "Homeowner",
    home: "/client",
  },
  {
    id: "rohan.menon",
    password: "Rohan@2026",
    person: "rohan",
    name: "Rohan Menon",
    role: "bd",
    title: "Business development",
    home: "/staff/bd",
  },
  {
    id: "vikram.desai",
    password: "Vikram@2026",
    person: "vikram",
    name: "Vikram Desai",
    role: "architect",
    title: "Senior architect, Project Head",
    home: "/staff/architect",
  },
  {
    id: "ananya.rao",
    password: "Ananya@2026",
    person: "ananya",
    name: "Ananya Rao",
    role: "architect",
    title: "Junior architect",
    home: "/staff/architect",
  },
  {
    id: "suresh.gowda",
    password: "Suresh@2026",
    person: "suresh",
    name: "Suresh Gowda",
    role: "site",
    title: "Site engineer",
    home: "/staff/site",
  },
  {
    id: "manjunath.k",
    password: "Manjunath@2026",
    person: "manjunath",
    name: "Manjunath K",
    role: "site",
    title: "Junior site engineer",
    home: "/staff/site",
  },
  {
    id: "prakash.hegde",
    password: "Prakash@2026",
    person: "prakash",
    name: "Prakash Hegde",
    role: "finance",
    title: "Procurement lead",
    home: "/staff/finance",
  },
  {
    id: "divya.shenoy",
    password: "Divya@2026",
    person: "divya",
    name: "Divya Shenoy",
    role: "finance",
    title: "Accountant",
    home: "/staff/finance",
  },
  {
    id: "shalini.murthy",
    password: "Shalini@2026",
    person: "shalini",
    name: "Shalini Murthy",
    role: "admin",
    title: "Operations head and admin",
    home: "/staff/admin",
  },
];

const DOMAIN = "@poetrydesigns.in";

/** The account an ID names: trimmed, any case, with or without "@poetrydesigns.in". */
export function accountForId(id: string): DemoAccount | undefined {
  let key = id.trim().toLowerCase();
  if (key.endsWith(DOMAIN)) key = key.slice(0, -DOMAIN.length);
  return ACCOUNTS.find((account) => account.id === key);
}

export type SignInResult = { ok: true; account: DemoAccount } | { ok: false; reason: "unknown-id" | "wrong-password" };

/**
 * Checks an ID and password against the demo accounts. These passwords are published to be
 * copied, so a space picked up at either end does not count; case still does.
 */
export function findAccount(id: string, password: string): SignInResult {
  const account = accountForId(id);
  if (!account) return { ok: false, reason: "unknown-id" };
  if (password.trim() !== account.password) return { ok: false, reason: "wrong-password" };
  return { ok: true, account };
}
