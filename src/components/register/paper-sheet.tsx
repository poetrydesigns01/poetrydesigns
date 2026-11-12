import type { ReactNode } from "react";

// An A4 sheet of white paper: a material report, an estimate. When it is printed, it is
// the only thing on the page (see "paper-sheet" in globals.css); sample tags stay on screen.
// A quiet sheet drops its frame, for a client page that keeps its rules few.

export function PaperSheet({ children, title, quiet = false }: { children: ReactNode; title: string; quiet?: boolean }) {
  return (
    <article className="paper-sheet" aria-label={title} data-quiet={quiet ? "" : undefined}>
      {children}
    </article>
  );
}
