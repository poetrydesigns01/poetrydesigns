/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MISSING_TITLE } from "@/app/shared-metadata";
import { DRAFT_IDS } from "@/lib/firm";
import { projects, type DraftId } from "@/lib/firm-data";

// A workspace being set up is named as its board heads it before anything is typed: the
// project's name, or "New project".

export async function generateMetadata({ params }: { params: Promise<{ draft: string }> }): Promise<Metadata> {
  const { draft } = await params;
  if (!DRAFT_IDS.includes(draft as DraftId)) return { title: MISSING_TITLE };
  const name = projects.find((p) => p.id === draft)?.name ?? "New project";
  return { title: `${name} · Onboarding` };
}

export default function DraftLayout({ children }: { children: ReactNode }) {
  return children;
}
