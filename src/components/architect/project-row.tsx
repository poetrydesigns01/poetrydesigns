/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ProjectPicture } from "@/components/shared/project-tile";
import { useFirm } from "@/lib/demo-store";
import type { ProjectView } from "@/lib/firm";

// A project as one list row on the studio screens: its picture, its name and code, and the
// chips that say why it is listed under them, wrapping on a phone so the name keeps its room.

export function ProjectRow({ project, href, children }: { project: ProjectView; href?: string; children?: ReactNode }) {
  const firm = useFirm();
  return (
    <Link
      href={href ?? `/staff/projects/${project.id}`}
      className="glass-row grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3 px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-laterite"
    >
      <ProjectPicture project={project} thumbnail={firm.thumbnail(project.id)} />
      <span className="grid min-w-0 justify-items-start gap-1">
        <span className="max-w-full truncate text-15 font-semibold text-ink">{project.name}</span>
        {project.code && <span className="lettering max-w-full truncate text-ink-soft">{project.code}</span>}
        {children && <span className="flex flex-wrap items-center gap-1.5">{children}</span>}
      </span>
    </Link>
  );
}
