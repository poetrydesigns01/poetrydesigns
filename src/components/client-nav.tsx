"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { useDemo, useProjection } from "@/lib/demo-store";
import { countWord } from "@/lib/format";

// The client's header: the wordmark, the house she is looking at, her places and a menu
// under her name. Counts sit on the places only. On a phone the places are a bar at the
// bottom, within thumb reach.

type Place = { href: string; label: string };

const RESIDENCE: Place[] = [
  { href: "/client", label: "Home" },
  { href: "/client/updates", label: "Updates" },
  { href: "/client/designs", label: "Designs" },
  { href: "/client/payments", label: "Payments" },
  { href: "/client/changes", label: "Changes" },
];

const COTTAGE: Place[] = [
  { href: "/client/farm-cottage", label: "Home" },
  { href: "/client/farm-cottage/estimate", label: "Estimate" },
];

const HOUSES = [
  { id: "iyer", name: "Iyer Residence", short: "Residence", href: "/client" },
  { id: "iyer-cottage", name: "Iyer Farm Cottage", short: "Cottage", href: "/client/farm-cottage" },
] as const;

function isActive(pathname: string, href: string, places: Place[]) {
  if (pathname === href) return true;
  // A place owns the pages under it, unless another place is a closer match.
  if (href === places[0].href) return false;
  return pathname.startsWith(`${href}/`) && !places.some((p) => p.href !== href && p.href.length > href.length && pathname.startsWith(p.href));
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

/** The brass inlay under the place she is in. One per bar; it slides when she moves. */
function Inlay({ index, count, edge }: { index: number; count: number; edge: "top" | "bottom" }) {
  return (
    <span
      className={`nav-inlay nav-inlay-${edge}`}
      data-off={index < 0 ? "" : undefined}
      style={{ width: `${100 / count}%`, transform: `translateX(${Math.max(index, 0) * 100}%)` }}
      aria-hidden="true"
    />
  );
}

/** Which house the portal is showing. Meera has two, so she gets the chip. */
function HouseChip({ cottage }: { cottage: boolean }) {
  const demo = useDemo();
  const router = useRouter();
  const ref = useRef<HTMLDetailsElement>(null);
  const current = cottage ? HOUSES[1] : HOUSES[0];

  return (
    <details ref={ref} className="relative min-w-0" onKeyDown={closeOnEscape}>
      <summary className="inline-flex min-h-11 max-w-full cursor-pointer list-none items-center gap-2 whitespace-nowrap rounded-[3px] bg-lime/12 px-3 text-15 hover:bg-lime/20 max-[399px]:gap-1.5 max-[399px]:px-2 [&::-webkit-details-marker]:hidden">
        <span className="sr-only">House: </span>
        {/* The narrowest phones show the short name, so the chip keeps to one line. */}
        <span className="truncate max-[399px]:hidden">{current.name}</span>
        <span className="truncate min-[400px]:hidden" aria-hidden="true">
          {current.short}
        </span>
        <svg viewBox="0 0 10 6" className="h-1.5 w-2.5 shrink-0" aria-hidden="true" focusable="false">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </summary>
      <ul className="absolute right-0 top-full z-40 mt-1 w-[min(15rem,calc(100vw-32px))] bg-paper py-1 lg:right-auto lg:left-0 text-ink shadow-[0_0_0_1px_var(--color-ink)]">
        {HOUSES.map((house) => (
          <li key={house.id}>
            <button
              type="button"
              aria-current={house.id === current.id ? "true" : undefined}
              className={`flex min-h-11 w-full cursor-pointer items-center px-4 text-left text-17 hover:bg-sand-2 ${
                house.id === current.id ? "font-semibold" : ""
              }`}
              onClick={() => {
                demo.setClientProject(house.id);
                close(ref);
                router.push(house.href);
              }}
            >
              {house.name}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Her name, holding what used to be places of their own. */
function NameMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const links = [
    { href: "/client/hours", label: "Your hours" },
    { href: "/client/record", label: "Your agreement and every decision" },
    { href: "/help/client", label: "Guide for this screen" },
    { href: "/", label: "Switch person" },
  ];

  return (
    <details ref={ref} className="relative shrink-0" onKeyDown={closeOnEscape}>
      <summary className="inline-flex min-h-11 min-w-11 whitespace-nowrap cursor-pointer list-none items-center justify-center rounded-[3px] px-2 text-15 text-lime/85 hover:text-lime [&::-webkit-details-marker]:hidden">
        <span className="max-sm:hidden">Meera Iyer</span>
        <span className="sm:hidden" aria-hidden="true">
          MI
        </span>
        <span className="sr-only sm:hidden">Meera Iyer</span>
      </summary>
      <ul className="absolute right-0 top-full z-40 mt-1 w-[min(18rem,calc(100vw-32px))] bg-paper py-1 text-ink shadow-[0_0_0_1px_var(--color-ink)]">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex min-h-11 items-center px-4 text-17 hover:bg-sand-2"
              onClick={() => close(ref)}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function ClientNav() {
  const pathname = usePathname();
  const projection = useProjection();
  const demo = useDemo();
  const cottage = pathname.startsWith("/client/farm-cottage");
  const places = cottage ? COTTAGE : RESIDENCE;
  const activeIndex = places.findIndex((place) => isActive(pathname, place.href, places));

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

  // How many things wait in each place. Home and Updates never carry a count.
  const money = projection.waiting.filter((item) => item.kind === "stage" || item.kind === "payment" || item.kind === "schedule");
  const counts: Record<string, number> = cottage
    ? {}
    : {
        "/client/designs": projection.designs.filter((design) => design.status === "awaiting").length,
        "/client/payments": money.length > 0 ? 1 : 0,
        "/client/changes": projection.pending.length,
      };

  return (
    <>
      <header className="on-dark no-print bg-rosewood text-lime">
        {/* From 1024 px the header runs the full width, as the table and paper below it do. */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 max-[359px]:gap-2 sm:px-8 md:py-3 lg:max-w-none lg:gap-6">
          <div className="flex min-w-0 items-center gap-3 max-[359px]:gap-2 lg:gap-5">
            <Link href={places[0].href} className="display inline-flex min-h-11 shrink-0 items-center text-22 leading-none max-[359px]:text-17">
              Poetry Designs
            </Link>
            <HouseChip cottage={cottage} />
          </div>
          <nav
            aria-label="Main"
            className="relative hidden min-w-0 max-w-[36rem] flex-1 lg:grid"
            style={{ gridTemplateColumns: `repeat(${places.length}, minmax(0, 1fr))` }}
          >
            {places.map((place, index) => {
              const active = index === activeIndex;
              const count = counts[place.href] ?? 0;
              return (
                <Link
                  key={place.href}
                  href={place.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap text-15 ${
                    active ? "font-semibold text-lime" : "text-lime/75 hover:text-lime"
                  }`}
                >
                  {place.label}
                  {count > 0 && (
                    <>
                      <span className="nav-count" aria-hidden="true">
                        {count}
                      </span>
                      <span className="sr-only">, {waitingWords(count)}</span>
                    </>
                  )}
                </Link>
              );
            })}
            <Inlay index={activeIndex} count={places.length} edge="bottom" />
          </nav>
          <NameMenu />
        </div>
      </header>

      {/* Phones and tablets get the same places as a bar within thumb reach. */}
      <nav
        aria-label="Main"
        className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-sand bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {/* On a tablet the places keep a phone tab's width, centred, as on the staff bar. */}
        <div
          className="relative mx-auto grid w-full"
          style={{ gridTemplateColumns: `repeat(${places.length}, minmax(0, 1fr))`, maxWidth: `${places.length * 10}rem` }}
        >
          {places.map((place, index) => {
            const active = index === activeIndex;
            const count = counts[place.href] ?? 0;
            return (
              <Link
                key={place.href}
                href={place.href}
                aria-current={active ? "page" : undefined}
                className={`lettering flex min-h-14 min-w-0 items-center justify-center focus-visible:outline-offset-[-3px] ${active ? "font-semibold text-ink" : "text-ink-soft"}`}
              >
                <span className="relative whitespace-nowrap">
                  {place.label}
                  {count > 0 && (
                    <>
                      <span className="nav-count nav-count-badge" aria-hidden="true">
                        {count}
                      </span>
                      <span className="sr-only">, {waitingWords(count)}</span>
                    </>
                  )}
                </span>
              </Link>
            );
          })}
          <Inlay index={activeIndex} count={places.length} edge="top" />
        </div>
      </nav>
    </>
  );
}
