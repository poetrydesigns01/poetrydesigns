/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MISSING_TITLE } from "@/app/shared-metadata";
import { changes } from "@/lib/demo-data";

// A revised specification is named by its own title, the way its page heads it.

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const change = changes.find((c) => c.id === id);
  return { title: change ? change.revisedSpec.title : MISSING_TITLE };
}

export default function SpecificationLayout({ children }: { children: ReactNode }) {
  return children;
}
