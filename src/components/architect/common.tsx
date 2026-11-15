/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useScope, viewerIdOf } from "@/components/register/project-switch";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { Firm, TaskView } from "@/lib/firm";
import type { Person, PersonId, ProjectId } from "@/lib/firm-data";
import { datePart } from "@/lib/format";
import type { Tone } from "@/lib/portal";

// What every studio screen needs first: who is looking and at which projects. Vikram Desai
// and Ananya Rao share these screens; signing in as either picks the view.

export type ArchitectView = {
  id: PersonId;
  person: Person | undefined;
  first: string;
  senior: boolean;
  scope: ProjectId | "all";
};

export function useArchitect(): ArchitectView {
  const demo = useDemo();
  const firm = useFirm();
  const id = viewerIdOf("architect", demo.viewers);
  const person = firm.person(id);
  const scope = useScope("architect");
  return { id, person, first: person?.first ?? "", senior: Boolean(person?.senior), scope };
}

/** The juniors who work under a senior architect, in the firm's order. */
export function juniorsOf(firm: Firm, lead: PersonId): Person[] {
  return firm.people.filter((p) => p.role === "architect" && !p.senior && p.lead === lead && p.active);
}

/** Open work tasks: planned, under way or sent back. */
export function isOpen(t: TaskView): boolean {
  return t.status === "planned" || t.status === "in-progress" || t.status === "revision";
}

/** A task's state as one chip. */
export function taskChip(t: TaskView): { tone: Tone; words: string } {
  if (t.status === "accepted") return { tone: "done", words: "Accepted" };
  if (t.status === "submitted") return { tone: "waiting", words: "In review" };
  if (t.overdue) return { tone: "late", words: "Overdue" };
  if (t.status === "revision") return { tone: "progress", words: "Sent back" };
  if (t.dueAt && datePart(t.dueAt) === TODAY) return { tone: "waiting", words: "Due today" };
  if (t.status === "in-progress") return { tone: "progress", words: "In progress" };
  return { tone: "locked", words: "To do" };
}

/** Sort order for a task table: what needs action first. */
export function taskRank(t: TaskView): number {
  if (t.status === "submitted") return 0;
  if (t.overdue) return 1;
  if (t.status === "revision") return 2;
  if (isOpen(t)) return 3;
  return 4;
}
