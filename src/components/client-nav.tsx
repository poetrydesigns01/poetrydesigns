/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { SignOutButton } from "@/components/sign-out";
import { useDemo, useFirm, useProjection } from "@/lib/demo-store";
import { countWord } from "@/lib/format";

// The client's shell: a glass bar along the top with the wordmark, her house, her places
// and a menu under her name; below 1024 px the places are a glass tab bar at the bottom,
// within thumb reach. Each house stays separate, so there is no house switch: the client
// always sees Iyer Residence. Counts sit on the places only.

type Place = { href: string; label: string; icon: ReactNode };

/** The client only ever sees her own house. */
const CLIENT_PROJECT = "iyer" as const;

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const PLACES: Place[] = [
  {
    href: "/client",
    label: "Home",
    icon: (
      <Icon>
        <path d="M3.5 9.5 10 4l6.5 5.5V16a.5.5 0 0 1-.5.5h-3.5v-4h-5v4H4a.5.5 0 0 1-.5-.5z" {...stroke} />
      </Icon>
    ),
  },
  {
    href: "/client/timeline",
    label: "Timeline",
    icon: (
      <Icon>
        <rect x="3.5" y="4.5" width="13" height="12" rx="2" {...stroke} />
        <path d="M3.5 8.5h13M7 3v3M13 3v3M7 12h2M11 12h2" {...stroke} />
      </Icon>
    ),
  },
  {
    href: "/client/updates",
    label: "Updates",
    icon: (
      <Icon>
        <path d="M4.5 4.5h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3.5 3v-3h-1a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" {...stroke} />
      </Icon>
    ),
  },
  {
    href: "/client/designs",
    label: "Designs",
    icon: (
      <Icon>
        <path d="M4 16.5V4l12.5 12.5zM7 13.5h2.5V11" {...stroke} />
      </Icon>
    ),
  },
  {
    href: "/client/payments",
    label: "Payments",
    icon: (
      <Icon>
        <path d="M6 4h8.5M6 7.5h8.5M6 4h2.5a3.5 3.5 0 0 1 0 7H6l6.5 5.5" {...stroke} />
      </Icon>
    ),
  },
  {
    href: "/client/changes",
    label: "Changes",
    icon: (
      <Icon>
        <path d="M4 7h11.5L12.5 4M16 13H4.5l3 3" {...stroke} />
      </Icon>
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  // Home owns only itself; every other place owns the pages under it.
  if (href === PLACES[0].href) return false;
  return pathname.startsWith(`${href}/`);
}

function waitingWords(count: number) {
  return count === 1 ? "one thing waiting" : `${countWord(count)} things waiting`;
}

/** Closes a disclosure from inside it. */
function close(ref: RefObject<HTMLDetailsElement | null>) {
  if (ref.current) ref.current.open = false;
}

/** Escape closes the disclosure it is pressed in. */
function closeOnEscape(event: KeyboardEvent<HTMLDetailsElement>) {
  const details = event.currentTarget;
  if (event.key !== "Escape" || !details.open) return;
  event.stopPropagation();
  details.open = false;
  if (details.firstElementChild instanceof HTMLElement) details.firstElementChild.focus();
}

function Count({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <>
      <span className="nav-count" aria-hidden="true">
        {count}
      </span>
      <span className="sr-only">, {waitingWords(count)}</span>
    </>
  );
}

/** Her name, holding her hours, her record, the guide and the way out. */
function NameMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const { session } = useDemo();
  const links = [
    { href: "/client/hours", label: "Your hours" },
    { href: "/client/record", label: "Agreement and decisions" },
    { href: "/help/client", label: "Guide" },
  ];
  // Staff who used "See it as" are still signed in as themselves.
  const other = session && session.role !== "client" ? session.name : null;

  return (
    <details ref={ref} className="relative shrink-0" onKeyDown={closeOnEscape}>
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full py-1 pl-1 pr-1 text-15 hover:bg-white/50 sm:pr-3 [&::-webkit-details-marker]:hidden">
        <span
          className="grid size-9 place-items-center rounded-full bg-rosewood text-13 font-semibold text-lime"
          aria-hidden="true"
        >
          MI
        </span>
        <span className="max-sm:sr-only">Meera Iyer</span>
      </summary>
      <ul className="glass-pop absolute right-0 top-full z-40 mt-2 w-[min(17rem,calc(100vw-32px))] p-1.5 text-ink">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-11 items-center rounded-xl px-3 text-17 hover:bg-white/70"
              onClick={() => close(ref)}
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li className="mt-1 border-t border-ink/10 pt-1">
          {other && <p className="px-3 pt-2 text-13 text-ink-soft">Signed in as {other}</p>}
          <SignOutButton
            className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-17 hover:bg-white/70"
            onDone={() => close(ref)}
          />
        </li>
      </ul>
    </details>
  );
}

export function ClientNav() {
  const pathname = usePathname();
  const projection = useProjection();
  const firm = useFirm();
  const demo = useDemo();

  // "See it as" chose a row on a page. Once the path moves on, the choice is cleared. It
  // runs on a change of path only, and reads the latest choice through a ref.
  const focus = useRef({ row: demo.focusRow, clear: () => demo.setFocusRow(null) });
  useLayoutEffect(() => {
    focus.current = { row: demo.focusRow, clear: () => demo.setFocusRow(null) };
  });
  useEffect(() => {
    const { row, clear } = focus.current;
    if (row && row.href.split(/[?#]/)[0] !== pathname) clear();
  }, [pathname]);

  // How many things wait in each place, counted the way each page counts them. Home, Timeline
  // and Updates never carry a count.
  const designsWaiting = firm
    .designStages(CLIENT_PROJECT)
    .flatMap((stage) => (stage.locked ? [] : stage.items))
    .filter((item) => item.status === "waiting").length;
  const paymentsWaiting =
    firm.payments(CLIENT_PROJECT).filter((stage) => stage.canMarkPaid || stage.canRequestLetter).length +
    projection.waiting.filter((item) => item.kind === "schedule").length;
  const counts: Record<string, number> = {
    "/client/designs": designsWaiting,
    "/client/payments": paymentsWaiting,
    "/client/changes": projection.pending.length,
  };

  return (
    <>
      <header className="client-bar no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:gap-6">
          <Link href="/client" className="flex min-h-11 min-w-0 shrink-0 items-baseline gap-3">
            <span className="display text-22 leading-none max-[359px]:text-17">Poetry Designs</span>
            <span className="lettering truncate text-ink-soft max-sm:hidden">Iyer Residence</span>
          </Link>
          <nav aria-label="Main" className="hidden min-w-0 flex-1 justify-center gap-1 lg:flex">
            {PLACES.map((place) => (
              <Link
                key={place.href}
                href={place.href}
                aria-current={isActive(pathname, place.href) ? "page" : undefined}
                className="client-place"
              >
                {place.label}
                <Count count={counts[place.href] ?? 0} />
              </Link>
            ))}
          </nav>
          <NameMenu />
        </div>
      </header>

      {/* Phones and tablets get the same places as a glass bar within thumb reach. */}
      <nav aria-label="Main" className="client-tabs no-print">
        <div
          className="mx-auto grid w-full px-1"
          style={{ gridTemplateColumns: `repeat(${PLACES.length}, minmax(0, 1fr))`, maxWidth: `${PLACES.length * 7}rem` }}
        >
          {PLACES.map((place) => (
            <Link
              key={place.href}
              href={place.href}
              aria-current={isActive(pathname, place.href) ? "page" : undefined}
              className="client-tab lettering"
            >
              <span className="client-tab-icon">{place.icon}</span>
              <span className="max-w-full truncate">{place.label}</span>
              <Count count={counts[place.href] ?? 0} />
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
