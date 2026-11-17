/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MISSING_TITLE } from "@/app/shared-metadata";
import { designs } from "@/lib/demo-data";
import { seedDesignItems } from "@/lib/portal-data";

// A design item is named by its own title, "Door frames", the way its page heads it: the
// client's project first, then the older sheets, the same items the page opens.

function titleOf(id: string): string | undefined {
  return (
    seedDesignItems.find((item) => item.projectId === "iyer" && item.id === id)?.title ??
    designs.find((design) => design.id === id)?.title
  );
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: titleOf(id) ?? MISSING_TITLE };
}

export default function DesignLayout({ children }: { children: ReactNode }) {
  return children;
}
