/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { Brand } from "@/components/brand";
import { HomeLink } from "@/components/home-link";

// A screen that failed to draw: the same glass card as a missing page, one line, and two
// ways on. Trying again fetches the screen afresh; home is the person's own first screen.
// Everything done in the tab is kept, so nothing is lost by either.

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="glass-world grid flex-1 place-items-center px-4 py-10">
      <section className="glass grid w-full max-w-md justify-items-start gap-6 p-6 sm:p-8">
        <Link href="/" className="inline-flex min-h-11 items-center">
          <Brand />
        </Link>
        <h1 className="display display-lg text-balance text-ink">Something went wrong</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary min-h-12" onClick={() => retry()}>
            Try again
          </button>
          <HomeLink className="btn btn-glass min-h-12">Home</HomeLink>
        </div>
      </section>
    </main>
  );
}
