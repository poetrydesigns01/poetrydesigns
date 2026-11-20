/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import Link from "next/link";
import { StatusChip } from "@/components/register/status-chip";
import type { NextAction } from "./data";
import { ArrowIcon } from "./icons";

// The one most urgent thing for the client, with one button, and the thing after it as a
// quiet link. The screen's only dark panel.

const KINDS: [string, string, string][] = [
  ["pay", "payment", "payments"],
  ["design", "design", "designs"],
  ["fee", "cost", "costs"],
  ["change", "change", "changes"],
  ["letter", "letter", "letters"],
];

/** What else waits, by kind: "+2 designs · +2 changes". */
function moreWords(rest: NextAction[]): string {
  return KINDS.map(([kind, one, many]) => {
    const count = rest.filter((a) => a.key.startsWith(`${kind}:`)).length;
    return count === 0 ? "" : `+${count} ${count === 1 ? one : many}`;
  })
    .filter(Boolean)
    .join(" · ");
}

export function NextActionCard({ actions }: { actions: NextAction[] }) {
  const next = actions[0];
  const then = actions[1];
  const more = moreWords(actions.slice(2));

  return (
    <section className="glass-dark flex flex-col gap-4 p-5 sm:p-6" aria-labelledby="next-title">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="lettering text-lime/75">Next for you</p>
        {more && (
          <span className="glass-chip">
            <span className="sr-only">Also waiting: </span>
            {more}
          </span>
        )}
      </div>
      {next ? (
        <>
          <div className="grid gap-1">
            <h2 id="next-title" className="display text-32">
              {next.title}
            </h2>
            <p className="text-17 text-lime/80">{next.subject}</p>
          </div>
          <div>
            <StatusChip tone={next.chip.tone}>{next.chip.words}</StatusChip>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3">
            <Link href={next.href} className="btn btn-primary gap-2">
              {next.cta}
              <ArrowIcon />
            </Link>
            {then && (
              <Link
                href={then.href}
                className="group inline-flex min-h-11 min-w-0 items-center gap-2 rounded-xl text-15 text-lime/80 hover:text-lime"
              >
                <span className="lettering text-lime/60">Then</span>
                <span className="truncate font-semibold">{then.title}</span>
                <ArrowIcon />
              </Link>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-1">
            <h2 id="next-title" className="display text-32">
              All clear
            </h2>
            <p className="text-17 text-lime/80">Nothing needs you</p>
          </div>
          <div>
            <StatusChip tone="done">Up to date</StatusChip>
          </div>
          <Link href="/client/updates" className="btn btn-primary mt-auto gap-2 self-start">
            See updates
            <ArrowIcon />
          </Link>
        </>
      )}
    </section>
  );
}
