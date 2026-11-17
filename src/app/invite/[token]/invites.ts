/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */

// The invitations the demo can open, by the token in their link. The page draws the one it
// is given and its layout names it; any other token is a missing page.

export type Invite = { by: string; project: string; clients: string; opens: string };

export const INVITES: Readonly<Record<string, Invite>> = {
  "iyer-residence": {
    by: "Rohan Menon",
    project: "Iyer Residence",
    clients: "you and Arjun Iyer",
    opens: "/client",
  },
};

/** The invitation for a token, or undefined when the link holds anything else. */
export function inviteFor(token: string): Invite | undefined {
  return Object.hasOwn(INVITES, token) ? INVITES[token] : undefined;
}
