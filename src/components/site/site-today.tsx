"use client";

import Link from "next/link";
import { useRef } from "react";
import { MaterialStack } from "@/components/instruments/material-stack";
import { ProjectMark } from "@/components/instruments/project-mark";
import { useScope } from "@/components/register/project-switch";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { useDemo, useFirm, useViewer } from "@/lib/demo-store";
import type { ProjectView, RequestView } from "@/lib/firm";
import { TODAY } from "@/lib/demo-data";
import { addDays, countWord, hours } from "@/lib/format";
import { RequestRow, TurnRow, focusFirstIn } from "./rows";
import { requestShortWords, siteSentence, storeysOf, underWay } from "./site-words";
import "./site.css";

// The site engineer's day, read on a phone at the gate: what needs him, what he asked for
// and where it has got to, and what his junior owes. The board's picture is his site at
// the size of a word, with the stacks of material standing on the floor that is going up.

/**
 * The site with up to two stacks on it: the open requests first, then the latest delivered.
 * A phone has room for one stack and one line of words, so the second stack and its words
 * stand only from 1024 px. The words are the board figure's caption.
 */
function SitePicture({ project, requests }: { project: ProjectView; requests: RequestView[] }) {
  const firm = useFirm();
  const m = underWay(project);
  const shown = requests.flatMap((r) => {
    const item = firm.catalogueAll.find((c) => c.id === r.lines[0].material);
    return item ? [{ r, item }] : [];
  });
  return (
    <>
      <div className="flex min-w-0 items-end gap-3" aria-hidden="true">
        <ProjectMark
          projectId={project.id}
          highlight={m ? storeysOf(project, m.n) : []}
          tone="dark"
          className="h-[72px] w-auto shrink-0 lg:h-[96px]"
        />
        {shown.map(({ r, item }, i) => (
          <span key={r.no} className={i > 0 ? "hidden lg:block" : "block"}>
            <MaterialStack
              item={item}
              requested={r.lines[0].qty}
              ordered={r.pos.map((po) => po.lines.find((l) => l.lineId === r.lines[0].id)?.qty ?? 0)}
              delivered={Boolean(r.deliveredAt)}
              width={44}
              tone="dark"
              words="none"
            />
          </span>
        ))}
      </div>
      <figcaption className="lettering board-words">
        {shown.length === 0
          ? "No material on order for this site."
          : shown.map(({ r, item }, i) => (
              <span key={r.no} className={i > 0 ? "hidden lg:inline" : undefined}>
                {i > 0 ? " " : ""}
                {requestShortWords(r, item)}
              </span>
            ))}
      </figcaption>
    </>
  );
}

const TILE = "min-h-16 items-center justify-center px-4 text-center text-17 font-semibold";

export function SiteToday() {
  const demo = useDemo();
  const firm = useFirm();
  const me = useViewer("site");
  const scope = useScope("site");
  const projectId = scope === "all" ? "iyer" : scope;
  const project = firm.project(projectId);
  const turnsRef = useRef<HTMLDivElement>(null);

  const turns = firm.turns(me.id, projectId);
  const turnIds = new Set(turns.map((item) => item.id));

  // The person's requests on this site, newest first. Those already in "Your turn" are not said twice.
  const mine = firm.requests
    .filter((r) => r.by === me.id && r.projectId === projectId)
    .sort((a, b) => b.at.localeCompare(a.at) || b.no.localeCompare(a.no));
  const latest = mine.filter((r) => !turnIds.has(`mr:${r.no}`)).slice(0, 3);
  const queued = firm.requests.filter((r) => r.by === me.id && r.queued);

  // Everything sent for this site, whoever sent it: the board is the site's, not the person's.
  const onSite = firm.requests
    .filter((r) => r.projectId === projectId && !r.queued)
    .sort((a, b) => b.at.localeCompare(a.at) || b.no.localeCompare(a.no));
  // With procurement until the whole order is uploaded.
  const withProcurement = onSite.filter((r) => !r.deliveredAt && r.status !== "PO uploaded").length;
  // Two stacks on the board: what is still coming, then what came this week, one per material.
  const recent = onSite.filter((r) => r.deliveredAt && r.deliveredAt.slice(0, 10) >= addDays(TODAY, -7));
  const stacks = [
    ...onSite.filter((r) => !r.deliveredAt),
    ...recent.filter((r, i) => recent.findIndex((x) => x.lines[0].material === r.lines[0].material) === i),
  ].slice(0, 2);

  const juniors = firm.people.filter((p) => p.lead === me.id && p.role === "site");
  const juniorTasks = firm.tasks.filter(
    (t) => juniors.some((j) => j.id === t.person) && t.kind === "work" && t.status !== "accepted",
  );

  const n = turns.length;
  const headline =
    n === 0
      ? `Nothing needs you today, ${me.first}.`
      : `${countWord(n, true)} ${n === 1 ? "thing needs" : "things need"} you today, ${me.first}.`;
  const procurementWords =
    withProcurement === 0
      ? "Nothing is with procurement."
      : `${withProcurement} ${withProcurement === 1 ? "request is" : "requests are"} with procurement.`;

  return (
    <div className="site-screen">
      <StaffBoard
        place={project ? `Today at ${project.name}` : "Today"}
        headline={headline}
        state={project ? `${siteSentence(project)} ${procurementWords}` : procurementWords}
        picture={project ? <SitePicture project={project} requests={stacks} /> : undefined}
      />

      {/* On a phone "Request material" is the bar fixed above the tab bar, so it is not said twice here. */}
      <nav aria-label="Site actions" className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <Link
          href="/staff/site/request"
          className={`${TILE} hidden bg-rosewood text-lime hover:bg-laterite lg:flex`}
        >
          Request material
        </Link>
        <Link href="/staff/site/update" className={`${TILE} flex bg-sand-2 hover:bg-sand`}>
          Post a site update
        </Link>
        <Link href={`/staff/site/stage?project=${projectId}`} className={`${TILE} flex bg-sand-2 hover:bg-sand`}>
          Mark a stage done
        </Link>
      </nav>

      {demo.offline && queued.length > 0 && (
        <p className="bg-sand-2 px-4 py-3 text-17">
          {queued.length === 1 ? "1 request is" : `${queued.length} requests are`} waiting to send. It goes when you have
          signal.
        </p>
      )}

      <div className="staff-columns">
        {/* A row that leaves once it is done hands focus to the next one here. */}
        <div ref={turnsRef} tabIndex={-1} className="outline-none">
          <Register title="Your turn" empty="Nothing needs you on this site today.">
            {turns.map((item) => (
              <TurnRow key={item.id} item={item} person={me.id} onGone={() => focusFirstIn(turnsRef.current)} />
            ))}
          </Register>
        </div>

        <div className="grid content-start gap-10">
          <section className="grid gap-3">
            <Register title="My requests" empty="You have not asked for any material on this site yet." limit={3}>
              {latest.map((r) => (
                <RequestRow key={r.no} request={r} />
              ))}
            </Register>
            <Link href="/staff/site/requests" className="link inline-flex min-h-14 items-center self-start text-17">
              All my requests
            </Link>
          </section>

          {juniors.length > 0 && (
            <Register title={`${juniors.map((j) => j.first).join(" and ")}'s tasks`} empty="Nothing open.">
              {juniorTasks.map((t) => {
                const submitted = t.status === "submitted";
                return (
                  <RegisterRow
                    key={t.id}
                    id={`junior:${t.id}`}
                    margin={submitted ? "With you" : (t.due ?? t.statusWords)}
                    overdue={t.overdue}
                    title={t.title}
                    sentence={`${t.projectName}. ${t.deliverable}, ${hours(t.hoursLogged)} logged so far.`}
                    href="/staff/site/tasks"
                  />
                );
              })}
            </Register>
          )}
        </div>
      </div>
    </div>
  );
}
