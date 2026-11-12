import Link from "next/link";
import type { ReactNode } from "react";
import type { Firm, ProjectView } from "@/lib/firm";
import type { ProjectId } from "@/lib/firm-data";
import { listWords } from "@/lib/format";

// Small shared wording for the studio screens: project names as links, and what a
// project's programme is waiting on, in one sentence.

/** The title with the project's name made a link to its record, wherever the name appears. */
export function withProjectLink(title: string, projectId: ProjectId | undefined, firm: Firm): ReactNode {
  const p = projectId ? firm.project(projectId) : undefined;
  if (!p) return title;
  const at = title.indexOf(p.name);
  if (at < 0) return title;
  return (
    <>
      {title.slice(0, at)}
      <Link href={`/staff/projects/${p.id}`} className="link -my-3 inline-flex min-h-11 items-center">
        {p.name}
      </Link>
      {title.slice(at + p.name.length)}
    </>
  );
}

function milestonesWord(ns: number[]): string {
  return ns.length === 1 ? `milestone ${ns[0]}` : `milestones ${listWords(ns.map(String))}`;
}

/** "milestone 3 with Meera", "milestones 4 and 5 with the bank", or the stage words. */
export function programmeWords(p: ProjectView): string {
  const raised = p.milestones.filter((m) => m.state === "raised").map((m) => m.n);
  const bank = p.milestones.filter((m) => m.state === "approved" || m.state === "part-paid").map((m) => m.n);
  const done = p.milestones.filter((m) => m.state === "done").map((m) => m.n);
  const parts: string[] = [];
  if (done.length > 0) parts.push(`${milestonesWord(done)} ready to raise`);
  if (raised.length > 0) parts.push(`${milestonesWord(raised)} with ${p.clientWord === "Meera" ? "Meera" : "the client"}`);
  if (bank.length > 0) parts.push(`${milestonesWord(bank)} with the bank`);
  if (parts.length === 0) return p.stageWords.charAt(0).toLowerCase() + p.stageWords.slice(1);
  return parts.join(", ");
}
