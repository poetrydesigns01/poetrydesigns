/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MISSING_TITLE } from "@/app/shared-metadata";
import { milestones } from "@/lib/demo-data";

// A demand letter is named by its instalment, raised or not, as the payments screen counts
// them. Only instalments 1 to 10 have letters; sign-up has none.

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const milestone = milestones.find((m) => String(m.id) === id && m.id > 0);
  return { title: milestone ? `Demand letter, instalment ${milestone.id}` : MISSING_TITLE };
}

export default function DemandLetterLayout({ children }: { children: ReactNode }) {
  return children;
}
