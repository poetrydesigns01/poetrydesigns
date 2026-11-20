/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
import { TODAY } from "./demo-data";
import { sortAttention, tierOf, waitedDaysOf, type AttentionItem } from "./desk";
import type { Firm } from "./firm";
import type { PersonId, ProjectId, StaffRole } from "./firm-data";

// What each staff Today lists, worked out once, so the board and the rail always agree: the
// board shows `todayItems` as its "Waiting on you" rows and the rail's Today figure is their
// number. A list place in the rail counts the Today rows that open on it (`placeItems`).

export type TodayScope = ProjectId | "all";

/** Where a senior architect answers a junior's work to review, beside the team's other tasks. */
export const ARCHITECT_TEAM_HREF = "/staff/architect/team";

/** True when `href` (query and hash aside) is `place` or lies under it. */
export function opensOn(href: string, place: string): boolean {
  const path = href.split(/[?#]/)[0];
  return path === place || path.startsWith(`${place}/`);
}

/** A row belongs in a one-project view when it is that project's, or has no project at all. */
function inView(item: AttentionItem, scope: TodayScope): boolean {
  return scope === "all" || !item.projectId || item.projectId === scope;
}

/**
 * Whether a "Milestone done" row is for a milestone still locked by its own instalment, so not
 * the site's to mark yet. The same test as `stageLock` in components/site/site-kit.tsx.
 */
function lockedStageRow(firm: Firm, item: AttentionItem): boolean {
  const m = /^stage:([^:]+):(\d+)$/.exec(item.id);
  if (!m) return false;
  const projectId = m[1] as ProjectId;
  const n = Number(m[2]);
  const site = firm.siteStage(projectId);
  if (site && site.n === n) return site.locked;
  if (site?.next && site.next.n === n) return site.next.locked;
  return firm.plan(projectId)?.stages.find((s) => s.milestone === n)?.locked ?? false;
}

/** "Generate the plan" for every opened project that has none yet: the admin's to do. */
function planRows(firm: Firm): AttentionItem[] {
  return firm.projects
    .filter((p) => p.phase !== "draft" && firm.plan(p.id) === null)
    .map((p): AttentionItem => {
      const since = p.invitedAt ?? TODAY;
      const waitedDays = waitedDaysOf(since);
      return {
        id: `no-plan:${p.id}`,
        kind: "exception",
        what: "Generate the plan",
        projectId: p.id,
        projectName: p.name,
        projectCode: p.code || undefined,
        since,
        waitedDays,
        overdueDays: 0,
        tier: tierOf(waitedDays),
        href: `/staff/projects/${p.id}/programme`,
        action: "Generate",
        approval: false,
      };
    });
}

/** Every row a role's Today can show for a person, before the project switch. Urgent first. */
function allRows(firm: Firm, role: StaffRole, person: PersonId): AttentionItem[] {
  const mine = firm.attentionFor(person);
  switch (role) {
    case "architect": {
      // A senior answers a junior's work to review on the Team page.
      if (!firm.person(person)?.senior) return mine;
      return mine.map((x) => (x.kind === "review" ? { ...x, href: ARCHITECT_TEAM_HREF } : x));
    }
    case "site":
      return mine.filter((x) => !lockedStageRow(firm, x));
    case "admin":
      return sortAttention([...planRows(firm), ...mine]);
    default:
      return mine;
  }
}

/**
 * The rows of a person's Today, urgent first: the board lists exactly these and the rail's
 * Today figure is their number. In a one-project view a row with no project stays, except on
 * BD's Today, where a lead or a draft has no project and so shows only under all projects.
 */
export function todayItems(firm: Firm, role: StaffRole, person: PersonId, scope: TodayScope): AttentionItem[] {
  const rows = allRows(firm, role, person);
  if (role === "bd") return rows.filter((x) => scope === "all" || x.projectId === scope);
  return rows.filter((x) => inView(x, scope));
}

/**
 * The rows a list place in the rail counts: the Today rows that open on it (`hrefs`: the
 * place, and any page that belongs to it such as a draft's estimate). Pass the project its
 * page shows, or "all" for a page that lists every project whatever the switch says.
 */
export function placeItems(
  firm: Firm,
  role: StaffRole,
  person: PersonId,
  scope: TodayScope,
  hrefs: string[],
): AttentionItem[] {
  return todayItems(firm, role, person, scope).filter((x) => hrefs.some((h) => opensOn(x.href, h)));
}
