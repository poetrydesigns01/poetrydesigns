"use client";

import { Panel } from "@/components/admin/glass-kit";
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
    <Panel
      title="Record"
      strong
      aside={
        <span className="glass-chip chip-locked">
          Read only · {entries.length}
        </span>
      }
    >
      <LogRows entries={entries} showProject={false} empty="Nothing recorded yet." />
    </Panel>
  );
}
