/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { viewerIdOf } from "@/components/register/project-switch";
import { useStaffRole } from "@/components/register/staff-shell";
import { useDemo } from "@/lib/demo-store";
import type { PersonId, StaffRole } from "@/lib/firm-data";

// Who is looking at the project record: the staff role of the screen and the person signed
// in for it, so a tab can tell the Project Head (or the admin) from everyone else.

export type ProjectViewer = { id: PersonId; role: StaffRole; admin: boolean };

export function useProjectViewer(): ProjectViewer {
  const demo = useDemo();
  const role = useStaffRole();
  return { id: viewerIdOf(role, demo.viewers), role, admin: role === "admin" };
}
