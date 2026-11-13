"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { accountForId } from "@/lib/demo-accounts";
import { useDemo } from "@/lib/demo-store";

// Setting the password opens her home signed in, as the real invite will. Nothing typed is
// checked, kept or sent: the fields have no names, and the demo signs Meera in.

const input =
  "block min-h-12 w-full rounded-[3px] border-0 bg-lime px-3 text-17 text-ink placeholder:text-ink-soft";

export function InviteForm({ opens }: { opens: string }) {
  const { signIn } = useDemo();
  const router = useRouter();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const meera = accountForId("meera.iyer");
    if (meera) signIn(meera);
    router.push(opens);
  };

  return (
    <form onSubmit={submit} className="mt-6 grid max-w-md gap-5" autoComplete="off">
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
    </form>
  );
}
