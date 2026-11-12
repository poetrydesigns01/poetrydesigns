import type { ReactNode, RefObject } from "react";

// The frame of a client page. The table is rosewood and holds the house, its instrument
// and the sentence under it. Paper holds sheets of words, stacked like a drawing set.
// On a phone the order is head, table, paper. From 1024 px the table stands still at the
// left and the head and the sheets scroll beside it. The layout is in globals.css.

export function ClientPage({
  head,
  table,
  tableRef,
  children,
}: {
  /** The headline sentence, one line of status and the due action. */
  head: ReactNode;
  /** The house and what goes with it. Leave it out for a page with no table. */
  table?: ReactNode;
  /** Put on the table, so an approve control can make the house follow a hold. */
  tableRef?: RefObject<HTMLDivElement | null>;
  /** The sheets. */
  children: ReactNode;
}) {
  return (
    <div className={`client-page${table ? " client-split" : ""}`}>
      <div className="client-head on-dark bg-rosewood text-lime">
        <div className="client-inner">{head}</div>
      </div>
      {table && (
        <div ref={tableRef} className="client-table on-dark bg-rosewood text-lime">
          <div className="client-inner">{table}</div>
        </div>
      )}
      <div className="client-paper">{children}</div>
    </div>
  );
}

const sheetTones = {
  lime: "bg-lime",
  paper: "bg-paper",
  sand: "bg-sand-2",
} as const;

function SheetFrame({
  id,
  title,
  intro,
  tone = "lime",
  rule,
  ruled = false,
  children,
}: {
  id?: string;
  title: string;
  intro?: string;
  tone?: keyof typeof sheetTones;
  rule: boolean;
  ruled?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`sheet ${sheetTones[tone]}`}>
      <div className="sheet-inner px-4 py-9 sm:px-8 sm:py-12">
        <h2 className="display display-md">{title}</h2>
        {intro && <p className="mt-2 max-w-[68ch] text-ink-soft">{intro}</p>}
        <div className={`${rule ? "sheet-body mt-5 border-t border-ink pt-5" : "mt-6"}${ruled ? " ruled" : ""}`}>
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * A full-width sheet of words: square, no shadow, an ink rule under its title. Rows in a
 * list with the class "sheet-rows" are set apart by 20 px of space. A table of figures
 * (a schedule, an estimate, a ledger) is `ruled`: its rows get sand rules between them.
 */
export function Sheet({
  id,
  title,
  intro,
  tone,
  ruled,
  children,
}: {
  id?: string;
  title: string;
  intro?: string;
  /** "sand" is the quiet ground for decided things. */
  tone?: keyof typeof sheetTones;
  /** Sand rules between the rows: for tables of figures only. */
  ruled?: boolean;
  children: ReactNode;
}) {
  return (
    <SheetFrame id={id} title={title} intro={intro} tone={tone} rule ruled={ruled}>
      {children}
    </SheetFrame>
  );
}

/** A sheet for the pages that still draw their own rule under the title. */
export function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <SheetFrame title={title} intro={intro} rule={false}>
      {children}
    </SheetFrame>
  );
}

/** The brown band that opens a page without a table. */
export function PageBand({ title, lede, children }: { title: string; lede?: string; children?: ReactNode }) {
  return (
    <section className="on-dark bg-rosewood text-lime">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-12">
        <h1 className="display display-lg max-w-3xl">{title}</h1>
        {lede && <p className="mt-4 max-w-2xl text-17 text-lime/80">{lede}</p>}
        {children}
      </div>
    </section>
  );
}

const statusStyles = {
  due: "text-brass",
  done: "text-kota",
  alert: "text-brick",
  quiet: "text-ink-soft",
} as const;

/** Status is always written out in words; colour only reinforces it. */
export function Status({ tone, children }: { tone: keyof typeof statusStyles; children: ReactNode }) {
  return <span className={`font-semibold ${statusStyles[tone]}`}>{children}</span>;
}
