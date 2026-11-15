/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { stageChip } from "@/components/admin/admin-data";
import { Icon, Meter } from "@/components/admin/glass-kit";
import { ProjectMark } from "@/components/instruments/project-mark";
import { PersonMenu } from "@/components/register/person-menu";
import { PLACES, useStaffRole } from "@/components/register/staff-shell";
import { StatusChip } from "@/components/register/status-chip";
import { useFirm } from "@/lib/demo-store";
import { templateOf, type ProjectId, type StaffRole } from "@/lib/firm-data";

// The project record's frame: a glass header with the project's name, code, category, its
// stage and how far the payment stages have come, then the row of tabs as glass pills. A
// tab a role may not open is not drawn. A draft shows how far its setting up has gone.

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
  const stages = draft ? [] : firm.payments(p.id);
  const paid = stages.filter((s) => s.state === "paid").length;

  return (
    <>
      <header className="glass mt-3 grid gap-3 p-4 sm:p-5 lg:mt-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-end lg:gap-6">
        {/* A phone has no rail: the wordmark and the person menu head the page. */}
        <div className="-mt-1 flex min-h-12 items-center justify-between gap-2 border-b border-ink/10 pb-2 lg:col-span-2 lg:hidden">
          <p className="display shrink-0 text-22 leading-none text-ink">Poetry Designs</p>
          <PersonMenu role={role} variant="button" />
        </div>

        <div className="grid min-w-0 gap-2">
          <Link href={home.href} className="link inline-flex min-h-11 items-center gap-1.5 self-start text-15 text-ink-soft">
            <Icon name="arrow" className="size-4 rotate-180" />
            {home.label}
          </Link>
          <div className="flex items-center gap-3">
            <ProjectMark projectId={p.id} tone="light" className="w-12 shrink-0 sm:w-14" />
            <h1 className="display min-w-0 text-balance text-22 text-ink lg:text-32">{p.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {p.code && <span className="glass-chip">{p.code}</span>}
            <span className="glass-chip">{category}</span>
            <StatusChip tone={draft ? "locked" : p.phase === "handed-over" ? "done" : "progress"}>
              {draft ? "Draft" : stageChip(p)}
            </StatusChip>
            <a
              href={p.maps}
              target="_blank"
              rel="noreferrer"
              className="link inline-flex min-h-11 items-center gap-1 px-1 text-13 text-ink-soft"
            >
              <Icon name="pin" className="size-3.5" />
              Map
            </a>
          </div>
        </div>

        {!draft && stages.length > 0 && (
          <div className="glass-inner hidden gap-2 p-3 sm:grid">
            <p className="flex items-baseline justify-between gap-3">
              <span className="lettering text-ink-soft">Instalments paid</span>
              <span className="figure text-17">
                {paid} / {stages.length}
              </span>
            </p>
            <Meter value={paid / stages.length} tone="done" label="Instalments received" />
          </div>
        )}
      </header>

      {draft ? (
        <>
          <section aria-label="Set up" className="glass mt-5 grid gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-17 font-semibold">Being set up</h2>
              {draftView && <StatusChip tone="waiting">{`${draftView.stepsDone} of 4 steps`}</StatusChip>}
            </div>
            {draftView && <Meter value={draftView.stepsDone / 4} tone="progress" label="Set-up steps done" />}
            <p>
              <Link href="/staff/bd/onboard/kulkarni" className="btn btn-glass min-h-11 px-4 text-15">
                Open the draft
              </Link>
            </p>
          </section>
          {/* The tab still renders, out of sight, so the route keeps its page segment. */}
          <div hidden>{children}</div>
        </>
      ) : (
        <>
          {/* A phone scrolls the row sideways inside itself; from 768 px the pills wrap. */}
          <nav
            ref={navRef}
            aria-label="Project record"
            className="glass mt-4 overflow-x-auto rounded-3xl p-1 [scrollbar-width:none] md:overflow-visible [&::-webkit-scrollbar]:hidden"
          >
            <ul className="flex min-w-max gap-1 md:min-w-0 md:flex-wrap">
              {tabs.map((t) => (
                <li key={t.label}>
                  <Link
                    ref={t === active ? activeRef : undefined}
                    href={`${base}${t.path}`}
                    aria-current={t === active ? "page" : undefined}
                    className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-15 text-ink transition-colors duration-150 hover:bg-white/60 aria-[current=page]:bg-rosewood aria-[current=page]:font-semibold aria-[current=page]:text-lime"
                  >
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-5">{children}</div>
        </>
      )}
    </>
  );
}

/** What a role that may not see the money reads on the Money tab. */
export function NotForRole({ children }: { children: string }) {
  return (
    <p className="glass flex items-center gap-2 p-4 text-15 text-ink-soft">
      <Icon name="lock" />
      {children}
    </p>
  );
}
