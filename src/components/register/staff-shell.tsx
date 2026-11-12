"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { Settle } from "@/components/settle";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { StaffRole } from "@/lib/firm-data";
import { countWord } from "@/lib/format";
import { PersonMenu } from "./person-menu";
import { scopeFor, viewerIdOf } from "./project-switch";
import { PauseBar, PauseProvider } from "./recording-pause";

// Poetry's site office. From 1024 px a rail of places at the left: the wordmark, the person,
// the places and a foot. On a phone the rail goes; each page's board is the top of the
// screen and a tab bar of at most four places runs along the bottom. The shell also holds
// the one pause provider for every staff screen.

/** `short` is the tab bar's word on the narrowest phones, where four tabs share 320 px. */
export type Place = { label: string; href: string; leads?: boolean; short?: string };

const ROOT: Record<StaffRole, string> = {
  bd: "/staff/bd",
  architect: "/staff/architect",
  site: "/staff/site",
  finance: "/staff/finance",
  admin: "/staff/admin",
};

/** The role's place name, under the wordmark. */
export const PLACE_NAME: Record<StaffRole, string> = {
  bd: "Business development",
  architect: "Studio",
  site: "Site",
  finance: "Office",
  admin: "Admin",
};

/** The places in each role's rail, in order. `leads` places show to seniors only. */
export const PLACES: Record<StaffRole, Place[]> = {
  bd: [
    { label: "Today", href: "/staff/bd" },
    { label: "Onboard", href: "/staff/bd/onboard" },
    { label: "Projects", href: "/staff/bd/projects" },
    { label: "Hours asked", short: "Hours", href: "/staff/bd/hours" },
  ],
  architect: [
    { label: "Desk", href: "/staff/architect" },
    { label: "Designs", href: "/staff/architect/designs" },
    { label: "Tasks", href: "/staff/architect/tasks" },
    { label: "Team", href: "/staff/architect/team", leads: true },
  ],
  site: [
    { label: "Today", href: "/staff/site" },
    { label: "Request", href: "/staff/site/request" },
    { label: "My requests", href: "/staff/site/requests" },
    { label: "Tasks", href: "/staff/site/tasks" },
  ],
  finance: [
    { label: "Today", href: "/staff/finance" },
    { label: "Requests", href: "/staff/finance/requests" },
    { label: "Money in", href: "/staff/finance/money" },
    { label: "Money out", href: "/staff/finance/costs" },
    { label: "Vendors", href: "/staff/finance/vendors" },
    { label: "Team", href: "/staff/finance/team", leads: true },
  ],
  admin: [
    { label: "Today", href: "/staff/admin" },
    { label: "Projects", href: "/staff/admin/projects" },
    { label: "People", href: "/staff/admin/people" },
    { label: "Setup", href: "/staff/admin/setup" },
    { label: "Log", href: "/staff/admin/log" },
    { label: "Performance", href: "/staff/admin/performance" },
  ],
};

const ROLES = Object.keys(ROOT) as StaffRole[];

/** True when `path` is `href` or lies under it. */
function under(path: string, href: string): boolean {
  return path === href || path.startsWith(`${href}/`);
}

/** The role a path belongs to, or null for shared staff routes such as a project record. */
export function roleOfPath(pathname: string): StaffRole | null {
  return ROLES.find((role) => under(pathname, ROOT[role])) ?? null;
}

const StaffRoleContext = createContext<StaffRole | null>(null);

/**
 * The role the current staff screen is seen as: from the path on a role's own routes, and
 * the last role used on shared routes such as `/staff/projects/[id]`.
 */
export function useStaffRole(): StaffRole {
  const fromShell = useContext(StaffRoleContext);
  const pathname = usePathname();
  const { lastRole } = useDemo();
  return fromShell ?? roleOfPath(pathname) ?? lastRole;
}

/** The active place: a list place the path lies under, else Today for the role's own routes. */
function activeHref(pathname: string, role: StaffRole, places: Place[]): string | null {
  const list = places.slice(1).find((place) => under(pathname, place.href));
  if (list) return list.href;
  return under(pathname, ROOT[role]) ? ROOT[role] : null;
}

/** "Requests, four waiting" for the screen reader; the ring shows the figure. */
function Count({ n, ring }: { n: number; ring: "rail-count" | "tab-count" }) {
  if (n <= 0) return null;
  return (
    <>
      <span className={ring} aria-hidden="true">
        {n}
      </span>
      <span className="sr-only">, {countWord(n)} waiting</span>
    </>
  );
}

/** The "More" tab on a phone: the places that did not fit, the guide and the way out. */
function MoreSheet({ places, role, active }: { places: Place[]; role: StaffRole; active: string | null }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const holds = places.some((place) => place.href === active);

  useLayoutEffect(() => {
    const details = ref.current;
    return () => {
      if (details) details.open = false;
    };
  }, []);

  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  const item = "flex min-h-12 items-center px-4 text-17 hover:bg-sand-2";

  return (
    <details
      ref={ref}
      className="flex min-w-0"
      onKeyDown={(event) => {
        if (event.key === "Escape" && ref.current?.open) {
          // Closing the sheet is all Escape does here: a pause that is running keeps running.
          event.stopPropagation();
          close();
          summaryRef.current?.focus();
        }
      }}
    >
      <summary
        ref={summaryRef}
        className="staff-tab flex-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden"
        aria-current={holds ? "page" : undefined}
      >
        More
      </summary>
      <div className="fixed inset-x-0 bottom-[calc(var(--tab-h)+env(safe-area-inset-bottom))] z-20 border-t border-ink bg-paper pb-2 pt-3">
        <ul>
          {places.map((place) => (
            <li key={place.href}>
              <Link
                href={place.href}
                className={`${item} aria-[current=page]:font-semibold`}
                aria-current={place.href === active ? "page" : undefined}
                onNavigate={close}
              >
                {place.label}
              </Link>
            </li>
          ))}
          <li className={places.length > 0 ? "mt-1 border-t border-sand pt-1" : undefined}>
            <Link href={`/help/${role}`} className={item} onNavigate={close}>
              Guide for this screen
            </Link>
          </li>
          <li>
            <Link href="/" className={item} onNavigate={close}>
              Switch person
            </Link>
          </li>
        </ul>
      </div>
    </details>
  );
}

export function StaffShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const demo = useDemo();
  const firm = useFirm();
  const own = roleOfPath(pathname);
  const role = own ?? demo.lastRole;

  // The shell remembers the last role used, so a shared route such as a project record
  // keeps that role's places.
  const { setLastRole } = demo;
  useEffect(() => {
    if (own) setLastRole(own);
  }, [own, setLastRole]);

  // "See it as" outlines one row for the visit it starts. The shell stays mounted between
  // staff screens, so it clears the choice once the path is no longer the one it points to.
  // It runs on a change of path only and reads the latest choice through a ref, so setting a
  // new one before the navigation lands does not clear it.
  const focus = useRef({ row: demo.focusRow, clear: () => demo.setFocusRow(null) });
  useLayoutEffect(() => {
    focus.current = { row: demo.focusRow, clear: () => demo.setFocusRow(null) };
  });
  useEffect(() => {
    const { row, clear } = focus.current;
    if (row && row.href.split(/[?#]/)[0] !== pathname) clear();
  }, [pathname]);

  const personId = viewerIdOf(role, demo.viewers);
  const person = firm.person(personId);
  const places = PLACES[role].filter((place) => !place.leads || person?.senior);
  const active = own ? activeHref(pathname, role, places) : null;
  const scope = scopeFor(role, personId, demo.scope, firm);
  const turns = firm.turns(personId, scope);

  // Today counts every row in "Your turn". A list place counts the rows that open on it.
  const countOf = (place: Place, index: number) =>
    index === 0 ? turns.length : turns.filter((item) => under(item.href.split(/[?#]/)[0], place.href)).length;

  const tabs = places.length === 4 ? places : places.slice(0, 3);
  const more = places.length === 4 ? [] : places.slice(3);
  const siteBar = pathname === "/staff/site";

  return (
    <StaffRoleContext value={role}>
      <PauseProvider>
        {/* The server draws the starting state; a tab that holds events takes them up as it
            wakes, and nothing fills or moves for that. */}
        <Settle>
          <div className="staff-shell" data-site-bar={siteBar ? "" : undefined} data-site={role === "site" ? "" : undefined}>
            <aside className="staff-rail">
              <div className="px-6">
                <p className="display text-22 leading-none">Poetry Designs</p>
                <p className="lettering mt-2 text-ink-soft">{PLACE_NAME[role]}</p>
              </div>
              <div className="mt-6 px-3">
                <PersonMenu role={role} variant="rail" />
              </div>
              <nav aria-label="Places" className="mt-4">
                <ul>
                  {places.map((place, index) => (
                    <li key={place.href}>
                      <Link
                        href={place.href}
                        className="rail-place"
                        aria-current={place.href === active ? "page" : undefined}
                      >
                        <span>{place.label}</span>
                        <Count n={countOf(place, index)} ring="rail-count" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <ul className="rail-foot text-15">
                <li>
                  <Link href={`/help/${role}`} className="link inline-flex min-h-11 items-center text-ink-soft">
                    Guide for this screen
                  </Link>
                </li>
                <li>
                  <Link href="/" className="link inline-flex min-h-11 items-center text-ink-soft">
                    Switch person
                  </Link>
                </li>
              </ul>
            </aside>

            <main className="staff-main">{children}</main>

            {siteBar && (
              <Link href="/staff/site/request" className="site-bar no-print">
                Request material
              </Link>
            )}

            <nav aria-label="Places" className="staff-tabs no-print">
              {tabs.map((place) => (
                <Link
                  key={place.href}
                  href={place.href}
                  className="staff-tab"
                  aria-current={place.href === active ? "page" : undefined}
                >
                  {place.short ? (
                    <>
                      <span className="truncate max-[359px]:hidden">{place.label}</span>
                      <span className="truncate min-[360px]:hidden">{place.short}</span>
                    </>
                  ) : (
                    <span className="truncate">{place.label}</span>
                  )}
                  <Count n={countOf(place, places.indexOf(place))} ring="tab-count" />
                </Link>
              ))}
              {more.length > 0 || places.length < 4 ? <MoreSheet places={more} role={role} active={active} /> : null}
            </nav>

            <PauseBar />
          </div>
        </Settle>
      </PauseProvider>
    </StaffRoleContext>
  );
}
