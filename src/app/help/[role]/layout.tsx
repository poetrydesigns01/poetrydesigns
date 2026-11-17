/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MISSING_TITLE } from "@/app/shared-metadata";
import { GUIDES, isGuideRole } from "@/components/guides/guide-data";

// One role's guide is named after the role: "Homeowner guide". The page shows the
// missing-page card for a role with no guide, and this names it so.

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const { role } = await params;
  if (!isGuideRole(role)) return { title: MISSING_TITLE };
  return { title: `${GUIDES[role].title} guide` };
}

export default function GuideLayout({ children }: { children: ReactNode }) {
  return children;
}
