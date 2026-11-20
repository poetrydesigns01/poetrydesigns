/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PRIVATE } from "@/app/shared-metadata";
import { seedProspects } from "@/lib/bd-data";

// A prospect is named by the owner on the enquiry; one registered in this tab is "Enquiry".

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const owner = seedProspects.find((p) => p.id === id)?.enquiry.owner;
  return { title: `${owner ?? "Enquiry"} · Under discussion`, robots: PRIVATE };
}

export default function ProspectLayout({ children }: { children: ReactNode }) {
  return children;
}
