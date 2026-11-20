/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useRef, useState } from "react";
import { usePause } from "@/components/register/recording-pause";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { prepareThumbnail, THUMB_ERROR_WORDS } from "@/lib/thumbnail";
import { ProjectPicture } from "./project-tile";

// Sets a project's picture (the 3D elevation, say): the current one as a preview, a button
// that opens the file picker, and "Remove" once there is an upload. The file is made small
// in the browser (480 px, JPEG) before it is kept; over 8 MB or not an image is refused.
// Setting and removing both wait five seconds before they are recorded (Cancel undoes it).

export function ThumbnailUpload({
  projectId,
  by,
  className = "",
}: {
  projectId: ProjectId;
  /** Who sets it; defaults to the person signed in. */
  by?: PersonId;
  className?: string;
}) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const input = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = firm.project(projectId);
  if (!project) return null;
  const thumbnail = firm.thumbnail(projectId);
  const who: PersonId = by ?? firm.people.find((p) => p.name === demo.session?.name)?.id ?? "shalini";

  async function choose(files: FileList | null) {
    const file = files?.[0];
    if (input.current) input.current.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    const result = await prepareThumbnail(file);
    setBusy(false);
    if (!result.ok) {
      setError(THUMB_ERROR_WORDS[result.reason]);
      return;
    }
    const { setThumbnail } = demo;
    pause.start({
      what: `Picture for ${project?.name ?? "the project"}`,
      origin: pickRef.current,
      commit: () => setThumbnail(projectId, result.dataUrl, who),
    });
  }
  const waiting = pause.pending !== null;

  return (
    <div className={`grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-3 ${className}`}>
      <ProjectPicture project={project} thumbnail={thumbnail} />
      <div className="grid justify-items-start gap-2">
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void choose(e.currentTarget.files)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            ref={pickRef}
            type="button"
            className="btn btn-glass"
            disabled={busy}
            aria-disabled={waiting ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onClick={() => {
              if (!waiting) input.current?.click();
            }}
          >
            {busy ? "Preparing…" : thumbnail.kind === "upload" ? "Change picture" : "Add picture"}
          </button>
          {thumbnail.kind === "upload" && (
            <button
              type="button"
              className="btn btn-glass"
              disabled={busy}
              aria-disabled={waiting ? true : undefined}
              onClick={(event) => {
                if (waiting) return;
                const { setThumbnail } = demo;
                pause.start({
                  what: `Picture of ${project.name} taken off`,
                  origin: event.currentTarget,
                  commit: () => setThumbnail(projectId, null, who),
                });
              }}
            >
              Remove
            </button>
          )}
        </div>
        <p id={`${id}-error`} role="status" aria-live="polite" className="text-13">
          {error && <span className="late-text">{error}</span>}
        </p>
      </div>
    </div>
  );
}
