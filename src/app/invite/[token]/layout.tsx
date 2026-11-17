/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MISSING_TITLE } from "@/app/shared-metadata";
import { inviteFor } from "./invites";

// A known invitation keeps the title the invite layout gives it, "Your invitation". A link
// with any other token shows the missing-page card, so it is titled as one.

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  return inviteFor(token) ? {} : { title: MISSING_TITLE };
}

export default function InviteTokenLayout({ children }: { children: ReactNode }) {
  return children;
}
