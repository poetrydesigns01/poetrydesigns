/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PRIVATE, titled } from "@/app/shared-metadata";

// The walk-through that follows one thing across every role. Part of the demo, so out of
// search.

export const metadata: Metadata = {
  title: titled("Follow one thing"),
  robots: PRIVATE,
};

export default function FollowLayout({ children }: { children: ReactNode }) {
  return children;
}
