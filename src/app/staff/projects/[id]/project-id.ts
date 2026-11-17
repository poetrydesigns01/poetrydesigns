/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { projects, type ProjectId } from "@/lib/firm-data";

// Each tab page reads the project from its own address and sends an unknown one to the
// missing page itself. The layout only draws the frame for a known project: a missing page
// raised by the layout would leave the layout's address-based title as the route's only
// request-time part, which Next's instant-navigation check reports as blocking.

/** The address segment as a project id, or null when no project has it. */
export function projectIdOf(segment: string): ProjectId | null {
  return projects.some((p) => p.id === segment) ? (segment as ProjectId) : null;
}
