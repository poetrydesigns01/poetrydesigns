/*
 * Copyright 2026 AvlysAI Pvt. Ltd. All rights reserved.
 */
"use client";

import { useId, useState, type FormEvent } from "react";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm } from "@/lib/demo-store";
import type { PersonId, ProjectId } from "@/lib/firm-data";
import { addDays, shortWeekdayDate } from "@/lib/format";
import { IconPlus } from "./glass-ui";

// Giving a junior a task: who, what, on which project, the file to hand in and by when.
// It waits five seconds, then the task is in the junior's list.

const DELIVERABLES = ["PDF drawing", "PDF and source drawing", "PDF and images", "Specification sheet (PDF)"];

const TIMES = [
  { value: "12:00", words: "12 pm" },
  { value: "18:00", words: "6 pm" },
];

/** The next ten working days, Monday to Saturday, from tomorrow. */
const DAYS = (() => {
  const days: string[] = [];
  for (let d = 1; days.length < 10 && d < 20; d++) {
    const iso = addDays(TODAY, d);
    if (!shortWeekdayDate(iso).startsWith("Sun")) days.push(iso);
  }
  return days;
})();

export function AssignForm({ from, juniors, onDone }: { from: PersonId; juniors: PersonId[]; onDone: () => void }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();
  const projects = firm.projects.filter(
    (p) => p.phase !== "draft" && p.phase !== "handed-over" && (p.team.head === from || p.team.architects.includes(from)),
  );
  const [person, setPerson] = useState<PersonId>(juniors[0] ?? from);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<ProjectId>(projects[0]?.id ?? "iyer");
  const [deliverable, setDeliverable] = useState(DELIVERABLES[1]);
  const [dayIso, setDayIso] = useState(DAYS[2] ?? DAYS[0]);
  const [time, setTime] = useState(TIMES[1].value);
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pause.pending !== null) return;
    const named = title.trim();
    if (!named) return setError("Name the task");
    setError("");
    const projectName = firm.project(projectId)?.name ?? projectId;
    const { record } = demo;
    const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter : null;
    pause.start({
      what: `${named} for ${firm.person(person)?.first ?? person}`,
      origin: submitter instanceof HTMLElement ? submitter : null,
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
            dueAt: `${dayIso}T${time}`,
          },
          by: from,
        });
        setTitle("");
        onDone();
      },
    });
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Assign a task" className="grid gap-4">
      <ChipGroup label="Who">
        {juniors.map((id) => (
          <Chip key={id} pressed={person === id} onClick={() => setPerson(id)}>
            {firm.person(id)?.name ?? id}
          </Chip>
        ))}
      </ChipGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-1.5 sm:col-span-2">
          <label htmlFor={`${ids}-title`} className="text-15 font-semibold">
            Task
          </label>
          <input
            id={`${ids}-title`}
            className={field}
            value={title}
            placeholder="Window detail, first floor"
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError("");
            }}
            aria-invalid={error ? true : undefined}
          />
          {error && (
            <p className="text-15 font-semibold text-brick" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="grid content-start gap-1.5">
          <label htmlFor={`${ids}-project`} className="text-15 font-semibold">
            Project
          </label>
          <select id={`${ids}-project`} className={field} value={projectId} onChange={(e) => setProjectId(e.target.value as ProjectId)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid content-start gap-1.5">
          <label htmlFor={`${ids}-what`} className="text-15 font-semibold">
            Hand in
          </label>
          <select id={`${ids}-what`} className={field} value={deliverable} onChange={(e) => setDeliverable(e.target.value)}>
            {DELIVERABLES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="grid content-start gap-1.5">
          <label htmlFor={`${ids}-day`} className="text-15 font-semibold">
            Due
          </label>
          <select id={`${ids}-day`} className={field} value={dayIso} onChange={(e) => setDayIso(e.target.value)}>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {shortWeekdayDate(d)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid content-start gap-1.5">
          <label htmlFor={`${ids}-time`} className="text-15 font-semibold">
            By
          </label>
          <select id={`${ids}-time`} className={field} value={time} onChange={(e) => setTime(e.target.value)}>
            {TIMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.words}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <button type="submit" className="btn btn-primary min-h-11 gap-1.5 px-5 text-15" aria-disabled={pause.pending !== null}>
          <IconPlus /> Assign
        </button>
      </div>
    </form>
  );
}
