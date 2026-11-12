"use client";

import { useId, useState, type FormEvent } from "react";
import { TeakCut, teakWords } from "@/components/instruments/teak-cut";
import { Chip, ChipGroup, field } from "@/components/register/chips";
import { usePause } from "@/components/register/recording-pause";
import { TODAY } from "@/lib/demo-data";
import { getDemoSnapshot, useDemo, useFirm } from "@/lib/demo-store";
import type { PersonId } from "@/lib/firm-data";
import { addDays, formatShortDate, hours as hoursWords } from "@/lib/format";

// Logging time, inline. Pick the task, the day and the hours; time spent with the client is
// marked as a consultation, and then the teak shows the cut it makes in the client's
// advisory hours. Logging is never blocked, even past the end of the hours. It is recorded
// after the five-second pause.

const HOUR_CHIPS = [0.5, 1, 1.5, 2, 3, 4];
const EARLIEST = addDays(TODAY, -14);

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function LogTime({ person, taskId, onDone }: { person: PersonId; taskId?: string; onDone?: () => void }) {
  const firm = useFirm();
  const demo = useDemo();
  const pause = usePause();
  const ids = useId();

  // Their own open tasks, and the consultation task of every project they work on.
  const tasks = firm.tasks.filter((t) => {
    if (t.kind === "consultation") {
      const team = firm.project(t.projectId)?.team;
      return Boolean(team && [team.head, ...team.architects, ...team.engineers].includes(person));
    }
    return t.person === person && t.status !== "accepted";
  });

  const [chosenTask, setChosenTask] = useState(taskId ?? tasks[0]?.id ?? "");
  const [day, setDay] = useState<"today" | "yesterday" | "pick">("today");
  const [picked, setPicked] = useState(addDays(TODAY, -2));
  const [amount, setAmount] = useState(1);
  const task = tasks.find((t) => t.id === chosenTask) ?? tasks[0];
  const [consultChoice, setConsultChoice] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  if (!task) return <p className="text-17 text-ink-soft">There is no task to log time against.</p>;

  const project = firm.project(task.projectId);
  const hasClient = Boolean(project && project.clients.length > 0 && project.phase !== "draft");
  const consultation = hasClient && (consultChoice ?? task.kind === "consultation");
  const date = day === "today" ? TODAY : day === "yesterday" ? addDays(TODAY, -1) : picked;

  const credits = firm.credits.find((c) => c.projectId === task.projectId);
  const pool = credits ? credits[credits.current] : null;
  const added = credits ? credits.added.filter((a) => a.pool === credits.current).reduce((s, a) => s + a.hours, 0) : 0;
  const clientFirst = project?.clients[0]?.split(" ")[0] ?? "the client";
  const name = project?.clients.length === 1 || task.projectId === "iyer" || task.projectId === "iyer-cottage" ? `${clientFirst}'s` : `the ${project?.name ?? "client"} clients'`;
  const pronoun = task.projectId === "iyer" || task.projectId === "iyer-cottage" ? "her" : "their";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Set aside, not disabled, while a pause runs, so the button keeps focus for Cancel.
    if (pause.pending !== null) return;
    if (!(amount > 0) || amount > 16) {
      setError("Enter the hours, between a quarter of an hour and 16.");
      return;
    }
    if (date < EARLIEST || date > TODAY) {
      setError(`Pick a day from ${formatShortDate(EARLIEST)} to today.`);
      return;
    }
    setError("");
    const entry = {
      person,
      taskId: task.id,
      projectId: task.projectId,
      date,
      hours: amount,
      consultation,
      with: consultation ? project?.clients.join(" and ") : undefined,
    };
    const { record } = demo;
    pause.start({
      what: `${hoursWords(amount)} on ${task.title}`,
      origin: event.nativeEvent instanceof SubmitEvent && event.nativeEvent.submitter instanceof HTMLElement ? event.nativeEvent.submitter : null,
      commit: () => {
        const count = getDemoSnapshot().events.filter((e) => e.kind === "time.logged").length;
        record({ kind: "time.logged", entry: { id: `te-live-${count + 1}`, ...entry }, by: person });
        onDone?.();
      },
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-5 pt-2" noValidate aria-label="Log time">
      {!taskId && (
        <div>
          <label htmlFor={`${ids}-task`} className="block text-15 font-semibold">
            Task
          </label>
          <select
            id={`${ids}-task`}
            className={`${field} mt-1.5`}
            value={task.id}
            onChange={(event) => {
              setChosenTask(event.target.value);
              setConsultChoice(null);
            }}
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.kind === "consultation" ? t.title : `${t.title}, ${t.projectName}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <ChipGroup label="Day">
        <Chip pressed={day === "today"} onClick={() => setDay("today")}>
          Today
        </Chip>
        <Chip pressed={day === "yesterday"} onClick={() => setDay("yesterday")}>
          Yesterday
        </Chip>
        <Chip pressed={day === "pick"} onClick={() => setDay("pick")}>
          Pick a date
        </Chip>
      </ChipGroup>
      {day === "pick" && (
        <div>
          <label htmlFor={`${ids}-date`} className="block text-15 font-semibold">
            Date, up to 14 days back
          </label>
          <input
            id={`${ids}-date`}
            type="date"
            className={`${field} mt-1.5 max-w-60`}
            min={EARLIEST}
            max={TODAY}
            value={picked}
            onChange={(event) => setPicked(event.target.value)}
          />
        </div>
      )}

      <div>
        <ChipGroup label="Hours">
          {HOUR_CHIPS.map((h) => (
            <Chip key={h} pressed={amount === h} onClick={() => setAmount(h)}>
              {trim(h)}
            </Chip>
          ))}
        </ChipGroup>
        <label htmlFor={`${ids}-hours`} className="mt-3 block text-15 text-ink-soft">
          Or type the hours, in quarters
        </label>
        <input
          id={`${ids}-hours`}
          type="number"
          inputMode="decimal"
          min={0.25}
          max={16}
          step={0.25}
          className={`${field} mt-1 max-w-32`}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
        />
      </div>

      {hasClient && (
        <div className="grid gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={consultation}
            className="chip w-full justify-between gap-6 sm:w-auto sm:justify-self-start"
            onClick={() => setConsultChoice(!consultation)}
          >
            <span>Client consultation</span>
            <span className="lettering">{consultation ? "On" : "Off"}</span>
          </button>
          {consultation && pool && (
            <TeakCut
              granted={pool.granted}
              used={pool.used}
              added={added}
              adding={amount > 0 ? amount : 0}
              label={teakWords({ left: pool.granted - pool.used, adding: amount > 0 ? amount : 0, name, pronoun })}
            />
          )}
        </div>
      )}

      {error && (
        <p className="text-15 font-semibold text-brick" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" aria-disabled={pause.pending !== null}>
          Log {hoursWords(amount > 0 ? amount : 0)}
        </button>
        <p className="text-15 text-ink-soft">
          {date === TODAY ? "Today" : formatShortDate(date)}, {task.projectName}.
        </p>
      </div>
    </form>
  );
}
