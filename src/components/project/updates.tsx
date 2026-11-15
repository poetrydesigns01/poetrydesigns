/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { viewerIdOf } from "@/components/register/project-switch";
import { useStaffRole } from "@/components/register/staff-shell";
import { Chat } from "@/components/thread/chat";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { ProjectId } from "@/lib/firm-data";

// The project's update log for the team: the same chat the client sees, with the staff
// viewer's own messages on the right.

export function ProjectUpdates({ projectId }: { projectId: ProjectId }) {
  const demo = useDemo();
  const firm = useFirm();
  const role = useStaffRole();
  const p = firm.project(projectId);
  if (!p || p.phase === "draft") return null;

  return (
    <div className="w-full max-w-4xl">
      <Chat projectId={projectId} viewer={viewerIdOf(role, demo.viewers)} title="Team and client" fill="staff" />
    </div>
  );
}
