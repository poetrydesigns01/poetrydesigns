"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ProgrammeStrip } from "@/components/instruments/programme-strip";
import { projectsFor } from "@/components/register/project-switch";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { LogTime } from "@/components/tasks/log-time";
import { getDemoSnapshot, useDemo, useFirm, useProjection } from "@/lib/demo-store";
import { TODAY } from "@/lib/demo-data";
import type { Firm, StampView, TaskView, TurnItem } from "@/lib/firm";
import { registerNotes, type PersonId, type ProjectId } from "@/lib/firm-data";
import { stampNow } from "@/lib/clock";
import { datePart, formatShortDate } from "@/lib/format";
import { isOpen, juniorsOf, needsYou, newestFirst, reminderStamps, remindPrefix, useArchitect } from "./common";
import { programmeWords, withProjectLink } from "./project-words";
import { ReviewPanel } from "./review-panel";
import { shelfWords, VersionShelf, type ShelfVersion } from "./version-shelf";

// The studio desk. For a Project Head (Vikram): what is his turn, what is with clients and
// for how long, and which of his juniors' work is due, late or in for review. For a junior
// (Ananya): what is due today, what came back, and what is with Vikram and with clients.
// Every answer is recorded after the five-second pause and stamped in its row.

type Focus = { href: string; id: string };

/** A client wait longer than this offers a reminder in Updates. */
const REMIND_AFTER_DAYS = 5;

/** Where a turn's link lands on the programme, and the row it outlines there. */
function landing(item: TurnItem): { href: string; focus: Focus | null } | null {
  if (!item.action?.href) return null;
  const href = item.action.href;
  const path = href.split("#")[0];
  if (!path.endsWith("/programme")) return { href, focus: null };
  const note = registerNotes.find((n) => n.id === item.id);
  if (note) {
    return { href: `${path}#m${note.n}`, focus: { href: path, id: `pay:${note.projectId}:${note.n}` } };
  }
  const pay = /^pay:([a-z-]+):(\d+)$/.exec(item.id);
  if (pay) return { href: `${path}#m${pay[2]}`, focus: { href: path, id: item.id } };
  return { href, focus: { href: path, id: item.id } };
}

/**
 * The desk is today's page: a row shows the stamps made today, and the older history lives
 * on the project record. The margin already says how long a row has waited.
 */
function today(stamps: StampView[]): StampView[] {
  return stamps.filter((stamp) => datePart(stamp.at) === TODAY);
}

/** Every figure on a staff screen says whether GST is in it. */
function gstFigure(item: TurnItem): string | undefined {
  if (!item.figure) return undefined;
  if (/GST/.test(item.figure)) return item.figure;
  return `${item.figure} ${item.id.startsWith("rev:") ? "before GST" : "with GST"}`;
}

function lowerFirst(text: string): string {
  // "PDF drawing" keeps its capitals.
  if (/^[A-Z]{2}/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** What a reminder in Updates says the client is waiting on. */
function reminderWhat(item: TurnItem, firm: Firm): string {
  const [kind, , rest] = item.id.split(":");
  if (kind === "pay") return `the payment for milestone ${rest}, ${item.figure ?? ""} with GST, is waiting for your approval`;
  if (kind === "rev") {
    const r = firm.revisions.find((x) => `rev:${x.id}` === item.id);
    if (r) {
      return `the ${lowerFirst(r.item)}${r.heldUntil ? `, price held until ${formatShortDate(r.heldUntil)},` : ""} is waiting for your decision`;
    }
  }
  if (kind === "sched") return `the change to your schedule, ${lowerFirst(item.title)}, is waiting for your decision`;
  return `the ${lowerFirst(item.title)}, is waiting for your decision`;
}

/** "Karan's verandah section is due tomorrow." from the team's open tasks. */
function teamSentence(tasks: TaskView[], firm: Firm): string {
  const pick =
    tasks.find((t) => t.due === "Due tomorrow") ?? tasks.find((t) => t.due === "Due today") ?? tasks.find((t) => t.overdue);
  if (!pick || !pick.due) return "";
  const first = firm.person(pick.person)?.first ?? pick.personName;
  const due = pick.due === "Overdue" ? "is overdue" : `is ${lowerFirst(pick.due)}`;
  return ` ${first}'s ${pick.short ?? lowerFirst(pick.title)} ${due}.`;
}

export function ArchitectDesk() {
  const firm = useFirm();
  const demo = useDemo();
  const projection = useProjection();
  const pause = usePause();
  const me = useArchitect();
  const [panel, setPanel] = useState<string | null>(null);

  const turns = firm.turns(me.id, me.scope);
  const waiting = firm.waitingOn(me.id, me.scope);
  // What was sent today comes first, so a hand-off just made is in view; then the longest waits.
  const sentToday = (item: TurnItem) => item.stamps.some((stamp) => datePart(stamp.at) === TODAY);
  const withClients = waiting
    .filter((item) => item.client)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(sentToday(b.item)) - Number(sentToday(a.item)) || b.item.days - a.item.days || a.index - b.index)
    .map(({ item }) => item);
  const lead = me.person?.lead ? firm.person(me.person.lead) : undefined;
  const withLead = lead ? waiting.filter((item) => item.margin === `With ${lead.first}`) : [];
  const inScope = (projectId: ProjectId) => me.scope === "all" || me.scope === projectId;

  // The juniors' open work due by tomorrow, late first.
  const juniors = juniorsOf(firm, me.id).map((p) => p.id);
  const teamToday = firm.tasks
    .filter(
      (t) =>
        t.kind === "work" &&
        juniors.includes(t.person) &&
        isOpen(t) &&
        (t.overdue || t.due === "Due today" || t.due === "Due tomorrow") &&
        inScope(t.projectId),
    )
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));

  const closePanel = (rowId: string) => {
    if (pause.pending !== null && pause.pending.rowId === rowId) pause.cancel();
    setPanel(null);
  };
  const toggle = (rowId: string) => {
    if (panel === rowId) closePanel(rowId);
    else setPanel(rowId);
  };

  const go = (target: { href: string; focus: Focus | null }) => {
    if (target.focus) demo.setFocusRow(target.focus);
  };

  // ---- The board ----
  const headline = needsYou(turns.length, me.first);
  let state: string;
  let picture: ReactNode = null;
  let pictureWords: string | undefined;

  if (me.senior) {
    const n = withClients.length;
    state = `${n === 0 ? "Nothing is" : n === 1 ? "1 item is" : `${n} items are`} with clients.${teamSentence(teamToday, firm)}`;
    const heads = projectsFor("architect", me.id, firm).filter((p) => p.team.head === me.id && inScope(p.id));
    const shown = (me.scope === "all" ? heads.filter((p) => p.phase === "building") : heads).slice(0, 2);
    if (shown.length > 0) {
      // At most 120 px tall from 1024 px and 96 px below it: the phone draws the smaller strip.
      const strips = (size: 120 | 264) =>
        shown.map((p) => (
          <div key={p.id} className="grid gap-0.5">
            <span className="lettering leading-none text-lime/75">{p.name}</span>
            <ProgrammeStrip cells={p.strip} size={size} tone="dark" label={`${p.name}: ${programmeWords(p)}`} />
          </div>
        ));
      picture = (
        <div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 lg:hidden">{strips(120)}</div>
          <div className="hidden gap-1 lg:grid">{strips(264)}</div>
        </div>
      );
      pictureWords = shown.map((p) => `${p.name}: ${programmeWords(p)}.`).join(" ");
    }
  } else {
    const n = firm.tasks.filter((t) => t.person === me.id && t.status === "submitted" && inScope(t.projectId)).length;
    const who = lead?.first ?? "your lead";
    state = `${n === 0 ? "No drawings are" : n === 1 ? "1 drawing is" : `${n} drawings are`} with ${who} for review.`;
    // The shelf of the sheet most in play: the Iyer terrace plan while Iyer is in scope.
    const design =
      inScope("iyer") ? projection.designs.find((d) => d.design.id === "terrace-plan") : undefined;
    if (design) {
      const versions: ShelfVersion[] = design.design.versions.map((v, i, all) => ({
        version: v.version,
        status: i === all.length - 1 ? design.status : v.status === "awaiting" ? "superseded" : v.status,
      }));
      picture = <VersionShelf versions={versions} tone="dark" />;
      pictureWords = `${design.design.title}. ${shelfWords(versions)}`;
    } else {
      const other = firm.designs.find((d) => d.by === me.person?.name && inScope(d.projectId));
      if (other) {
        const versions: ShelfVersion[] = [{ version: other.version, status: other.status }];
        picture = <VersionShelf versions={versions} tone="dark" />;
        pictureWords = `${other.title}, ${firm.project(other.projectId)?.name ?? ""}. ${shelfWords(versions, "the client")}`;
      }
    }
  }

  // ---- Rows ----
  // The view's one primary is the first turn's action, in its row; the board carries none,
  // so the same action is never shown twice. The other rows' actions are quiet.
  const turnRow = (item: TurnItem, index: number) => {
    const open = panel === item.id;
    const target = landing(item);
    const task = item.id.startsWith("task:") ? firm.tasks.find((t) => `task:${t.id}` === item.id) : undefined;
    const tone = index === 0 && !open ? "btn btn-primary" : "btn btn-quiet";
    let action: ReactNode = null;
    let body: ReactNode = null;
    if (target) {
      action = (
        <Link href={target.href} className={tone} onClick={() => go(target)}>
          {item.action?.label}
        </Link>
      );
    } else if (task && item.alt) {
      action = (
        <button type="button" className={tone} aria-expanded={open} onClick={() => toggle(item.id)}>
          {open ? "Close" : "Accept or send back"}
        </button>
      );
      if (open) body = <ReviewPanel task={task} by={me.id} onDone={() => setPanel(null)} />;
    } else if (task) {
      action = (
        <button type="button" className={tone} aria-expanded={open} onClick={() => toggle(item.id)}>
          {open ? "Close" : "Log time"}
        </button>
      );
      if (open) body = <LogTime person={me.id} taskId={task.id} onDone={() => setPanel(null)} />;
    }
    const sentBack = task?.status === "revision" && task.note;
    return (
      <RegisterRow
        key={item.id}
        id={item.id}
        margin={item.margin}
        marginSub={item.marginSub}
        client={item.client}
        overdue={item.overdue}
        title={withProjectLink(item.title, item.projectId, firm)}
        sentence={
          sentBack ? (
            <>
              {task.projectName}. {task.assignedByName.split(" ")[0]} sent it back.
              <span className="mt-2 block bg-sand-2 px-3 py-2 text-ink">
                <q>{task.note}</q>
              </span>
            </>
          ) : (
            item.sentence
          )
        }
        figure={gstFigure(item)}
        stamps={today(item.stamps)}
        action={action}
      >
        {body}
      </RegisterRow>
    );
  };

  const remind = (item: TurnItem, origin: HTMLElement) => {
    if (pause.pending !== null || !item.projectId) return;
    const projectId = item.projectId;
    const by = me.id;
    const name = me.person?.name ?? "";
    const text = `A reminder from ${name}: ${reminderWhat(item, firm)}.`;
    const { record } = demo;
    pause.start({
      what: `A reminder in Updates, ${item.title}`,
      origin,
      commit: () => {
        const n = getDemoSnapshot().events.length + 1;
        record({
          kind: "post.added",
          post: {
            id: `${remindPrefix(item.id)}${n}`,
            projectId,
            by: by as PersonId,
            at: stampNow(),
            text,
            photos: [],
            storey: null,
            kind: "post",
          },
          by,
        });
      },
    });
  };

  // A row that does not name its project says it first, as a link.
  const named = (item: TurnItem) => {
    const name = item.projectId ? firm.project(item.projectId)?.name : undefined;
    return !name || item.title.includes(name) || item.sentence.includes(name);
  };

  // Only the longest wait, once it is past REMIND_AFTER_DAYS, offers a reminder. The other
  // rows are whole-row links to where the item lives, so one action is not repeated down
  // the column.
  const remindable = withClients.reduce<TurnItem | null>((oldest, item) => (!oldest || item.days > oldest.days ? item : oldest), null);
  const remindId = remindable && remindable.days > REMIND_AFTER_DAYS ? remindable.id : null;

  const clientRow = (item: TurnItem) => {
    const reminds = item.id === remindId;
    const target = landing(item);
    const href = target?.href ?? (item.projectId ? `/staff/projects/${item.projectId}` : undefined);
    const name = item.projectId ? (firm.project(item.projectId)?.name ?? "") : "";
    return (
      <RegisterRow
        key={item.id}
        id={item.id}
        margin={item.margin}
        marginSub={item.marginSub}
        client={item.client}
        title={reminds ? withProjectLink(item.title, item.projectId, firm) : item.title}
        sentence={
          <>
            {named(item) ? null : reminds ? <>{withProjectLink(name, item.projectId, firm)}. </> : `${name}. `}
            {item.figure ? `${gstFigure(item)}. ${item.sentence}` : item.sentence}
          </>
        }
        stamps={today(item.projectId ? newestFirst([...item.stamps, ...reminderStamps(firm, item.id, item.projectId)]) : item.stamps)}
        href={reminds ? undefined : href}
      >
        {/* The one action sits under the words, so the narrow column keeps its width for them. */}
        {reminds && (
          <button
            type="button"
            className="btn btn-quiet w-full sm:w-auto"
            aria-disabled={pause.pending !== null}
            onClick={(event) => remind(item, event.currentTarget)}
          >
            Remind in Updates
          </button>
        )}
      </RegisterRow>
    );
  };

  const teamRow = (t: TaskView) => (
    <RegisterRow
      key={t.id}
      id={`task:${t.id}`}
      margin={t.due ?? t.statusWords}
      overdue={t.overdue}
      title={`${t.personName.split(" ")[0]}: ${t.title}`}
      sentence={`${t.projectName}. ${t.status === "revision" ? "Sent back, being redone." : `${t.deliverable}.`}`}
      stamps={today(firm.stampsFor(`task:${t.id}`))}
      href="/staff/architect/team"
    />
  );

  return (
    <>
      <StaffBoard
        place="Desk"
        headline={headline}
        state={state}
        picture={picture}
        pictureWords={pictureWords}
      />
      <div className="staff-columns mt-8">
        <Register title="Your turn" empty="Nothing needs you today.">
          {turns.map(turnRow)}
        </Register>
        <div className="grid min-w-0 content-start gap-10">
          {!me.senior && lead && (
            <Register title={`With ${lead.first}`} empty={`Nothing of yours is with ${lead.first}.`}>
              {withLead.map((item) => (
                <RegisterRow
                  key={item.id}
                  id={item.id}
                  margin={item.margin}
                  marginSub={item.marginSub}
                  title={withProjectLink(item.title, item.projectId, firm)}
                  sentence={item.sentence}
                  stamps={today(item.stamps)}
                />
              ))}
            </Register>
          )}
          <Register title="With clients" empty="Nothing is waiting on a client." limit={3}>
            {withClients.map(clientRow)}
          </Register>
          {me.senior && (
            <Register title="Your team today" empty="Nothing of your team's is due by tomorrow." limit={3}>
              {teamToday.map(teamRow)}
            </Register>
          )}
        </div>
      </div>
    </>
  );
}
