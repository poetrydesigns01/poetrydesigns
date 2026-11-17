/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { InviteForm } from "./invite-form";
import { INVITES, inviteFor } from "./invites";

// Accepting an invite, front end only. The client sets a password and opens their home,
// signed in. Nothing typed here is checked, kept or sent: the fields have no names. It is
// her first screen, so it is set like the sign-in page: the firm's name as a masthead and
// the promise under it on the glass backdrop, the form in a frosted card beside them.

export function generateStaticParams() {
  return Object.keys(INVITES).map((token) => ({ token }));
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="glass-world flex min-h-svh flex-1 flex-col text-ink">
      <Suspense>
        <InviteFromParams params={params} />
      </Suspense>
    </main>
  );
}

async function InviteFromParams({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = inviteFor(token);
  if (!invite) notFound();

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 content-center items-center gap-6 px-4 py-6 sm:gap-10 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
      <div className="grid min-w-0 justify-items-start gap-2.5 sm:gap-3.5">
        <Link href="/" className="inline-flex max-w-full" aria-label="Poetry Designs, sign in">
          <Brand size="hero" />
        </Link>
        <p className="display text-22 leading-tight sm:text-32">From concept to reality.</p>
      </div>

      <section className="glass-strong grid gap-5 p-5 sm:p-7" aria-labelledby="invite-title">
        <div className="grid gap-1.5">
          <h1 id="invite-title" className="display text-22 leading-snug">
            {invite.by} has set up {invite.project} for {invite.clients}.
          </h1>
          <p className="text-15 text-ink-soft">Set a password to open your home.</p>
        </div>

        <InviteForm opens={invite.opens} />

        <p className="border-t border-ink/10 pt-3 text-13 text-ink-soft">
          Nothing is checked here. Opening your home signs you in as Meera.
        </p>
      </section>
    </div>
  );
}
