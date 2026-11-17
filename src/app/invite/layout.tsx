/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PRIVATE, titled } from "@/app/shared-metadata";

// An invitation link is meant for one person, so it stays out of search.

export const metadata: Metadata = {
  title: titled("Your invitation"),
  robots: PRIVATE,
};

export default function InviteLayout({ children }: { children: ReactNode }) {
  return children;
}
