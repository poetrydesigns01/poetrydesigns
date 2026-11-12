"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { Firm } from "@/lib/firm";
import { ROLE_PEOPLE, type Person, type PersonId, type StaffRole } from "@/lib/firm-data";
import { viewerIdOf } from "./project-switch";

// Who you are on this screen, and in the demo, who else you could be. In the rail it opens
// from the person block; on a phone, from the initials button in the board. Choosing the
// other person for the role changes the page in place, with no navigation.

/** "Senior architect, Project Head": the title, and the Project Head flag when it holds. */
export function personTitle(person: Person, firm: Firm): string {
  const head = firm.projects.some((p) => p.phase !== "draft" && p.team.head === person.id);
  return head ? `${person.title}, Project Head` : person.title;
}

/** The same in a sentence: "senior architect and Project Head". */
function titleWords(person: Person, firm: Firm): string {
  const title = person.title.charAt(0).toLowerCase() + person.title.slice(1);
  const head = firm.projects.some((p) => p.phase !== "draft" && p.team.head === person.id);
  return head ? `${title} and Project Head` : title;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

export function PersonMenu({ role, variant = "button" }: { role: StaffRole; variant?: "rail" | "button" }) {
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

  const item = "flex min-h-11 w-full cursor-pointer items-center px-2 text-left text-17 hover:bg-sand-2";

  const panel = (
    <div
      className={
        variant === "rail"
          ? "absolute inset-x-0 top-full z-40 mt-1 grid gap-3 border border-ink bg-paper p-2 text-ink"
          : "absolute right-0 top-full z-40 mt-2 grid w-[min(20rem,calc(100vw-32px))] gap-3 border border-ink bg-paper p-3 text-ink"
      }
    >
      <p className="px-2 text-15">
        You are {person.name}, {titleWords(person, firm)}.
      </p>
      <div role="group" aria-labelledby={`demo-${role}-${variant}`}>
        <p id={`demo-${role}-${variant}`} className="lettering px-2 text-ink-soft">
          Demo: see the portal as someone else
        </p>
        <ul className="mt-1">
          {others.map((other) => (
            <li key={other.id}>
              <button type="button" className={item} onClick={() => become(other.id)}>
                {other.name}, {titleWords(other, firm)}
              </button>
            </li>
          ))}
          <li>
            <Link href="/" className={item} onNavigate={() => close(false)}>
              Pick another role
            </Link>
          </li>
        </ul>
      </div>
      <ul className="border-t border-sand pt-2">
        <li>
          <Link href={`/help/${role}`} className={item} onNavigate={() => close(false)}>
            Guide for this screen
          </Link>
        </li>
        <li>
          <Link href="/" className={item} onNavigate={() => close(false)}>
            Switch person
          </Link>
        </li>
      </ul>
    </div>
  );

  if (variant === "rail") {
    return (
      <details ref={ref} className="relative" onKeyDown={onKeyDown}>
        <summary
          ref={summaryRef}
          className="grid cursor-pointer list-none gap-0.5 px-3 py-2 hover:bg-sand-2 [&::-webkit-details-marker]:hidden"
        >
          <span className="text-17 font-semibold leading-snug">{person.name}</span>
          <span className="text-15 text-ink-soft">{personTitle(person, firm)}</span>
        </summary>
        {panel}
      </details>
    );
  }

  return (
    <details ref={ref} className="relative shrink-0" onKeyDown={onKeyDown}>
      <summary
        ref={summaryRef}
        className="person-button grid size-11 cursor-pointer list-none place-items-center rounded-[3px] bg-lime/12 text-15 font-semibold hover:bg-lime/20 [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true">{initials(person.name)}</span>
        <span className="sr-only">{person.name}, your menu</span>
      </summary>
      {panel}
    </details>
  );
}
