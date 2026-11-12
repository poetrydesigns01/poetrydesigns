"use client";

import { useScope, viewerIdOf } from "@/components/register/project-switch";
import { useDemo, useFirm } from "@/lib/demo-store";
import type { Firm, StampView, TaskView } from "@/lib/firm";
import type { Person, PersonId, Post, ProjectId } from "@/lib/firm-data";
import { countWord } from "@/lib/format";

// What every studio screen needs first: who is looking, at which projects, and the words
// for a count in a headline. Vikram Desai and Ananya Rao share these screens; the person
// menu switches between them in place.

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

/** "Three things need you today, Vikram." with words for 0 to 10. */
export function needsYou(n: number, first: string): string {
  if (n === 0) return `Nothing needs you today, ${first}.`;
  return `${countWord(n, true)} ${n === 1 ? "thing needs" : "things need"} you today, ${first}.`;
}

/** The juniors who work under a senior architect, in the firm's order. */
export function juniorsOf(firm: Firm, lead: PersonId): Person[] {
  return firm.people.filter((p) => p.role === "architect" && !p.senior && p.lead === lead && p.active);
}

/** Open work tasks: planned, under way or sent back. */
export function isOpen(t: TaskView): boolean {
  return t.status === "planned" || t.status === "in-progress" || t.status === "revision";
}

/** "Ananya's" from a person id. */
export function possessive(firm: Firm, id: PersonId): string {
  const first = firm.person(id)?.first ?? id;
  return `${first}'s`;
}

/** The sort key "newest first" for stamps from several sources. */
export function newestFirst(stamps: StampView[]): StampView[] {
  return [...stamps].sort((a, b) => b.at.localeCompare(a.at));
}

/** The prefix of a reminder post's id, so a row can find the reminders sent from it. */
export function remindPrefix(rowId: string): string {
  return `remind-${rowId}-`;
}

/**
 * The stamps a row's reminders left: one per reminder posted in Updates from it. A post by
 * the team emails the client only; Meera can be seen as, other clients are named.
 */
export function reminderStamps(firm: Firm, rowId: string, projectId: ProjectId): StampView[] {
  const iyer = projectId === "iyer" || projectId === "iyer-cottage";
  return firm.posts
    .filter((post: Post) => post.id.startsWith(remindPrefix(rowId)))
    .map((post) => ({
      words: "Reminder posted in Updates",
      at: post.at,
      by: post.by,
      carbon: iyer
        ? { to: ["meera" as PersonId], href: "/client/updates", rowId }
        : { to: [], others: firm.project(projectId)?.clients ?? [], href: `/staff/projects/${projectId}/updates`, rowId },
    }));
}
