"use client";

import Link from "next/link";
import { House } from "@/components/house/house";
import { Settle } from "@/components/settle";
import { useDemo } from "@/lib/demo-store";
import type { DemoState } from "@/lib/demo-store";

// The first frame anyone sees. One house, as it stands in this tab, and the six people who
// work on it. Picking a person sets who the portal is seen as, then opens their screen.

type Viewer = { [R in keyof DemoState["viewers"]]: { role: R; person: DemoState["viewers"][R] } }[keyof DemoState["viewers"]];

type Row = {
  href: string;
  who: string;
  what: string;
  as?: Viewer;
  second?: { who: string; as: Viewer };
};

const ROWS: Row[] = [
  {
    href: "/client",
    who: "Meera Iyer, homeowner",
    what: "Approves drawings, stages, payments and changes for her two houses.",
  },
  {
    href: "/staff/bd",
    who: "Rohan Menon, business development",
    what: "Opens each new client's project, sets up the team and adds bought hours.",
  },
  {
    href: "/staff/architect",
    who: "Vikram Desai, senior architect and Project Head",
    what: "Raises payments and cost revisions, and reviews his juniors' work.",
    as: { role: "architect", person: "vikram" },
    second: { who: "Ananya Rao, junior architect", as: { role: "architect", person: "ananya" } },
  },
  {
    href: "/staff/site",
    who: "Suresh Gowda, site engineer",
    what: "Orders material, posts site photos and marks stages done, from his phone.",
    as: { role: "site", person: "suresh" },
    second: { who: "Manjunath K, junior site engineer", as: { role: "site", person: "manjunath" } },
  },
  {
    href: "/staff/finance",
    who: "Prakash Hegde, procurement and finance",
    what: "Links Zoho purchase orders to site requests and tracks what each site has on order.",
    as: { role: "finance", person: "prakash" },
    second: { who: "Divya Shenoy, accountant, who records money in and out", as: { role: "finance", person: "divya" } },
  },
  {
    href: "/staff/admin",
    who: "Shalini Murthy, operations head and admin",
    what: "Sees every project's margin and cash, and sets up people and templates.",
  },
];

export default function DemoEntry() {
  const demo = useDemo();

  const become = (as?: Viewer) => {
    if (!as) return;
    if (as.role === "architect") demo.setViewer("architect", as.person);
    else if (as.role === "site") demo.setViewer("site", as.person);
    else demo.setViewer("finance", as.person);
  };

  return (
    <main className="on-dark flex flex-1 flex-col bg-rosewood text-lime">
      <Settle>
        <div className="mx-auto grid w-full max-w-6xl flex-1 gap-y-8 px-4 pb-12 pt-6 sm:px-8 sm:pt-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:gap-y-10">
          <div className="lg:col-start-1">
            <p className="display text-22 leading-none">Poetry Designs</p>
            <h1 className="display mt-8 text-32 sm:mt-12">Pick a person</h1>
            <p className="mt-3 max-w-[44ch] text-15 text-lime/80">
              A design demo with sample data and no back end. Nothing you do is saved beyond this browser tab.
            </p>
          </div>

          {/* The list. Each row opens that person's screen; a second person for the role sits under it. */}
          <nav aria-label="People" className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-1">
            <ul className="grid gap-5 lg:pt-[4.25rem]">
              {ROWS.map((row) => (
                <li key={row.href}>
                  <Link
                    href={row.href}
                    onClick={() => become(row.as)}
                    className="relative block py-1 before:absolute before:inset-y-1 before:-left-4 before:w-0.5 before:bg-lime before:opacity-0 before:[transition:opacity_var(--dur-tap)_var(--ease-lime)] hover:before:opacity-100 focus-visible:before:opacity-100 sm:before:-left-5"
                  >
                    <span className="display block text-22 leading-tight underline decoration-lime/40 decoration-1 underline-offset-[0.2em]">
                      {row.who}
                    </span>
                    <span className="mt-1 block max-w-[52ch] text-15 text-lime/80">{row.what}</span>
                  </Link>
                  {row.second && (
                    <Link
                      href={row.href}
                      onClick={() => become(row.second?.as)}
                      className="link inline-flex min-h-11 items-center text-15 text-lime/80 hover:text-lime"
                    >
                      Or as {row.second.who}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            <ul className="mt-8 grid gap-0.5 text-15 text-lime/80">
              <li>
                <Link href="/follow" className="link inline-flex min-h-11 items-center hover:text-lime">
                  Follow one payment from site to bank
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="link inline-flex min-h-11 items-center hover:text-lime">
                  See the sign-in screen
                </Link>
              </li>
            </ul>
          </nav>

          {/* The house as it stands in this tab, with no marks: the one picture on the screen. */}
          <div className="w-full max-w-[max(calc(34svh*1.64),294px)] self-start lg:col-start-1 lg:row-start-2 lg:max-w-[36rem]">
            <House labels scene={{ only: [], stringLabel: true }} />
          </div>
        </div>
      </Settle>
    </main>
  );
}
