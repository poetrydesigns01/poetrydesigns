/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useState } from "react";
import { ProjectTile } from "@/components/shared/project-tile";
import { ThumbnailUpload } from "@/components/shared/thumbnail-upload";
import { useFirm } from "@/lib/demo-store";
import { Count } from "./glass-kit";
import { healthOf } from "./portfolio";

// Every project as a picture tile (the uploaded 3D elevation, else the house as built so
// far), so the admin knows each one at a glance. "Pictures" turns the grid into the upload
// controls; "Done" turns it back.

export function ProjectTiles() {
  const firm = useFirm();
  const id = useId();
  const [editing, setEditing] = useState(false);
  const projects = firm.projects.filter((p) => p.phase !== "draft");

  return (
    <section aria-labelledby={id} className="grid gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 id={id} className="flex items-center gap-2 text-17 font-semibold text-ink">
          {editing ? "Pictures" : "All projects"}
          <Count n={projects.length} />
        </h2>
        <button type="button" className="btn btn-glass" aria-pressed={editing} onClick={() => setEditing((v) => !v)}>
          {editing ? "Done" : "Pictures"}
        </button>
      </header>

      {editing ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id} className="glass grid min-w-0 gap-3 p-3">
              <p className="grid min-w-0 gap-0.5 px-1">
                <span className="truncate text-15 font-semibold text-ink">{p.name}</span>
                {p.code && <span className="lettering truncate text-ink-soft">{p.code}</span>}
              </p>
              <ThumbnailUpload projectId={p.id} by="shalini" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {projects.map((p) => {
            const health = healthOf(p);
            return (
              <li key={p.id} className="min-w-0">
                <ProjectTile
                  project={p}
                  href={`/staff/projects/${p.id}/programme`}
                  badge={health.tone === "late" ? health : undefined}
                  className="h-full content-start"
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
