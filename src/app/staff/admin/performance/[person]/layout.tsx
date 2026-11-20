/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PRIVATE } from "@/app/shared-metadata";
import { APPRAISED_IDS } from "@/components/admin/appraisal-data";
import { people } from "@/lib/firm-data";

// One person's appraisal, named by the person. Someone added in this tab under People is not
// known to the server, so their report is titled plainly; the report itself checks the id.

export async function generateMetadata({ params }: { params: Promise<{ person: string }> }): Promise<Metadata> {
  const id = (await params).person;
  const person = APPRAISED_IDS.includes(id as (typeof APPRAISED_IDS)[number]) ? people.find((p) => p.id === id) : undefined;
  return { title: person ? `${person.name} · Appraisal` : "Appraisal", robots: PRIVATE };
}

export default function AdminAppraisalLayout({ children }: { children: ReactNode }) {
  return children;
}
