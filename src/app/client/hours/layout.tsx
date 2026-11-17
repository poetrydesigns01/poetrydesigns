/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { titled } from "@/app/shared-metadata";

// Names the screen in the browser tab and in history; the page draws the rest.

export const metadata: Metadata = { title: titled("Advisory hours") };

export default function ClientHoursLayout({ children }: { children: ReactNode }) {
  return children;
}
