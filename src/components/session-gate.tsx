/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Brand } from "@/components/brand";
import { accountForId } from "@/lib/demo-accounts";
import { useDemo, useStoreReady } from "@/lib/demo-store";
import { ArrivalVeil } from "./arrival-veil";

// The client's and staff screens open only after signing in on the first screen. The
// session lives in the tab, so the server cannot know it: the server and the first client
// pass draw the screen hidden, and it shows once the tab's state is read and holds a
// session. A visitor with no session is sent back to sign in and never sees the screen.
// The server's copy is drawn from the seed (the tab's events are not known there), and a
// page can finish hydrating after this gate opens, so on a hard load it would show the seed
// and then flip. The screen is therefore drawn afresh once, when the tab's state is first
// read (the key below), and every hook in it starts from the tab's events. After that the
// gate stays open across navigations, so nothing remounts.

// Each area opens only for its own people: the homeowner's screens for the client, the staff
// screens for the team. Anyone else is sent to their own home.
export function SessionGate({ area, children }: { area: "client" | "staff"; children: ReactNode }) {
  const onClient = useStoreReady();
  const { session } = useDemo();
  const router = useRouter();
  const belongs = session !== null && (area === "client") === (session.role === "client");
  const open = onClient && belongs;

  useEffect(() => {
    if (!onClient) return;
    if (session === null) router.replace("/");
    else if (!belongs) router.replace(accountForId(session.id)?.home ?? "/");
  }, [onClient, session, belongs, router]);

  return (
    <>
      <div key={onClient ? "tab" : "seed"} className={open ? "contents" : "hidden"} aria-busy={open ? undefined : true}>
        {children}
      </div>
      {/* While the gate is shut (a hard load, before the tab is read) the ground and the
          name stand in, so the first paint is the portal's own and not an empty page. */}
      {!open && (
        <div aria-hidden="true" className="on-dark fixed inset-0 z-40 bg-rosewood text-lime">
          <p className="flex px-4 pt-6 sm:px-8">
            <Brand />
          </p>
        </div>
      )}
      <ArrivalVeil />
    </>
  );
}
