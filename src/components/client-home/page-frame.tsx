/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { ReactNode } from "react";

// Every client page sits in the same frame as the bar above it (components/client-nav.tsx:
// max-w-7xl, px-4, px-6 from 640 px), so the brand and each page's title share one left edge
// and nothing moves sideways from tab to tab.

export const CLIENT_PAGE = "mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:gap-5 lg:py-8";

/** A page's title, with at most one chip set right after it, never pushed to the far edge. */
export function PageHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <h1 className="display text-32 text-ink">{title}</h1>
      {children}
    </header>
  );
}
