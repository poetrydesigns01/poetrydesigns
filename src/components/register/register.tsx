"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { PegGlyph } from "@/components/instruments/glyphs";
import { TODAY } from "@/lib/demo-data";
import { useDemo } from "@/lib/demo-store";
import type { StampView } from "@/lib/firm";
import { datePart } from "@/lib/format";
import { EmptyQuiet } from "./empty-quiet";
import { RowPauseBar, useRowPause } from "./recording-pause";
import { CarbonLine, Stamp } from "./stamp";

// The register: a ruled list on paper, the one object the staff side is built around.
// Every row has a turn margin on its left, set off by a laterite rule like an account
// book's: whose turn it is, or how long the item has waited. A row holds at most one
// action; after it is recorded, the row carries the stamp and its carbon line.

/** The path part of an href, without its query or hash. */
function pathOf(href: string): string {
  return href.split(/[?#]/)[0];
}

/**
 * A register sheet. After `limit` rows (5 by default) a "Show all" button shows the rest.
 * When "See it as" has chosen one of its rows, every row is shown so that row can be found.
 */
export function Register({
  title,
  id,
  empty,
  limit = 5,
  children,
}: {
  title: string;
  id?: string;
  /** Said when there are no rows. Without it an empty register is not drawn at all. */
  empty?: string;
  limit?: number;
  children: ReactNode;
}) {
  const [all, setAll] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const { focusRow } = useDemo();
  const pathname = usePathname();
  const rows = Children.toArray(children);
  if (rows.length === 0 && !empty) return null;
  const holdsFocus =
    focusRow !== null &&
    pathOf(focusRow.href) === pathname &&
    rows.some((row) => isValidElement(row) && (row.props as { id?: unknown }).id === focusRow.id);
  const shown = all || holdsFocus ? rows : rows.slice(0, limit);
  const hidden = rows.length - shown.length;

  return (
    <section id={id} className="register" aria-label={title}>
      <h2 className="register-title">{title}</h2>
      {rows.length === 0 ? (
        <EmptyQuiet>{empty}</EmptyQuiet>
      ) : (
        <ul ref={listRef} tabIndex={-1} className="outline-none">
          {shown}
        </ul>
      )}
      {hidden > 0 && (
        <button
          type="button"
          className="btn btn-quiet mt-2 w-full sm:w-auto"
          onClick={() => {
            // The button goes once every row shows, so focus moves to the first row it
            // brought in: its link or button, else the list, never the page itself.
            flushSync(() => setAll(true));
            const list = listRef.current;
            const first = list?.children[shown.length];
            const target = first?.querySelector<HTMLElement>("a[href], button") ?? list;
            target?.focus();
          }}
        >
          Show all ({rows.length})
        </button>
      )}
    </section>
  );
}

/** The turn margin: time alone in your own register, whose turn and how long in a waiting one. */
function Turn({
  margin,
  marginSub,
  client,
  overdue,
}: {
  margin: string;
  marginSub?: string;
  client?: boolean;
  overdue?: boolean;
}) {
  return (
    <div className="turn lettering" data-overdue={overdue || margin === "Overdue" ? "" : undefined}>
      <span className="turn-words inline-flex items-center gap-1.5">
        {client && <PegGlyph size={12} />}
        {margin}
      </span>
      {marginSub && <span className="text-ink-soft">{marginSub}</span>}
    </div>
  );
}

/**
 * The newest stamp with its carbon line, when it was pressed today; the earlier ones behind
 * "History (n)". A row whose newest stamp is older keeps every stamp behind History, so a
 * register shows what moved today and stays short.
 */
function StampSlot({ stamps, fresh }: { stamps: StampView[]; fresh: boolean }) {
  const [newest] = stamps;
  if (!newest) return null;
  const today = datePart(newest.at) === TODAY;
  const earlier = today ? stamps.slice(1) : stamps;
  return (
    <div className="reg-stamps mt-2 grid justify-items-start gap-1">
      {today && (
        <>
          {/* Keyed by the stamp, so a newer one is a new element and its press can play. */}
          <Stamp key={`${newest.at}-${newest.words}`} stamp={newest} fresh={fresh} />
          <CarbonLine stamp={newest} />
        </>
      )}
      {earlier.length > 0 && (
        <details className="lettering">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-ink-soft underline decoration-1 underline-offset-4">
            History ({earlier.length})
          </summary>
          <ul className="grid justify-items-start gap-1.5 pb-1">
            {earlier.map((stamp, i) => (
              <li key={`${stamp.at}-${i}`}>
                <Stamp stamp={stamp} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * One row. Either a whole-row link (`href`, no action) or a row with one action. `children`
 * is the inline panel the action opens. A row whose id was chosen by "See it as" outlines
 * itself and comes into view. The staff shell clears the choice when the path moves on.
 * With `href`, the title is wrapped in the link, so it must not hold a link of its own.
 */
export function RegisterRow({
  id,
  margin,
  marginSub,
  client,
  overdue,
  title,
  sentence,
  figure,
  instrument,
  href,
  action,
  stamps,
  children,
}: {
  id: string;
  margin: string;
  marginSub?: string;
  client?: boolean;
  overdue?: boolean;
  title: ReactNode;
  sentence?: ReactNode;
  /** One figure, on one line at the right of the title. */
  figure?: string;
  /** A 120 px strip or stack: at the right from 1024 px, under the sentence below. */
  instrument?: ReactNode;
  href?: string;
  action?: ReactNode;
  /** Newest first. */
  stamps?: StampView[];
  children?: ReactNode;
}) {
  const demo = useDemo();
  const pathname = usePathname();
  const ref = useRef<HTMLLIElement>(null);
  const pause = useRowPause(id);
  const focusRow = demo.focusRow;
  const focused = focusRow !== null && focusRow.id === id && pathOf(focusRow.href) === pathname;

  // Brought into view once, when "See it as" lands here.
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "center" });
  }, [focused]);

  const linked = Boolean(href) && !action;
  const titleLine = (
    // The figure keeps to the title's line while both fit, and drops under it when they do not.
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <h3 className="min-w-0 max-w-[68ch] flex-[1_1_12rem] text-17 font-semibold leading-snug">
        {linked && href ? (
          <Link href={href} className="reg-link">
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      {figure && <span className="figure shrink-0 whitespace-nowrap text-17">{figure}</span>}
    </div>
  );

  return (
    <li ref={ref} className="reg-item" data-row-id={id} data-focus={focused ? "" : undefined}>
      <div className="reg-row" data-link={linked ? "" : undefined} onClickCapture={pause.onClickCapture}>
        <Turn margin={margin} marginSub={marginSub} client={client} overdue={overdue} />
        <div className="reg-body">
          {titleLine}
          {sentence && <p className="max-w-[56ch] text-15 text-ink-soft">{sentence}</p>}
          {stamps && stamps.length > 0 && <StampSlot stamps={stamps} fresh={pause.fresh} />}
        </div>
        {instrument && <div className="reg-instrument">{instrument}</div>}
        {action && !linked && <div className="reg-action">{action}</div>}
        {Children.toArray(children).length > 0 && <div className="reg-panel">{children}</div>}
        <RowPauseBar rowId={id} />
      </div>
    </li>
  );
}
