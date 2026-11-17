/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MISSING_TITLE } from "@/app/shared-metadata";
import { projects } from "@/lib/firm-data";
import { estimateFor } from "../estimates";

// An estimate is named as its board heads it: "Kulkarni Eco Home estimate". A project with no
// estimate on paper shows the missing-page card, so it is titled as one.

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const project = estimateFor(id) && projects.find((p) => p.id === id);
  return { title: project ? `${project.name} estimate` : MISSING_TITLE };
}

export default function EstimateLayout({ children }: { children: ReactNode }) {
  return children;
}
