import Link from "next/link";
import { ResetDemo } from "@/components/reset-demo";

const views = [
  {
    href: "/client",
    who: "Meera Iyer, homeowner",
    what: "Her home at a glance: what is agreed, what needs her next, and what a change would cost.",
  },
  {
    href: "/staff/requests",
    who: "Suresh Gowda, site engineer",
    what: "Raising a material request from site, on a phone.",
  },
  {
    href: "/staff/tasks",
    who: "Ananya Rao, architect",
    what: "Her own task sheet: what is due, what came back, and the hours logged.",
  },
];

export default function DemoEntry() {
  return (
    <main className="on-dark flex flex-1 flex-col bg-rosewood text-lime">
      <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8 sm:py-16">
        <p className="display text-[1.375rem] leading-none">Poetry Designs</p>
        <h1 className="display display-lg mt-12 max-w-2xl">Pick a person to see the portal through their eyes</h1>
        <p className="mt-4 max-w-xl text-[1.125rem] text-lime/80">
          This is a design demo. Every name, address and amount is sample data, and nothing you do here is saved beyond
          this browser tab.
        </p>

        <ul className="mt-10 border-t border-lime/40">
          {views.map((view) => (
            <li key={view.href} className="border-b border-lime/20">
              <Link href={view.href} className="group grid gap-x-10 gap-y-1 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-baseline">
                <span className="display text-[1.625rem] leading-tight group-hover:text-brass-light">{view.who}</span>
                <span className="text-lime/80">{view.what}</span>
              </Link>
            </li>
          ))}
        </ul>

        <ResetDemo />
      </div>
    </main>
  );
}
