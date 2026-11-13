"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ACCOUNTS } from "@/lib/demo-accounts";
import { useDemo } from "@/lib/demo-store";
import type { GuideRole } from "./guide-data";

// A guide's link to the screen a step happens on. Those screens open only for someone
// signed in, so a visitor who is not is signed in first, as the role's own person.

export function OpenStep({
  role,
  href,
  className,
  children,
}: {
  role: GuideRole;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const demo = useDemo();
  const open = () => {
    if (demo.session) return;
    const account = ACCOUNTS.find((a) => a.role === role);
    if (account) demo.signIn(account);
  };
  return (
    <Link href={href} className={className} onClick={open}>
      {children}
    </Link>
  );
}
