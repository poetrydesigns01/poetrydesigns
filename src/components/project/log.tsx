"use client";

import { useFirm } from "@/lib/demo-store";
import type { ProjectId } from "@/lib/firm-data";
import { LogRows } from "./log-rows";

// This project's entries in the record, newest first. Nothing here can be edited or
// deleted, by anyone.

export function ProjectLog({ projectId }: { projectId: ProjectId }) {
  const firm = useFirm();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;
  const entries = firm.log.filter((entry) => entry.projectId === projectId);
  return (
    <section aria-label="The record" className="grid max-w-[52rem] gap-3">
      <h2 className="register-title">The record, newest first</h2>
      <p className="text-15 text-ink-soft">Nothing here can be edited or deleted.</p>
      <LogRows entries={entries} showProject={false} empty="Nothing has been recorded on this project yet." />
    </section>
  );
}
