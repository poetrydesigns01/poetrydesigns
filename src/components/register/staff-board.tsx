"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { TODAY } from "@/lib/demo-data";
import { weekdayDate } from "@/lib/format";
import { PersonMenu } from "./person-menu";
import { ProjectSwitch } from "./project-switch";
import { useStaffRole } from "./staff-shell";

// The rosewood head of every staff page: the place and the date, one headline, one state
// line, at most one primary button, and from 1024 px the project chip with the one
// picture under it. On a phone the board is the top of the screen, so it also carries the
// wordmark, the chip and the person menu in its first row.

export function StaffBoard({
  place,
  headline,
  state,
  primary,
  picture,
  pictureWords,
  chip = true,
  back,
}: {
  /** "Today". */
  place: string;
  headline: string;
  /** One sentence that does not repeat the headline's count. */
  state?: string;
  primary?: { label: string; href?: string; onClick?: () => void };
  /** One instrument for this page. */
  picture?: ReactNode;
  /** Its words, in lettering under it. */
  pictureWords?: string;
  /** Show the project switch. Default true. */
  chip?: boolean;
  /** "Back to Today", on shared routes such as a project record. */
  back?: { label: string; href: string };
}) {
  const role = useStaffRole();

  const button = primary ? (
    primary.href ? (
      <Link href={primary.href} onClick={primary.onClick} className="btn btn-primary min-h-12 w-full sm:w-auto">
        {primary.label}
      </Link>
    ) : (
      <button type="button" onClick={primary.onClick} className="btn btn-primary min-h-12 w-full sm:w-auto">
        {primary.label}
      </button>
    )
  ) : null;

  const figure = picture ? (
    <figure className="board-picture">
      {picture}
      {pictureWords && <figcaption className="lettering board-words">{pictureWords}</figcaption>}
    </figure>
  ) : null;

  return (
    <header className="board on-dark">
      {/* A phone has no rail: the wordmark, the chip and the person menu head the board. The
          row is the anchor of the project list, so the list opens under the whole row. */}
      <div className="relative -mt-2 flex min-h-12 items-center justify-between gap-2 lg:hidden">
        <p className="display shrink-0 text-22 leading-none max-[359px]:text-17">Poetry Designs</p>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {chip && <ProjectSwitch role={role} />}
          <PersonMenu role={role} variant="button" />
        </div>
      </div>

      <div className="board-text">
        {back && (
          <Link href={back.href} className="link inline-flex min-h-11 items-center self-start text-15 text-lime/80">
            {back.label}
          </Link>
        )}
        <p className="lettering text-lime/75">
          {place}, {weekdayDate(TODAY)}
        </p>
        <h1 className="display text-balance text-22 lg:text-32">{headline}</h1>
        {state && <p className="max-w-[60ch] text-15 text-lime/80">{state}</p>}
        {figure && <div className="mt-2 lg:hidden">{figure}</div>}
        {button && <div className="mt-2">{button}</div>}
      </div>

      {(chip || figure) && (
        // .board-side sets its own display, so the wrapper is what hides it on a phone.
        <div className="hidden lg:block">
          <div className="board-side">
            {chip && <ProjectSwitch role={role} />}
            {figure}
          </div>
        </div>
      )}
    </header>
  );
}
