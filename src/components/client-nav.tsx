"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/client", label: "Home" },
  { href: "/client/designs", label: "Designs" },
  { href: "/client/payments", label: "Payments" },
  { href: "/client/changes", label: "Changes" },
  { href: "/client/hours", label: "Hours" },
];

function isActive(pathname: string, href: string) {
  return href === "/client" ? pathname === "/client" : pathname.startsWith(href);
}

export function ClientNav() {
  const pathname = usePathname();

  return (
    <>
      <header className="on-dark no-print bg-rosewood text-lime">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link href="/client" className="display text-[1.375rem] leading-none">
            Poetry Designs
          </Link>
          <nav aria-label="Main" className="hidden gap-1 md:flex">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-[3px] px-3.5 py-2 text-[1rem] ${
                    active ? "bg-lime/12 font-semibold text-lime" : "text-lime/75 hover:text-lime"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Link href="/" className="text-[0.9375rem] text-lime/75 hover:text-lime">
            Meera Iyer
          </Link>
        </div>
      </header>

      {/* Phones get the same five places as a bar within thumb reach. */}
      <nav
        aria-label="Main"
        className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-sand bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 items-center justify-center border-t-2 text-[0.875rem] ${
                active ? "border-rosewood font-semibold text-ink" : "border-transparent text-ink-soft"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
