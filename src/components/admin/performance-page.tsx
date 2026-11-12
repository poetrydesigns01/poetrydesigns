"use client";

import { useState } from "react";
import { TaskCourse } from "@/components/instruments/task-course";
import { Chip, ChipGroup } from "@/components/register/chips";
import { StaffBoard } from "@/components/register/staff-board";
import { useFirm } from "@/lib/demo-store";
import {
  courses,
  performance,
  templateOf,
  type CategoryId,
  type CourseBlock,
  type PerformanceRow,
} from "@/lib/firm-data";
import { daysBetween, formatShortDate } from "@/lib/format";

// How the juniors are doing over the last 90 days: tasks, on time, late, revisions and days
// taken, overall and by category, in one table. Below it each junior's last 30 days are
// drawn as a course of task blocks per category, and open to list the tasks. Seniors see
// the same figures on their team pages.

type Key = "tasks" | "onTimePercent" | "late" | "avgRevisions" | "avgDays";

const COLUMNS: { key: Key; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "onTimePercent", label: "On time" },
  { key: "late", label: "Late" },
  { key: "avgRevisions", label: "Revisions, average" },
  { key: "avgDays", label: "Days, average" },
];

function cell(row: PerformanceRow, key: Key): string {
  if (key === "onTimePercent") return `${row.onTime}, ${row.onTimePercent}%`;
  if (key === "avgRevisions") return row.avgRevisions.toFixed(1);
  if (key === "avgDays") return row.avgDays.toFixed(1);
  return String(row[key]);
}

/** The 90 days by category, as one sentence: "City villa 9 tasks, 2.6 days, 89% on time. Farmhouse ..." */
function categoryWords(row: PerformanceRow): string {
  return row.byCategory.map((c) => `${templateOf(c.category).name} ${c.words}.`).join(" ");
}

export function PerformancePage() {
  const firm = useFirm();
  const [sort, setSort] = useState<{ key: Key; down: boolean } | null>(null);
  const rows = sort
    ? [...performance].sort((a, b) => (sort.down ? b[sort.key] - a[sort.key] : a[sort.key] - b[sort.key]))
    : performance;

  const choose = (key: Key) =>
    setSort((s) => (s?.key === key ? (s.down ? { key, down: false } : null) : { key, down: true }));

  const categoryOf = (block: CourseBlock): CategoryId => firm.project(block.projectId)?.category ?? "city-villa";

  return (
    <>
      <StaffBoard place="Performance" headline="How the juniors are doing, last 90 days." chip={false} />
      <div className="mt-8 grid gap-10">
        <section aria-label="By junior" className="grid gap-4">
          <h2 className="register-title">By junior</h2>

          <div className="lg:hidden">
            <ChipGroup label="Sort, highest first">
              {COLUMNS.map((c) => (
                <Chip
                  key={c.key}
                  pressed={sort?.key === c.key}
                  onClick={() => setSort(sort?.key === c.key ? null : { key: c.key, down: true })}
                >
                  {c.label}
                </Chip>
              ))}
            </ChipGroup>
          </div>

          <table className="hidden w-full border-collapse lg:table">
            <thead>
              <tr className="border-b border-sand">
                <th scope="col" className="py-2 pr-3 text-left text-15 font-semibold">
                  Junior
                </th>
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className="py-1 text-right text-15 font-semibold"
                    aria-sort={sort?.key === c.key ? (sort.down ? "descending" : "ascending") : "none"}
                  >
                    <button
                      type="button"
                      className="inline-flex min-h-11 cursor-pointer items-center px-2 underline decoration-1 underline-offset-4"
                      onClick={() => choose(c.key)}
                    >
                      {c.label}
                      {sort?.key === c.key && (
                        <span className="sr-only">, sorted {sort.down ? "highest" : "lowest"} first</span>
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.person} className="border-b border-sand">
                  <th scope="row" className="py-3 pr-3 text-left align-top font-normal">
                    <span className="block text-17 font-semibold">{firm.person(row.person)?.name}</span>
                    <span className="block text-15 text-ink-soft">{categoryWords(row)}</span>
                  </th>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="figure px-2 py-3 text-right align-top text-17">
                      {cell(row, c.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="grid lg:hidden">
            {rows.map((row) => (
              <li key={row.person} className="border-b border-sand py-3">
                <p className="text-17 font-semibold">{firm.person(row.person)?.name}</p>
                <p className="text-15 text-ink-soft">
                  {row.tasks} tasks, {row.onTime} on time ({row.onTimePercent}%), {row.late} late.{" "}
                  {row.avgRevisions.toFixed(1)} revisions and {row.avgDays.toFixed(1)} days on average.
                </p>
                <p className="text-15 text-ink-soft">{categoryWords(row)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Last 30 days, by category" className="grid gap-4">
          <h2 className="register-title">Last 30 days, by category</h2>
          <ul className="grid gap-8">
            {rows.map((row) => {
              const person = firm.person(row.person);
              const blocks = courses[row.person] ?? [];
              const categories = row.byCategory.map((c) => c.category);
              return (
                <li key={row.person} className="grid gap-3">
                  <h3 className="text-17 font-semibold">{person?.name}</h3>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {categories.map((category) => {
                      const mine = blocks.filter((b) => categoryOf(b) === category);
                      const tasks = mine.map((b) => ({ title: b.title, late: b.lateDays, revisions: b.revisions }));
                      return (
                        <div key={category} className="grid content-start gap-2">
                          {tasks.length > 0 ? (
                            <TaskCourse
                              tasks={tasks}
                              label={templateOf(category).name}
                              width={240}
                            />
                          ) : (
                            <p className="text-15 font-semibold">
                              {templateOf(category).name}
                              <span className="lettering block font-normal text-ink-soft">
                                No tasks in this period.
                              </span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {blocks.length > 0 && (
                    <details>
                      <summary className="lettering inline-flex min-h-11 cursor-pointer items-center underline decoration-1 underline-offset-4">
                        {person?.first}&rsquo;s tasks ({blocks.length})
                      </summary>
                      <ul className="sheet-rows ruled">
                        {blocks.map((b) => (
                          <li key={b.title} className="grid gap-0.5">
                            <p className="text-17">
                              {b.title}, {firm.project(b.projectId)?.name}
                            </p>
                            <p className="text-15 text-ink-soft">
                              Assigned {formatShortDate(b.assigned)}, accepted {formatShortDate(b.accepted)},{" "}
                              {daysBetween(b.assigned, b.accepted)} days.{" "}
                              {b.revisions === 1 ? "1 revision" : `${b.revisions} revisions`}.{" "}
                              <span className={b.lateDays > 0 ? "font-bold text-ink" : "font-semibold text-kota"}>
                                {b.lateDays > 0
                                  ? `Late by ${b.lateDays === 1 ? "1 day" : `${b.lateDays} days`}`
                                  : "On time"}
                              </span>
                              .
                            </p>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
