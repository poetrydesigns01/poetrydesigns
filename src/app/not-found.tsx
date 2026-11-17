/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import Link from "next/link";
import { Brand } from "@/components/brand";

// Any link that leads nowhere: the portal's own backdrop and glass, the brand, one line and
// one way back, instead of the framework's bare black page.

export default function NotFound() {
  return (
    <main className="glass-world grid flex-1 place-items-center px-4 py-10">
      <section className="glass grid w-full max-w-md justify-items-start gap-6 p-6 sm:p-8">
        <Link href="/" className="inline-flex min-h-11 items-center">
          <Brand />
        </Link>
        <h1 className="display display-lg text-balance text-ink">This page is not on the plan</h1>
        <Link href="/" className="btn btn-primary min-h-12">
          Back to the portal
        </Link>
      </section>
    </main>
  );
}
