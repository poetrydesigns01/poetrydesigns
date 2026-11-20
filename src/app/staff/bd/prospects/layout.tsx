/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PRIVATE, titled } from "@/app/shared-metadata";

// Names the screen in the browser tab and in history; the page draws the rest.

export const metadata: Metadata = { title: titled("Under discussion"), robots: PRIVATE };

export default function StaffBdProspectsLayout({ children }: { children: ReactNode }) {
  return children;
}
