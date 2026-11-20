/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ProjectMark } from "@/components/instruments/project-mark";
import { StatusChip } from "@/components/register/status-chip";
import { projectStageChip, type ProjectThumbnail } from "@/lib/desk";
import { useFirm } from "@/lib/demo-store";
import type { ProjectView } from "@/lib/firm";
import type { Tone } from "@/lib/portal";

// A project you can pick out at a glance: its picture (the uploaded 3D elevation, else the
// house drawn as far as it is built) at a fixed 4:3, its name, code and stage. "tile" for a
// grid, "row" for a list. The whole card is one link.

export type TileBadge = { words: string; tone: Tone };

/** The picture alone, filling a 4:3 box. Decoration: the name beside it says what it is. */
export function ProjectPicture({
  project,
  thumbnail,
  className = "",
}: {
  project: ProjectView;
  thumbnail: ProjectThumbnail;
  className?: string;
}) {
  return (
    <span className={`glass-inner relative block aspect-[4/3] overflow-hidden ${className}`} aria-hidden>
      {thumbnail.kind === "upload" ? (
        <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${thumbnail.src}")` }} />
      ) : (
        <span className="absolute inset-0 grid place-items-center bg-sand/40 p-[12%]">
          <ProjectMark projectId={project.id} className="h-auto w-full" />
        </span>
      )}
    </span>
  );
}

export function ProjectTile({
  project,
  size = "tile",
  href,
  badge,
  showStage = true,
  className = "",
}: {
  project: ProjectView;
  size?: "tile" | "row";
  /** Defaults to the staff project page. */
  href?: string;
  /** One chip beside the stage ("2 urgent", "NPS 5"), or any small node. */
  badge?: TileBadge | ReactNode;
  /** False when the badge already says the stage ("Held for instalment 5" beside "Held"). */
  showStage?: boolean;
  className?: string;
}) {
  const firm = useFirm();
  const thumbnail = firm.thumbnail(project.id);
  const stage = projectStageChip(project);
  const link = href ?? `/staff/projects/${project.id}`;
  const extra =
    badge && typeof badge === "object" && "words" in badge && "tone" in badge ? (
      <StatusChip tone={(badge as TileBadge).tone}>{(badge as TileBadge).words}</StatusChip>
    ) : (
      (badge as ReactNode)
    );

  if (size === "row") {
    // The name keeps at least 9rem: when the chips leave it less, they wrap under it (a phone,
    // a narrow column) instead of squeezing it to a few letters.
    return (
      <Link
        href={link}
        className={`glass-row grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3 px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-laterite ${className}`}
      >
        <ProjectPicture project={project} thumbnail={thumbnail} />
        <span className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <span className="grid min-w-0 flex-[1_1_9rem] gap-0.5">
            <span className="truncate text-15 text-ink">{project.name}</span>
            {project.code && <span className="lettering truncate text-ink-soft">{project.code}</span>}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            {extra}
            {showStage && <StatusChip tone={stage.tone}>{stage.words}</StatusChip>}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={link}
      className={`glass group grid gap-3 p-3 outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-laterite ${className}`}
    >
      <ProjectPicture project={project} thumbnail={thumbnail} />
      <span className="grid gap-0.5 px-1">
        <span className="truncate text-17 text-ink">{project.name}</span>
        {project.code && <span className="lettering truncate text-ink-soft">{project.code}</span>}
      </span>
      <span className="flex flex-wrap items-center gap-1.5 px-1 pb-1">
        {showStage && <StatusChip tone={stage.tone}>{stage.words}</StatusChip>}
        {extra}
      </span>
    </Link>
  );
}
