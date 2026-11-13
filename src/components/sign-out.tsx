"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDemo } from "@/lib/demo-store";

// The way out of the portal: the session ends and the first screen opens. Everything done
// in the tab is kept, so the next person to sign in sees the same record.

/** Ends the session and opens the sign-in screen. `before` closes the menu it sits in. */
export function useSignOut(before?: () => void): () => void {
  const { signOut } = useDemo();
  const router = useRouter();
  return () => {
    before?.();
    signOut();
    router.push("/");
  };
}

/** A "Sign out" button, styled by the menu it sits in. */
export function SignOutButton({ className, onDone }: { className?: string; onDone?: () => void }) {
  const signOut = useSignOut(onDone);
  return (
    <button type="button" className={`cursor-pointer ${className ?? ""}`} onClick={signOut}>
      Sign out
    </button>
  );
}

/** "Sign out" while someone is signed in, else a link to the sign-in screen. For public pages. */
export function SignInOrOut({ className }: { className?: string }) {
  const { session } = useDemo();
  if (session) return <SignOutButton className={className} />;
  return (
    <Link href="/" className={className}>
      Sign in
    </Link>
  );
}
