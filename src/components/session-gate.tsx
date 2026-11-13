"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useDemo } from "@/lib/demo-store";
import { ArrivalVeil } from "./arrival-veil";

// The client's and staff screens open only after signing in on the first screen. The
// session lives in the tab, so the server cannot know it: the server and the first client
// pass draw the screen hidden, and it shows once the tab's state is read and holds a
// session. A visitor with no session is sent back to sign in and never sees the screen.
// The screen is drawn, only hidden, so the tree keeps its shape and nothing remounts.

const noop = () => () => {};

/** False on the server and while hydrating; true once the tab's own state can be read. */
function useOnClient(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export function SessionGate({ children }: { children: ReactNode }) {
  const onClient = useOnClient();
  const { session } = useDemo();
  const router = useRouter();
  const open = onClient && session !== null;

  useEffect(() => {
    if (onClient && session === null) router.replace("/");
  }, [onClient, session, router]);

  return (
    <>
      <div className={open ? "contents" : "hidden"} aria-busy={open ? undefined : true}>
        {children}
      </div>
      {/* While the gate is shut (a hard load, before the tab is read) the ground and the
          name stand in, so the first paint is the portal's own and not an empty page. */}
      {!open && (
        <div aria-hidden="true" className="on-dark fixed inset-0 z-40 bg-rosewood text-lime">
          <p className="display px-4 pt-6 text-22 leading-none sm:px-8">Poetry Designs</p>
        </div>
      )}
      <ArrivalVeil />
    </>
  );
}
