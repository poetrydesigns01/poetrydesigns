"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DropZone } from "@/components/register/drop-zone";
import { EmptyQuiet } from "@/components/register/empty-quiet";
import { usePause } from "@/components/register/recording-pause";
import { Register, RegisterRow } from "@/components/register/register";
import { TODAY } from "@/lib/demo-data";
import { useDemo, useFirm } from "@/lib/demo-store";
import { ageWords, daysSince, type StampView, type TaskView } from "@/lib/firm";
import { WEEK, type PersonId, type ProjectId } from "@/lib/firm-data";
import { datePart, formatShortDate, formatStampShort, formatTime, hours, shortWeekdayDate } from "@/lib/format";
import { LogTime } from "./log-time";

// One person's tasks as registers: due today, sent back, coming up, with the reviewer,
// and accepted this week. A row says what to hand in, to whom, and by when, in one
// sentence. Its one action starts the work, or hands it in with a file; the hand-in waits
// five seconds like every write, then the row carries its stamp.

function byWhen(t: TaskView): string {
  if (!t.dueAt) return "";
  const time = formatTime(t.dueAt);
  const day = datePart(t.dueAt);
  if (day === TODAY) return time ? `by ${time}` : "today";
  return `by ${shortWeekdayDate(day)}${time ? `, ${time}` : ""}`;
}

function firstName(name: string): string {
  return name.split(" ")[0];
}

/**
 * The one sentence under a task's title. A hand-in or an acceptance that left a stamp is
 * not said again here: the stamp under the sentence already gives the time and the name.
 */
function sentenceOf(t: TaskView, stamps: StampView[]): string {
  const lead = firstName(t.assignedByName);
  const stamped = (words: string) => stamps.some((stamp) => stamp.words === words);
  if (t.status === "submitted") {
    if (stamped("Submitted")) return `${t.deliverable}. ${lead} is reviewing it.`;
    return `${t.deliverable}. Handed in ${t.submittedAt ? formatStampShort(t.submittedAt) : "for review"}; ${lead} is reviewing it.`;
  }
  if (t.status === "accepted") {
    if (stamped("Accepted")) return `${t.deliverable}.`;
    return `${t.deliverable}. ${lead} accepted it${t.acceptedAt ? ` on ${formatShortDate(t.acceptedAt)}` : ""}.`;
  }
  return `${t.deliverable}, for ${lead} ${byWhen(t)}.`.replace(" .", ".");
}

type Group = "due" | "back" | "coming" | "with" | "accepted";

/**
 * The turn margin, saying only what the register's own title does not: a row under "Due
 * today" gives its hour, one under "With Vikram" how long it has waited, an accepted one
 * its day.
 */
function marginOf(t: TaskView, group: Group): string {
  if (group === "due") return t.overdue ? "Overdue" : (t.dueAt && formatTime(t.dueAt)) || "Today";
  if (group === "with") return ageWords(daysSince(t.submittedAt ?? TODAY));
  if (group === "accepted") return t.acceptedAt ? formatShortDate(datePart(t.acceptedAt)) : "This week";
  return t.due ?? t.statusWords;
}

type Panel = { id: string; kind: "start" | "submit" } | null;

function SubmitPanel({ task, person, onDone }: { task: TaskView; person: PersonId; onDone: () => void }) {
  const demo = useDemo();
  const pause = usePause();
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const slug = task.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(0, 3)
    .join("-");
  const samples = [`${slug}.pdf`, `${slug}-source.dwg`, `${slug}-v2.pdf`];

  return (
    <div className="grid gap-4 pt-2">
      <DropZone
        label="The file you are handing in"
        samples={samples}
        accept="pdf"
        chosen={files}
        onChoose={(chosen) => {
          setFiles(chosen);
          setError("");
        }}
      />
      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
      <div>
        <button
          type="button"
          className="btn btn-primary"
          aria-disabled={pause.pending !== null}
          onClick={(event) => {
            // Set aside, not disabled, while a pause runs, so the button keeps focus for Cancel.
            if (pause.pending !== null) return;
            if (files.length === 0) {
              setError("Choose the file first.");
              return;
            }
            const { record } = demo;
            pause.start({
              what: `${task.title}, handed in for review`,
              origin: event.currentTarget,
              commit: () => {
                record({ kind: "task.submitted", taskId: task.id, note: files.join(", "), by: person });
                onDone();
              },
            });
          }}
        >
          Submit for review
        </button>
      </div>
    </div>
  );
}

export function TaskSheet({
  person,
  projectScope,
  logTime = true,
}: {
  person: PersonId;
  projectScope: ProjectId | "all";
  /** The sheet's own "Log time". Pass false when the page's board already offers it. */
  logTime?: boolean;
}) {
  const firm = useFirm();
  const pause = usePause();
  const pathname = usePathname();
  // Site screens are used outdoors on a phone: their targets are 56 px.
  const site = pathname === "/staff/site" || pathname.startsWith("/staff/site/");
  const [panel, setPanel] = useState<Panel>(null);
  const [logging, setLogging] = useState(false);
  const me = firm.person(person);
  const lead = me?.lead ? firm.person(me.lead) : undefined;

  const mine = firm.tasks.filter(
    (t) => t.person === person && t.kind === "work" && (projectScope === "all" || t.projectId === projectScope),
  );
  const open = (t: TaskView) => t.status === "planned" || t.status === "in-progress";
  const dueSoon = (t: TaskView) => Boolean(t.dueAt) && datePart(t.dueAt ?? "") <= TODAY;

  const dueToday = mine
    .filter((t) => open(t) && dueSoon(t))
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  const sentBack = mine.filter((t) => t.status === "revision");
  const comingUp = mine
    .filter((t) => open(t) && !dueSoon(t))
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  const withLead = mine.filter((t) => t.status === "submitted");
  const accepted = mine.filter(
    (t) => t.status === "accepted" && t.acceptedAt && datePart(t.acceptedAt) >= WEEK.from && datePart(t.acceptedAt) <= WEEK.to,
  );

  // Closing a panel backs out of what it was about to record. A panel that goes away
  // commits its pause (the person confirmed it), so its own pause is cancelled first:
  // a row's pause carries the row's id, the sheet's own "Log time" pause none.
  const cancelPauseFrom = (rowId: string | null) => {
    if (pause.pending !== null && pause.pending.rowId === rowId) pause.cancel();
  };

  const toggle = (id: string, kind: "start" | "submit") => {
    if (panel?.id === id) cancelPauseFrom(`task:${id}`);
    setPanel((p) => (p?.id === id && p.kind === kind ? null : { id, kind }));
  };

  const row = (group: Group, t: TaskView) => {
    const rowId = `task:${t.id}`;
    const stamps = firm.stampsFor(rowId);
    const isOpen = panel?.id === t.id;
    const startable = t.status === "planned";
    const submittable = t.status === "in-progress" || t.status === "revision";
    const actionLabel = startable ? "Start work" : submittable ? "Submit for review" : null;
    const lead = firstName(t.assignedByName);
    return (
      <RegisterRow
        key={t.id}
        id={rowId}
        margin={marginOf(t, group)}
        overdue={t.overdue}
        title={
          <>
            {t.title},{" "}
            <Link
              href={`/staff/projects/${t.projectId}`}
              className={`link inline-flex items-center font-normal ${site ? "min-h-14" : "min-h-11"}`}
            >
              {t.projectName}
            </Link>
          </>
        }
        sentence={
          <>
            {sentenceOf(t, stamps)}
            {t.status === "revision" && t.note && (
              <span className="mt-2 block bg-sand-2 px-3 py-2 text-ink">
                <q>{t.note}</q> <span className="text-ink-soft">{lead}</span>
              </span>
            )}
          </>
        }
        figure={t.hoursLogged > 0 ? hours(t.hoursLogged) : undefined}
        stamps={stamps}
        action={
          actionLabel && (
            <button
              type="button"
              className="btn btn-quiet"
              aria-expanded={isOpen}
              onClick={() => toggle(t.id, startable ? "start" : "submit")}
            >
              {isOpen ? "Close" : actionLabel}
            </button>
          )
        }
      >
        {isOpen && panel?.kind === "start" && <LogTime person={person} taskId={t.id} onDone={() => setPanel(null)} />}
        {isOpen && panel?.kind === "submit" && <SubmitPanel task={t} person={person} onDone={() => setPanel(null)} />}
      </RegisterRow>
    );
  };

  const nothing = dueToday.length + sentBack.length + comingUp.length + withLead.length + accepted.length === 0;

  return (
    <div className="grid gap-10">
      {logTime && (
        <div className="grid justify-items-start gap-4">
          <button
            type="button"
            className="btn btn-quiet"
            aria-expanded={logging}
            onClick={() => {
              if (logging) cancelPauseFrom(null);
              setLogging((l) => !l);
            }}
          >
            {logging ? "Close" : "Log time"}
          </button>
          {logging && <LogTime person={person} onDone={() => setLogging(false)} />}
        </div>
      )}
      {nothing && <EmptyQuiet>No tasks for you here.</EmptyQuiet>}
      <Register title="Due today">{dueToday.map((t) => row("due", t))}</Register>
      <Register title="Sent back">{sentBack.map((t) => row("back", t))}</Register>
      <Register title="Coming up">{comingUp.map((t) => row("coming", t))}</Register>
      <Register title={lead ? `With ${lead.first}` : "Handed in for review"}>{withLead.map((t) => row("with", t))}</Register>
      <Register title="Accepted this week">{accepted.map((t) => row("accepted", t))}</Register>
    </div>
  );
}
