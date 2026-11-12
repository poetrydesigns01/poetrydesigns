import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SampleTag } from "@/components/register/sample-tag";

// Accepting an invite, front end only. The client sets a password and opens their home.
// Nothing typed here is checked, kept or sent: the fields have no names.

const INVITES: Record<string, { by: string; project: string; clients: string; opens: string }> = {
  "iyer-residence": {
    by: "Rohan Menon",
    project: "Iyer Residence",
    clients: "you and Arjun Iyer",
    opens: "/client",
  },
};

const input =
  "block min-h-12 w-full rounded-[3px] border-0 bg-lime px-3 text-17 text-ink placeholder:text-ink-soft";

export function generateStaticParams() {
  return Object.keys(INVITES).map((token) => ({ token }));
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="on-dark flex flex-1 flex-col bg-rosewood text-lime">
      <Suspense>
        <InviteFromParams params={params} />
      </Suspense>
    </main>
  );
}

async function InviteFromParams({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = INVITES[token];
  if (!invite) notFound();

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 pb-16 pt-5 sm:px-8 sm:pt-10">
      <Link href="/" className="display inline-flex min-h-11 items-center text-22 leading-none">
        Poetry Designs
      </Link>
      <h1 className="display mt-8 text-32 sm:mt-14">
        {invite.by} has set up {invite.project} for {invite.clients}.
      </h1>
      <p className="mt-3 text-17 text-lime/80">Set a password to open your home.</p>

      <Form action={invite.opens} className="mt-6 grid max-w-md gap-5" autoComplete="off">
        <div>
          <label htmlFor="invite-password" className="block text-17 font-semibold">
            Choose a password
          </label>
          <input id="invite-password" type="password" className={`${input} mt-1.5`} />
        </div>
        <div>
          <label htmlFor="invite-again" className="block text-17 font-semibold">
            Type it again
          </label>
          <input id="invite-again" type="password" className={`${input} mt-1.5`} />
        </div>
        <button type="submit" className="btn btn-primary mt-1 w-full sm:w-auto sm:justify-self-start">
          Open your home
        </button>
      </Form>

      <p className="mt-8 text-17 text-lime/80">
        <SampleTag>Demo only</SampleTag> Nothing is checked. Opening your home takes you to Meera&apos;s screens.
      </p>
    </div>
  );
}
