/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MISSING_TITLE } from "@/app/shared-metadata";
import { requestNumberOf } from "@/app/staff/request-guard";

// One material request in procurement's inbox, named by its number. Only request numbers open.

export async function generateMetadata({ params }: { params: Promise<{ no: string }> }): Promise<Metadata> {
  const no = requestNumberOf((await params).no);
  return { title: no ? `${no} · Requests` : MISSING_TITLE };
}

export default function FinanceRequestLayout({ children }: { children: ReactNode }) {
  return children;
}
