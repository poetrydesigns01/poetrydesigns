/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PRIVATE, titled } from "@/app/shared-metadata";

// The guides for the training session. They open on screens behind sign-in, so they stay out of
// search.

export const metadata: Metadata = {
  title: titled("Guides"),
  robots: PRIVATE,
};

export default function HelpLayout({ children }: { children: ReactNode }) {
  return children;
}
