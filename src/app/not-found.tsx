/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { NOT_FOUND_TITLE } from "@/app/shared-metadata";
import { Brand } from "@/components/brand";
import { HomeLink } from "@/components/home-link";

// Any link that leads nowhere: the portal's own backdrop and glass, the brand, one line and
// one way back, instead of the framework's bare black page. The way back is the person's
// own first screen when someone is signed in in this tab, else the sign-in screen.

export const metadata: Metadata = {
  title: NOT_FOUND_TITLE,
};

export default function NotFound() {
  return (
    <main className="glass-world grid flex-1 place-items-center px-4 py-10">
      <section className="glass grid w-full max-w-md justify-items-start gap-6 p-6 sm:p-8">
        <Link href="/" className="inline-flex min-h-11 items-center">
          <Brand />
        </Link>
        <h1 className="display display-lg text-balance text-ink">This page is not on the plan</h1>
        <HomeLink className="btn btn-primary min-h-12">Back to the portal</HomeLink>
      </section>
    </main>
  );
}
