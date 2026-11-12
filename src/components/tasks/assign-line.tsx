"use client";

import { useId, useState, type FormEvent } from "react";
import { usePause } from "@/components/register/recording-pause";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm } from "@/lib/demo-store";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { addDays, shortWeekdayDate } from "@/lib/format";

// Giving a junior a task is one sentence with blanks in it: "Ask Ananya Rao to deliver a
// PDF and source drawing for Window detail on D'Souza Villa by Mon 16 Nov, 6 pm." It reads
// back in plain words as it is filled. Assigning waits five seconds, then the task is in
// the junior's sheet.

const DELIVERABLES = [
  "PDF drawing",
  "PDF and source drawing",
  "PDF and images",
  "Specification sheet (PDF)",
  "Measurement sheet (PDF)",
  "Site note in the thread",
];

const TIMES = [
  { value: "12:00", words: "12 pm" },
  { value: "18:00", words: "6 pm" },
];

/** The next ten working days, Monday to Saturday, from tomorrow. */
function workingDays(): string[] {
  const days: string[] = [];
  for (let d = 1; days.length < 10 && d < 20; d++) {
    const iso = addDays(TODAY, d);
    if (!shortWeekdayDate(iso).startsWith("Sun")) days.push(iso);
  }
  return days;
}

const DAYS = workingDays();

/** A blank in the sentence: a select or a text field, with its own label for screen readers. */
const blank =
  "mx-0.5 inline-block min-h-11 max-w-full rounded-none border-0 border-b border-ink/60 bg-sand-2 px-2 align-baseline text-17 font-semibold text-ink";

/** What a junior usually hands in: a site junior a measurement sheet, an architect a drawing. */
function usualDeliverable(role: string | undefined): string {
  return role === "site" ? "Measurement sheet (PDF)" : DELIVERABLES[1];
}

export function AssignLine({
  from,
  juniors,
  defaultDeliverable,
}: {
  from: PersonId;
  juniors: PersonId[];
  /** The deliverable chosen at first. Without it, the usual one for the first junior's role. */
  defaultDeliverable?: string;
}) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const projects = firm.projects.filter(
    (p) => p.phase !== "draft" && (p.team.head === from || p.team.architects.includes(from) || p.team.engineers.includes(from)),
  );
  const [person, setPerson] = useState<PersonId>(juniors[0] ?? from);
  const [deliverable, setDeliverable] = useState(
    () => defaultDeliverable ?? usualDeliverable(firm.person(juniors[0] ?? from)?.role),
  );
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<ProjectId>(projects[0]?.id ?? "iyer");
  const [day, setDay] = useState(DAYS[2] ?? DAYS[0]);
  const [time, setTime] = useState(TIMES[1].value);
  const [error, setError] = useState("");

  const name = firm.person(person)?.name ?? person;
  const projectName = firm.project(projectId)?.name ?? projectId;
  const timeWords = TIMES.find((t) => t.value === time)?.words ?? time;
  const readBack = `Ask ${name} to deliver ${deliverable} for ${title.trim() || "a task still to be named"} on ${projectName} by ${shortWeekdayDate(day)}, ${timeWords}.`;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Set aside, not disabled, while a pause runs, so the button keeps focus for Cancel.
    if (pause.pending !== null) return;
    const named = title.trim();
    if (!named) {
      setError("Name the task: what is to be drawn or done.");
      return;
    }
    setError("");
    const { record } = demo;
    pause.start({
      what: `The task ${named} for ${name}`,
      origin: event.nativeEvent instanceof SubmitEvent && event.nativeEvent.submitter instanceof HTMLElement ? event.nativeEvent.submitter : null,
      commit: () => {
        const count = getDemoSnapshot().events.filter((e) => e.kind === "task.assigned").length;
        record({
          kind: "task.assigned",
          task: {
            id: `t-live-${count + 1}`,
            title: named,
            project: projectName,
            deliverable,
            assignedBy: from,
            assignedOn: TODAY,
            status: "planned",
            loggedHours: 0,
            person,
            projectId,
            kind: "work",
            dueAt: `${day}T${time}`,
          },
          by: from,
        });
        setTitle("");
      },
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate aria-label="Assign a task">
      <p className="text-17 leading-[2.6]">
        Ask{" "}
        <label htmlFor={`${ids}-who`} className="sr-only">
          Who
        </label>
        <select id={`${ids}-who`} className={blank} value={person} onChange={(e) => setPerson(e.target.value as PersonId)}>
          {juniors.map((id) => (
            <option key={id} value={id}>
              {firm.person(id)?.name ?? id}
            </option>
          ))}
        </select>{" "}
        to deliver{" "}
        <label htmlFor={`${ids}-what`} className="sr-only">
          What to deliver
        </label>
        <select id={`${ids}-what`} className={blank} value={deliverable} onChange={(e) => setDeliverable(e.target.value)}>
          {DELIVERABLES.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>{" "}
        for{" "}
        <label htmlFor={`${ids}-title`} className="sr-only">
          The task
        </label>
        <input
          id={`${ids}-title`}
          className={`${blank} w-64 font-normal`}
          placeholder="Window detail"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${ids}-error` : undefined}
        />{" "}
        on{" "}
        <label htmlFor={`${ids}-project`} className="sr-only">
          Project
        </label>
        <select id={`${ids}-project`} className={blank} value={projectId} onChange={(e) => setProjectId(e.target.value as ProjectId)}>
          {(projects.length > 0 ? projects : firm.projects).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>{" "}
        by{" "}
        <label htmlFor={`${ids}-day`} className="sr-only">
          Day
        </label>
        <select id={`${ids}-day`} className={blank} value={day} onChange={(e) => setDay(e.target.value)}>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {shortWeekdayDate(d)}
            </option>
          ))}
        </select>
        ,{" "}
        <label htmlFor={`${ids}-time`} className="sr-only">
          Time
        </label>
        <select id={`${ids}-time`} className={blank} value={time} onChange={(e) => setTime(e.target.value)}>
          {TIMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.words}
            </option>
          ))}
        </select>
        .
      </p>
      {error && (
        <p id={`${ids}-error`} className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="submit" className="btn btn-quiet" aria-disabled={pause.pending !== null}>
          Assign
        </button>
        <p className="text-15 text-ink-soft" aria-live="polite">
          {readBack}
        </p>
      </div>
    </form>
  );
}
