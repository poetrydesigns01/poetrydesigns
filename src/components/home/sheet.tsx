"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useDemo } from "@/lib/demo-store";

// The client's sheets of paper: square, no shadow, one ink rule under the title. The title
// is 22, so a screen keeps to four type sizes above the fold. Rows in a list with the class
// "sheet-rows" are set apart by 20 px of space; a table of figures is `ruled`.

const TONES = {
  lime: "bg-lime",
  paper: "bg-paper",
  sand: "bg-sand-2",
} as const;

export function Sheet({
  id,
  title,
  tone = "lime",
  ruled = false,
  children,
}: {
  id?: string;
  title: string;
  /** "sand" is the quiet ground for decided things. */
  tone?: keyof typeof TONES;
  /** Sand rules between the rows: for tables of figures only. */
  ruled?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`sheet scroll-mt-4 ${TONES[tone]}`}>
      <div className="sheet-inner px-4 py-8 sm:px-8 sm:py-10">
        <h2 className="display text-22">{title}</h2>
        <div className={`sheet-body mt-4 border-t border-ink pt-5${ruled ? " ruled" : ""}`}>{children}</div>
      </div>
    </section>
  );
}

/** The row "See it as" chose on this page, if any: its id while the chosen path is this one. */
export function useFocusedId(): string | null {
  const { focusRow } = useDemo();
  const pathname = usePathname();
  return focusRow && focusRow.href.split(/[?#]/)[0] === pathname ? focusRow.id : null;
}

/**
 * Wraps the item "See it as" landed on: a 2 px rosewood outline, and brought into view once
 * when it is chosen. Any other time it is a plain box.
 */
export function FocusTarget({
  on,
  className,
  children,
}: {
  on: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (on) ref.current?.scrollIntoView({ block: "center" });
  }, [on]);

  return (
    <div
      ref={ref}
      className={className}
      data-focus-row={on ? "" : undefined}
      style={on ? { outline: "var(--focus-row)", outlineOffset: 6 } : undefined}
    >
      {children}
    </div>
  );
}
