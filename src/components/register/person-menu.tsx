/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { SignOutButton } from "@/components/sign-out";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { Firm } from "@/lib/firm";
import { ROLE_PEOPLE, type Person, type PersonId, type StaffRole } from "@/lib/firm-data";
import { viewerIdOf } from "./project-switch";

// Who you are on this screen, and in the demo, who else you could be. In the rail it opens
// from the person block; on a phone, from the initials button in the board. Choosing the
// other person for the role changes the page in place, with no navigation; it changes who
// is viewed, not who signed in.

/** "Senior architect, Project Head": the title, and the Project Head flag when it holds. */
export function personTitle(person: Person, firm: Firm): string {
  const head = firm.projects.some((p) => p.phase !== "draft" && p.team.head === person.id);
  return head ? `${person.title}, Project Head` : person.title;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

export function PersonMenu({
  role,
  variant = "button",
  spread = false,
}: {
  role: StaffRole;
  variant?: "rail" | "button";
  /** On a phone, open under the whole row the button sits in (the nearest positioned box). */
  spread?: boolean;
}) {
  const demo = useDemo();
  const firm = useFirm();
  const ref = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const id = viewerIdOf(role, demo.viewers);
  const person = firm.person(id);
  const others = ROLE_PEOPLE[role]
    .filter((other) => other !== id)
    .map((other) => firm.person(other))
    .filter((other): other is Person => Boolean(other));

  // A menu is a passing thing: it is closed when this screen is hidden.
  useLayoutEffect(() => {
    const details = ref.current;
    return () => {
      if (details) details.open = false;
    };
  }, []);

  if (!person) return null;

  // The switch above and "See it as" change who is viewed; the session stays whoever signed in.
  const signedInAs = demo.session && demo.session.name !== person.name ? demo.session.name : null;

  const close = (focus: boolean) => {
    if (ref.current) ref.current.open = false;
    if (focus) summaryRef.current?.focus();
  };

  const become = (other: PersonId) => {
    if (role === "architect") demo.setViewer("architect", other as "vikram" | "ananya");
    else if (role === "site") demo.setViewer("site", other as "suresh" | "manjunath");
    else if (role === "finance") demo.setViewer("finance", other as "prakash" | "divya");
    close(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDetailsElement>) => {
    if (event.key === "Escape" && ref.current?.open) {
      event.stopPropagation();
      close(true);
    }
  };

  const item = "flex min-h-11 w-full cursor-pointer items-center rounded-xl px-2.5 text-left text-17 hover:bg-white/70";
  // A quiet line under signing out: what the portal keeps, for anyone who asks.
  const quiet = "flex min-h-11 w-full items-center rounded-xl px-2.5 text-left text-15 text-ink-soft hover:bg-white/70";

  const viewAs = others.length > 0 && (
    <div role="group" aria-labelledby={`demo-${role}-${variant}`}>
      <p id={`demo-${role}-${variant}`} className="lettering px-2.5 text-ink-soft">
        View as
      </p>
      <ul className="mt-1">
        {others.map((other) => (
          <li key={other.id}>
            <button type="button" className={item} onClick={() => become(other.id)}>
              {other.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const panel = (
    <div
      className={`glass-pop absolute top-full z-40 mt-2 grid gap-2 p-1.5 text-ink ${
        spread ? "max-lg:inset-x-0 lg:right-0 lg:w-[min(20rem,calc(100vw-32px))]" : "right-0 w-[min(20rem,calc(100vw-32px))]"
      }`}
    >
      <p className="px-2.5 pt-1.5 text-15">
        <span className="block font-semibold">{person.name}</span>
        <span className="block text-ink-soft">{personTitle(person, firm)}</span>
        {signedInAs && <span className="block text-13 text-ink-soft">Signed in as {signedInAs}</span>}
      </p>
      {viewAs}
      <ul className="border-t border-ink/10 pt-1">
        <li>
          <Link href={`/help/${role}`} className={item} onNavigate={() => close(false)}>
            Guide
          </Link>
        </li>
        <li>
          <SignOutButton className={item} onDone={() => close(false)} />
        </li>
        <li>
          <Link href="/privacy" className={quiet} onNavigate={() => close(false)}>
            Privacy
          </Link>
        </li>
      </ul>
    </div>
  );

  if (variant === "rail") {
    // The rail already has the guide and signing out in its foot, so the person block opens
    // only when there is someone else to view as; otherwise it is a plain block. The avatar
    // stands on the rail's one left edge, under the mark.
    const who = (
      <>
        <span
          aria-hidden="true"
          className="row-span-2 grid size-9 place-items-center rounded-full bg-rosewood text-13 font-semibold text-lime"
        >
          {initials(person.name)}
        </span>
        <span className="truncate text-15 font-semibold leading-snug">{person.name}</span>
        <span className="line-clamp-2 text-13 leading-snug text-ink-soft">{personTitle(person, firm)}</span>
      </>
    );
    const block = "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 rounded-xl px-3.5 py-2";

    if (!viewAs) {
      return (
        <div className={block}>
          {who}
          {signedInAs && <span className="col-start-2 text-13 text-ink-soft">Signed in as {signedInAs}</span>}
        </div>
      );
    }

    return (
      <details ref={ref} className="relative" onKeyDown={onKeyDown}>
        <summary
          ref={summaryRef}
          className={`${block} cursor-pointer list-none hover:bg-white/55 [&::-webkit-details-marker]:hidden`}
        >
          {who}
        </summary>
        <div className="glass-pop absolute inset-x-0 top-full z-40 mt-1 grid gap-2 p-1.5 text-ink">
          {signedInAs && <p className="px-2.5 pt-1.5 text-13 text-ink-soft">Signed in as {signedInAs}</p>}
          {viewAs}
        </div>
      </details>
    );
  }

  return (
    <details ref={ref} className={`shrink-0 ${spread ? "max-lg:static lg:relative" : "relative"}`} onKeyDown={onKeyDown}>
      <summary
        ref={summaryRef}
        className="person-button grid size-11 cursor-pointer list-none place-items-center rounded-full bg-lime/12 text-15 font-semibold hover:bg-lime/20 [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true">{initials(person.name)}</span>
        <span className="sr-only">{person.name}, your menu</span>
      </summary>
      {panel}
    </details>
  );
}
