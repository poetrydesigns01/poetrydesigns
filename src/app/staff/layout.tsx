/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import { PRIVATE, titled } from "@/app/shared-metadata";
import { StaffShell } from "@/components/register/staff-shell";
import { SessionGate } from "@/components/session-gate";

// Every staff screen names itself in the layout beside its page; "Staff" only stands in for
// one that does not. None of them belongs in search.
export const metadata: Metadata = {
  title: titled("Staff"),
  robots: PRIVATE,
};

// Every staff screen sits in the same frame: the rail (a tab bar on a phone), the person
// and project switches, and the one pause before anything is recorded. The frame opens
// only once someone has signed in on the first screen.
export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return (
    <SessionGate>
      <StaffShell>{children}</StaffShell>
    </SessionGate>
  );
}
