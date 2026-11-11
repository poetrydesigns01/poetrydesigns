"use client";

import { useState } from "react";
import { Status } from "@/components/page-band";
import { tasks as seedTasks, type Task, type TaskStatus } from "@/lib/demo-data";
import { formatDate, hours } from "@/lib/format";

const groups: { status: TaskStatus; title: string; empty: string }[] = [
  { status: "in-progress", title: "Due today", empty: "Nothing is due today." },
  { status: "revision", title: "Sent back for changes", empty: "Nothing has been sent back." },
  { status: "planned", title: "Coming up", empty: "Nothing else is assigned yet." },
  { status: "submitted", title: "Waiting for review", empty: "Nothing is waiting for review." },
  { status: "accepted", title: "Accepted this week", empty: "Nothing accepted yet this week." },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const needsYou = tasks.filter((t) => t.status === "in-progress" || t.status === "revision").length;
  const logged = tasks.reduce((sum, t) => sum + t.loggedHours, 0);

  const update = (id: string, change: Partial<Task>) =>
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...change } : task)));

  return (
    <>
      <p className="text-ink-soft">Ananya Rao, architect</p>
      <h1 className="display display-md mt-1">Your work for Wednesday 11 November</h1>
      <p className="mt-2">
        {needsYou === 0 ? "Nothing needs you right now" : `${needsYou} ${needsYou === 1 ? "task needs" : "tasks need"} you`}, and you have
        logged {hours(logged)} this week.
      </p>

      {groups.map((group) => {
        const items = tasks.filter((t) => t.status === group.status);
        return (
          <section key={group.status} className="mt-8">
            <h2 className="text-[1.125rem] font-semibold">{group.title}</h2>
            {items.length === 0 ? (
              <p className="mt-1 text-ink-soft">{group.empty}</p>
            ) : (
              <ul className="mt-2 border-t border-ink">
                {items.map((task) => (
                  <TaskRow key={task.id} task={task} update={update} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}

function TaskRow({ task, update }: { task: Task; update: (id: string, change: Partial<Task>) => void }) {
  const open = task.status === "in-progress" || task.status === "revision";
  const canWork = task.status === "in-progress" || task.status === "revision" || task.status === "planned";

  return (
    <li className="border-b border-sand">
      <details open={open} className="group">
        <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-3 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-semibold">{task.title}</span>
            <span className="block text-ink-soft">{task.project}</span>
          </span>
          <span className="text-right">
            <span className="block">
              {task.status === "revision" ? <Status tone="alert">Changes asked</Status> : null}
              {task.status === "in-progress" ? <Status tone="due">{task.dueLabel}</Status> : null}
              {task.status === "planned" ? task.dueLabel : null}
              {task.status === "submitted" ? <Status tone="quiet">With {task.assignedBy.split(" ")[0]}</Status> : null}
              {task.status === "accepted" ? <Status tone="done">Accepted</Status> : null}
            </span>
            <span className="block text-ink-soft">{hours(task.loggedHours)} logged</span>
          </span>
        </summary>

        <div className="pb-4">
          {task.note && (
            <p className="mb-3 bg-sand-2 p-3">
              {task.assignedBy.split(" ")[0]} wrote: {task.note}
            </p>
          )}
          <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
            <div>
              <dt className="inline text-ink-soft">Deliver: </dt>
              <dd className="inline">{task.deliverable}</dd>
            </div>
            <div>
              <dt className="inline text-ink-soft">Assigned by: </dt>
              <dd className="inline">
                {task.assignedBy} on {formatDate(task.assignedOn)}
              </dd>
            </div>
            <div>
              <dt className="inline text-ink-soft">Due: </dt>
              <dd className="inline">{task.dueLabel}</dd>
            </div>
          </dl>

          {canWork && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="btn btn-quiet" onClick={() => update(task.id, { loggedHours: task.loggedHours + 0.5 })}>
                Log 30 minutes
              </button>
              {task.status === "planned" ? (
                <button type="button" className="btn btn-primary" onClick={() => update(task.id, { status: "in-progress", dueLabel: task.dueLabel })}>
                  Start work
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => update(task.id, { status: "submitted", note: undefined })}>
                  Submit for review
                </button>
              )}
            </div>
          )}
        </div>
      </details>
    </li>
  );
}
