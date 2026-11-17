/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { TODAY } from "@/lib/demo-data";
import { weekdayDate } from "@/lib/format";
import { PersonMenu } from "./person-menu";
import { ProjectSwitch } from "./project-switch";
import { useStaffRole } from "./staff-shell";

// The head of every staff page, one compact rosewood glass hero: the place and the date,
// one short headline, at most one state line and one primary button, and from 1024 px the
// project chip with the one picture under it. On a phone the board is the top of the
// screen, so it also carries the wordmark, the chip and the person menu in its first row.

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

  const aside = chip || Boolean(figure);

  return (
    <header className="board on-dark" data-side={aside ? undefined : button ? "button" : "none"}>
      {/* A phone has no rail: the wordmark, the chip and the person menu head the board. The
          row is the anchor of the project list, so the list opens under the whole row. */}
      <div className="relative -mt-1 flex min-h-12 items-center justify-between gap-2 border-b border-lime/10 pb-2 lg:hidden">
        <p className="flex min-w-0 shrink-0">
          <Brand />
        </p>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {chip && <ProjectSwitch role={role} />}
          <PersonMenu role={role} variant="button" spread />
        </div>
      </div>

      <div className="board-text">
        {back && (
          <Link href={back.href} className="link inline-flex min-h-11 items-center self-start text-15 text-lime/80">
            {back.label}
          </Link>
        )}
        {/* A back link already says where the page sits, so it takes the eyebrow's place. */}
        {!back && (
          <p className="lettering text-lime/70">
            {place} · {weekdayDate(TODAY)}
          </p>
        )}
        {/* The headline leads the board: 22 px on a phone, 32 px beside the rail, above the
            stat figures under it. */}
        <h1 className="display display-md text-balance">{headline}</h1>
        {state && <p className="max-w-[60ch] text-15 text-lime/80">{state}</p>}
        {figure && <div className="mt-2 lg:hidden">{figure}</div>}
        {button && <div className={`mt-2${aside ? "" : " lg:hidden"}`}>{button}</div>}
      </div>

      {aside && (
        // .board-side sets its own display, so the wrapper is what hides it on a phone. With
        // no picture the chip stands level with the headline, not up in the corner.
        <div className={`hidden lg:block${figure ? "" : " self-center"}`}>
          <div className="board-side">
            {chip && <ProjectSwitch role={role} />}
            {figure}
          </div>
        </div>
      )}
      {/* With nothing else at the right, the primary button stands there, level with the
          headline, so the board is never a bare dark slab. */}
      {!aside && button && <div className="hidden self-center justify-self-end lg:block">{button}</div>}
    </header>
  );
}
