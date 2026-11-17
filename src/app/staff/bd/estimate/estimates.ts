/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import type { ProjectId } from "@/lib/firm-data";

// The projects that have an estimate on paper. The page opens these and its layout names
// them; any other project id, even a real project, is a missing page.

export const ESTIMATES: readonly ProjectId[] = ["kulkarni", "iyer-cottage", "sharma", "iyer"];

/** The id as a project with an estimate, or undefined. */
export function estimateFor(id: string): ProjectId | undefined {
  return ESTIMATES.find((estimate) => estimate === id);
}
