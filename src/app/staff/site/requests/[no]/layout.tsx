/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MISSING_TITLE } from "@/app/shared-metadata";
import { requestNumberOf } from "@/app/staff/request-guard";

// One of the site engineer's requests, named by its number. Only request numbers open.

export async function generateMetadata({ params }: { params: Promise<{ no: string }> }): Promise<Metadata> {
  const no = requestNumberOf((await params).no);
  return { title: no ? `${no} · My requests` : MISSING_TITLE };
}

export default function SiteRequestLayout({ children }: { children: ReactNode }) {
  return children;
}
