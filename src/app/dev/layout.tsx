/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MISSING_TITLE, PRIVATE, titled } from "@/app/shared-metadata";

// Development-only screens: never in search. A production build answers every page here
// with the missing-page card, so there it carries that card's title.

export const metadata: Metadata = {
  title: process.env.NODE_ENV === "development" ? titled("House in every state") : MISSING_TITLE,
  robots: PRIVATE,
};

export default function DevLayout({ children }: { children: ReactNode }) {
  return children;
}
