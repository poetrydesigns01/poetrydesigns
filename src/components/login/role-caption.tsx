/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { LoginRole } from "./site-model";

// What each person on the site does, in one short sentence. The sign-in card shows the
// first as its one helper line; each role's own sentence reaches its radio through
// aria-describedby, so it is read out without adding words to the screen.

export const ROLE_SENTENCE: Record<LoginRole | "none", string> = {
  none: "Choose how you work with us, then sign in with your ID.",
  client: "Homeowner. Approves drawings, stages, payments and changes.",
  bd: "Business development. Opens each new client's project.",
  architect: "Architect. Drawings, reviews and the juniors' work.",
  site: "Site engineer. Orders material and marks stages from his phone.",
  finance: "Procurement and finance. Purchase orders, money in and out.",
  admin: "Admin. Every project's margin and cash, people and templates.",
};
