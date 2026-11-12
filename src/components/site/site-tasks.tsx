"use client";

import { useRef, useState } from "react";
import { Register, RegisterRow } from "@/components/register/register";
import { StaffBoard } from "@/components/register/staff-board";
import { AssignLine } from "@/components/tasks/assign-line";
import { TaskSheet } from "@/components/tasks/task-sheet";
import { WeekGrid } from "@/components/tasks/week-grid";
import { TODAY } from "@/lib/demo-data";
import { useFirm, useViewer } from "@/lib/demo-store";
import { ageWords, daysSince, type TaskView } from "@/lib/firm";
import type { PersonId } from "@/lib/firm-data";
import { countWord, datePart, hours, listWords } from "@/lib/format";
import { ReviewPanel, focusFirstIn, useClose, useRefocus } from "./rows";
import "./site.css";

// The site engineer's tasks and hours. A senior also sees what his junior has handed in,
// to accept or send back, and gives him the next task in one sentence. Time is logged
// against a task; a site walk with the client is logged as a consultation and uses the
// client's hours. Logging is never blocked.

function HandedInRow({ task, reviewer, onGone }: { task: TaskView; reviewer: PersonId; onGone: () => void }) {
  const firm = useFirm();
  const [open, setOpen] = useState(false);
  const rowId = `task:${task.id}`;
  const close = useClose(rowId, () => setOpen(false));
  const { toggleRef, panelRef, markFocus } = useRefocus(open, onGone);
  return (
    <RegisterRow
      id={rowId}
      margin="With you"
      marginSub={ageWords(daysSince(task.submittedAt ?? TODAY))}
      title={task.title}
      sentence={`${task.projectName}. ${task.deliverable}.`}
      figure={hours(task.hoursLogged)}
      action={
        <button ref={toggleRef} type="button" className="btn btn-quiet" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
          {open ? "Close" : "Accept or send back"}
        </button>
      }
      stamps={firm.stampsFor(rowId)}
    >
      {open && (
        <div ref={panelRef}>
          <ReviewPanel
            task={task}
            reviewer={reviewer}
            onDone={() => {
              markFocus();
              setOpen(false);
            }}
          />
        </div>
      )}
    </RegisterRow>
  );
}

export function SiteTasks() {
  const firm = useFirm();
  const me = useViewer("site");
  const juniors = firm.people.filter((p) => p.lead === me.id && p.role === "site");
  // Waiting for him, and those he decided today, so his stamp stays in view once he has.
  const decidedToday = (t: TaskView) => {
    const newest = firm.stampsFor(`task:${t.id}`)[0];
    return Boolean(newest && newest.by === me.id && datePart(newest.at) === TODAY && newest.words !== "Assigned");
  };
  const juniorTasks = firm.tasks.filter((t) => juniors.some((j) => j.id === t.person));
  const handedIn = juniorTasks.filter((t) => t.status === "submitted");
  const reviewed = juniorTasks.filter((t) => t.status !== "submitted" && decidedToday(t));
  const dueToday = firm.tasks.filter(
    (t) =>
      t.person === me.id &&
      t.kind === "work" &&
      (t.status === "planned" || t.status === "in-progress" || t.status === "revision") &&
      t.dueAt &&
      datePart(t.dueAt) <= TODAY,
  ).length;
  const lead = me.lead ? firm.person(me.lead) : undefined;
  const juniorNames = listWords(juniors.map((j) => j.first));
  // A hand-in that is decided moves to its own row; focus follows to this register.
  const handedInRef = useRef<HTMLDivElement>(null);

  const headline =
    dueToday === 0
      ? "No task of yours is due today."
      : `${countWord(dueToday, true)} ${dueToday === 1 ? "task is" : "tasks are"} due today.`;
  const state =
    juniors.length === 0
      ? `${lead?.name ?? "Your lead"} sets your tasks and looks at what you hand in.`
      : handedIn.length === 0
        ? `Nothing from ${juniorNames} is waiting for you.`
        : `${juniorNames} handed in ${countWord(handedIn.length)} for you to look at.`;

  return (
    <div className="site-screen">
      <StaffBoard place="Tasks" headline={headline} state={state} chip={false} />

      <div className="staff-columns">
        <div className="grid content-start gap-10">
          {handedIn.length + reviewed.length > 0 && (
            <div ref={handedInRef} tabIndex={-1} className="outline-none">
              <Register title={`Handed in by ${juniorNames}`}>
                {handedIn.map((t) => (
                  <HandedInRow key={t.id} task={t} reviewer={me.id} onGone={() => focusFirstIn(handedInRef.current)} />
                ))}
                {reviewed.map((t) => (
                  <RegisterRow
                    key={t.id}
                    id={`task:${t.id}`}
                    margin="Today"
                    title={t.title}
                    sentence={`${t.projectName}. ${t.deliverable}.`}
                    figure={hours(t.hoursLogged)}
                    stamps={firm.stampsFor(`task:${t.id}`)}
                  />
                ))}
              </Register>
            </div>
          )}
          <TaskSheet person={me.id} projectScope="all" />
        </div>

        <div className="grid content-start gap-10">
          {juniors.length > 0 && (
            <section aria-labelledby="assign-title" className="register">
              <h2 id="assign-title" className="register-title">
                Give {juniorNames} a task
              </h2>
              <div className="max-w-[48rem] pt-4">
                <AssignLine from={me.id} juniors={juniors.map((j) => j.id)} />
              </div>
            </section>
          )}
          <section aria-labelledby="week-title" className="register">
            <h2 id="week-title" className="register-title">
              Your hours this week
            </h2>
            <div className="pt-4">
              <WeekGrid person={me.id} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
