/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PRIVATE } from "@/app/shared-metadata";

// The tab's name, after the project's (see the project layout); the page draws the rest.

export const metadata: Metadata = { title: "Team", robots: PRIVATE };

export default function StaffProjectsIdTeamLayout({ children }: { children: ReactNode }) {
  return children;
}
