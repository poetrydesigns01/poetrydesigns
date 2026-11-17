/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { accountForId } from "@/lib/demo-accounts";
import { useDemo } from "@/lib/demo-store";

// Setting the password opens her home signed in, as the real invite will. Nothing typed is
// checked, kept or sent: the fields have no names, and the demo signs Meera in.

const input = "glass-field block min-h-12 w-full px-3.5 text-17 text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass";

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
    <form onSubmit={submit} className="grid gap-4" autoComplete="off">
      <div>
        <label htmlFor="invite-password" className="block text-15 font-semibold">
          Choose a password
        </label>
        <input id="invite-password" type="password" className={`${input} mt-1.5`} />
      </div>
      <div>
        <label htmlFor="invite-again" className="block text-15 font-semibold">
          Type it again
        </label>
        <input id="invite-again" type="password" className={`${input} mt-1.5`} />
      </div>
      <button type="submit" className="btn btn-primary mt-1 min-h-12 w-full">
        Open your home
      </button>
    </form>
  );
}
