"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { ProgrammeStrip } from "@/components/instruments/programme-strip";
import { ProjectMark } from "@/components/instruments/project-mark";
import { PersonMenu } from "@/components/register/person-menu";
import { SampleTag } from "@/components/register/sample-tag";
import { PLACES, useStaffRole } from "@/components/register/staff-shell";
import { TODAY } from "@/lib/demo-data";
import { useFirm } from "@/lib/demo-store";
import { templateOf, type ProjectId, type StaffRole } from "@/lib/firm-data";
import { weekdayDate } from "@/lib/format";

// The project record's frame: one rosewood board for every tab, holding the project's name,
// its code, category and address, and as the picture the house drawn at its stage over its
// programme strip; then the row of tabs. A tab a role may not open is not drawn. Kulkarni
// Eco Home, still a draft, shows how far its setting up has gone instead of tabs.

type Tab = { label: string; path: string; roles?: StaffRole[] };

const TABS: Tab[] = [
  { label: "Overview", path: "" },
  { label: "Programme", path: "/programme" },
  { label: "Updates", path: "/updates" },
  { label: "Designs", path: "/designs" },
  { label: "Materials", path: "/materials" },
  { label: "Estimate", path: "/estimate" },
  { label: "Hours", path: "/hours" },
  { label: "Money", path: "/money", roles: ["finance", "admin"] },
  { label: "Log", path: "/log" },
];

/** Whether a role may open the Money tab. */
export function seesMoney(role: StaffRole): boolean {
  return role === "finance" || role === "admin";
}

export function ProjectFrame({ projectId, children }: { projectId: ProjectId; children: ReactNode }) {
  const firm = useFirm();
  const role = useStaffRole();
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  // On a phone the open tab may sit past the edge of the scrolling row: bring it into view.
  useEffect(() => {
    const nav = navRef.current;
    const tab = activeRef.current;
    if (!nav || !tab || nav.scrollWidth <= nav.clientWidth) return;
    const left = tab.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
    const right = left + tab.offsetWidth;
    if (left < nav.scrollLeft || right > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = Math.max(0, left - (nav.clientWidth - tab.offsetWidth) / 2);
    }
  }, [pathname]);
  const p = firm.project(projectId);
  if (!p) return null;

  const base = `/staff/projects/${p.id}`;
  const tabs = TABS.filter((t) => !t.roles || t.roles.includes(role));
  // Matched against every tab, so a tab this role may not open is never shown as another.
  const active = TABS.find((t) => t.path !== "" && pathname.startsWith(`${base}${t.path}`)) ?? TABS[0];
  const home = PLACES[role][0];
  const draft = p.phase === "draft";
  const draftView = firm.drafts.find((d) => d.id === "kulkarni");
  const category = templateOf(p.category).name;

  return (
    <>
      <header className="board on-dark">
        {/* A phone has no rail: the wordmark and the person menu head the board. */}
        <div className="-mt-2 flex min-h-12 items-center justify-between gap-2 lg:hidden">
          <p className="display shrink-0 text-22 leading-none">Poetry Designs</p>
          <PersonMenu role={role} variant="button" />
        </div>

        <div className="board-text">
          <Link href={home.href} className="link inline-flex min-h-11 items-center self-start text-15 text-lime/80">
            Back to {home.label}
          </Link>
          <p className="lettering text-lime/75">
            {draft ? "Project record" : active.label}, {weekdayDate(TODAY)}
          </p>
          <div className="flex items-end gap-4">
            {/* From 1024 px the house is drawn large at the right instead. */}
            <ProjectMark projectId={p.id} tone="dark" className="w-[56px] shrink-0 lg:hidden" />
            <h1 className="display text-balance text-22 lg:text-32">{p.name}</h1>
          </div>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-15 text-lime/80">
            {p.code ? (
              <>
                <span>{p.code}</span>
                <span className="text-lime">
                  <SampleTag>Sample code</SampleTag>
                </span>
              </>
            ) : (
              <span>No project code until it is opened.</span>
            )}
            <span>{category}.</span>
            {/* The address is on the Overview too; on a phone the board keeps to the essentials. */}
            <span className="hidden sm:inline">{p.address}.</span>
          </p>
          <p className="flex flex-wrap gap-x-4 text-15">
            <a
              href={p.maps}
              target="_blank"
              rel="noreferrer"
              className="link inline-flex min-h-11 items-center text-lime"
            >
              Open in Google Maps
            </a>
            <span className="hidden min-h-11 items-center text-lime/80 sm:inline-flex">
              Coordinates {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
            </span>
          </p>
          {/* .board-picture sets its own display, so the wrapper is what hides it from 1024 px. */}
          {!draft && (
            <div className="mt-2 lg:hidden">
              <figure className="board-picture">
                <ProgrammeStrip cells={p.strip} size={264} tone="dark" label={p.stageWords} />
                <figcaption className="lettering board-words">{p.stageWords}</figcaption>
              </figure>
            </div>
          )}
        </div>

        {!draft && (
          // Set at the foot of the board, level with the name and the address, not the back link.
          <div className="hidden lg:block lg:self-end">
            <div className="board-side">
              <figure className="board-picture justify-items-start">
                <div className="grid gap-3" style={{ maxHeight: "none" }}>
                  <ProjectMark
                    projectId={p.id}
                    tone="dark"
                    className="w-[160px] shrink-0"
                    title={`${p.name}, drawn at its stage`}
                  />
                  <ProgrammeStrip cells={p.strip} size={264} tone="dark" label={p.stageWords} />
                </div>
                <figcaption className="lettering board-words">{p.stageWords}</figcaption>
              </figure>
            </div>
          </div>
        )}
      </header>

      {draft ? (
        <>
          <section className="mt-8 grid max-w-[60ch] gap-3">
            <p className="text-17">
              This project is still being set up by {firm.person(p.onboardedBy)?.name ?? "business development"}.{" "}
              {draftView ? `${draftView.stepsDone} of 4 steps are done.` : ""}
            </p>
            {draftView && <p className="text-15 text-ink-soft">{draftView.missing}</p>}
            <p>
              <Link href="/staff/bd/onboard/kulkarni" className="link inline-flex min-h-11 items-center text-17">
                Open the draft
              </Link>
            </p>
          </section>
          {/* The tab still renders, out of sight, so the route keeps its page segment. */}
          <div hidden>{children}</div>
        </>
      ) : (
        <>
          {/* A phone scrolls the row sideways, its scrollbar hidden and the open tab brought into
              view; from 768 px the tabs wrap, so none is ever out of reach. */}
          <nav
            ref={navRef}
            aria-label="Project record"
            className="-mx-4 mt-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
          >
            <ul className="flex min-w-max gap-2 border-b border-sand pb-3 md:min-w-0 md:flex-wrap md:gap-1.5 lg:gap-1">
              {tabs.map((t) => (
                <li key={t.label}>
                  <Link
                    ref={t === active ? activeRef : undefined}
                    href={`${base}${t.path}`}
                    aria-current={t === active ? "page" : undefined}
                    className="inline-flex min-h-11 items-center whitespace-nowrap bg-sand-2 px-4 text-15 md:px-3 aria-[current=page]:bg-rosewood aria-[current=page]:text-lime lg:bg-transparent lg:px-3 lg:aria-[current=page]:bg-transparent lg:aria-[current=page]:font-semibold lg:aria-[current=page]:text-ink lg:aria-[current=page]:shadow-[inset_0_-3px_0_var(--color-rosewood)] lg:hover:bg-sand-2"
                  >
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-8">{children}</div>
        </>
      )}
    </>
  );
}

/** What a role that may not see the money reads on the Money tab. */
export function NotForRole({ children }: { children: string }) {
  return <p className="py-4 text-17 text-ink-soft">{children}</p>;
}
